import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stockFromPaymentLink, createInventory } from '../scripts/sync-inventory.mjs';
import { inventoryState, stockMessage, purchaseState, inventoryProducts } from '../shop.mjs';

const { products } = JSON.parse(readFileSync(new URL('../assets/products.json', import.meta.url)));
// Keep the original-run scenarios independent of later catalog restocks.
const kit = { ...products[0], runLimit: 20 };
const now = Date.parse('2026-10-18T20:00:00Z');
const source = () => ({
  id: kit.stripePaymentLinkId, livemode: true, active: true,
  restrictions: { completed_sessions: { limit: 20, count: 0 } },
  line_items: { has_more: false, data: [{
    quantity: 1, adjustable_quantity: { enabled: false },
    price: { id: kit.stripePriceId, product: kit.stripeProductId, currency: 'usd', unit_amount: 3000 }
  }] }
});
const snapshot = (remaining = 20, options = {}) => ({
  schemaVersion: 1, checkedAt: new Date(now).toISOString(),
  products: { [kit.id]: { remaining, runLimit: 20, available: remaining > 0, ...options } }
});

test('stock comes from the native limit minus completed sessions, bounded at zero', () => {
  const link = source();
  assert.deepEqual(stockFromPaymentLink(kit, link), { remaining: 20, runLimit: 20, available: true });
  link.restrictions.completed_sessions.count = 19;
  assert.equal(stockFromPaymentLink(kit, link).remaining, 1);
  link.restrictions.completed_sessions.count = 20;
  assert.deepEqual(stockFromPaymentLink(kit, link), { remaining: 0, runLimit: 20, available: false });
  link.restrictions.completed_sessions.count = 21;
  assert.equal(stockFromPaymentLink(kit, link).remaining, 0);
});

test('manual closure and a reduced cap for offline sales are respected', () => {
  const link = source();
  link.active = false;
  assert.deepEqual(stockFromPaymentLink(kit, link), { remaining: 20, runLimit: 20, available: false });
  link.active = true;
  link.restrictions.completed_sessions = { limit: 17, count: 4 };
  assert.equal(stockFromPaymentLink(kit, link).remaining, 13);
});

test('the restocked catalog allows 20 more purchases after the six completed sales', () => {
  const restockedKit = products[0];
  const link = source();
  link.restrictions.completed_sessions = { limit: 26, count: 6 };
  const stock = stockFromPaymentLink(restockedKit, link);
  assert.deepEqual(stock, { remaining: 20, runLimit: 26, available: true });
  const result = {
    schemaVersion: 1, checkedAt: new Date(now).toISOString(),
    products: { [restockedKit.id]: stock }
  };
  assert.equal(stockMessage(restockedKit, inventoryState(restockedKit, result, now)), '20 kits left');
});

test('unbounded, invalid and mismatched links cannot publish misleading stock', () => {
  const mutations = [
    link => { link.restrictions = null; },
    link => { link.restrictions.completed_sessions.limit = 21; },
    link => { link.restrictions.completed_sessions.count = -1; },
    link => { link.restrictions.completed_sessions.count = '2'; },
    link => { link.livemode = false; },
    link => { link.id = 'plink_other'; },
    link => { link.line_items.data[0].quantity = 2; },
    link => { link.line_items.data[0].adjustable_quantity.enabled = true; },
    link => { link.line_items.has_more = true; },
    link => { link.line_items.data.push(link.line_items.data[0]); },
    link => { link.line_items.data[0].price.id = 'price_other'; },
    link => { link.line_items.data[0].price.product = 'prod_other'; },
    link => { link.line_items.data[0].price.unit_amount = 3500; }
  ];
  for (const mutate of mutations) {
    const link = source();
    mutate(link);
    assert.throws(() => stockFromPaymentLink(kit, link));
  }
});

test('sync makes only the configured read and publishes only public stock fields', async () => {
  const link = source();
  link.metadata = { private_note: 'must not be published' };
  link.customer = { email: 'must-not-leak@example.com' };
  let calls = 0;
  const client = { paymentLinks: { retrieve: async (id, parameters) => {
    calls++;
    assert.equal(id, kit.stripePaymentLinkId);
    assert.deepEqual(parameters, { expand: ['line_items'] });
    return link;
  } } };
  const result = await createInventory({ products: [kit] }, client, new Date(now));
  assert.equal(calls, 1);
  assert.deepEqual(result, snapshot());
  assert.doesNotMatch(JSON.stringify(result), /private_note|email|price_|plink_|rk_/);
});

test('a failed Stripe read fails the build instead of fabricating stock', async () => {
  const client = { paymentLinks: { retrieve: async () => { throw new Error('network unavailable'); } } };
  await assert.rejects(createInventory({ products: [kit] }, client), /network unavailable/);
});

test('the buyer sees remaining quantities and the buy action switches at zero', () => {
  for (const remaining of [20, 8, 1]) {
    const stock = inventoryState(kit, snapshot(remaining), now);
    assert.equal(stockMessage(kit, stock), `${remaining} ${remaining === 1 ? 'kit' : 'kits'} left`);
    assert.ok(purchaseState(kit, stock).url);
  }
  const stock = inventoryState(kit, snapshot(0), now);
  assert.match(stockMessage(kit, stock), /Sold out/);
  assert.equal(purchaseState(kit, stock).url, null);
  assert.equal(kit.requestPath, '/shop/request/');
});

test('invalid snapshots do not invent a quantity or mark a product sold out', () => {
  const invalid = [null, {}, { schemaVersion: 1, checkedAt: new Date(now).toISOString() },
    { ...snapshot(), schemaVersion: 2 }, { ...snapshot(), checkedAt: 'invalid' },
    { ...snapshot(), checkedAt: new Date(now + 600_000).toISOString() },
    snapshot(-1), snapshot(21), snapshot('20'), snapshot(0, { available: true }),
    snapshot(5, { runLimit: 21 }), snapshot(5, { available: 'true' })];
  for (const input of invalid) assert.equal(inventoryState(kit, input, now), null);
  assert.match(stockMessage(kit, null), /Availability is confirmed at checkout/);
  assert.ok(purchaseState(kit, null).url);
});

test('stale counts are labeled as last confirmed and a known sellout stays closed', () => {
  const older = now + 31 * 60_000;
  assert.equal(stockMessage(kit, inventoryState(kit, snapshot(8), older)), 'Last confirmed: 8 kits left');
  assert.equal(purchaseState(kit, inventoryState(kit, snapshot(0), older)).url, null);
});

test('a deliberately closed link does not offer checkout despite positive stock', () => {
  const stock = inventoryState(kit, snapshot(10, { available: false }), now);
  assert.equal(purchaseState(kit, stock).url, null);
  assert.equal(stockMessage(kit, stock), 'Orders are currently closed.');
});

test('interest listings never block paid-product snapshots or request Stripe reads', async () => {
  const interest = { id: 'healthcare-interest', status: 'interest-list', stripePaymentLinkId: 'must-not-be-read' };
  assert.deepEqual(inventoryProducts([kit, interest]), [kit]);
  let calls = 0;
  const client = { paymentLinks: { retrieve: async id => {
    calls++;
    assert.equal(id, kit.stripePaymentLinkId);
    return source();
  } } };
  const result = await createInventory({ products: [kit, interest] }, client, new Date(now));
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(result.products), [kit.id]);
  assert.ok(inventoryState(kit, result, now));
});
