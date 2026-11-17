import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { saleState } from '../shop/laptops/laptops.mjs';
import { upcomingPickupSlots, pickupCheckoutUrl } from '../shop/laptops/pickup.mjs';

test('only stock 33–36 has public prices and checkout links', async () => {
  const { products } = JSON.parse(await readFile(new URL('../assets/laptops.json', import.meta.url)));
  assert.equal(products.length, 16);
  assert.equal(new Set(products.map(p => p.stockNumber)).size, 16);
  assert.equal(new Set(products.map(p => p.serial)).size, 16);
  const forSale = products.filter(p => p.saleStatus === 'available');
  assert.deepEqual(forSale.map(p => p.stockNumber), [33, 34, 35, 36]);
  assert.deepEqual(forSale.map(p => p.priceInCents), [110000, 90000, 110000, 110000]);
  assert.equal(new Set(forSale.map(p => p.stripePaymentLinkId)).size, 4);
  for (const product of forSale) {
    assert.equal(product.runLimit, 1);
    assert.ok(product.condition);
    assert.match(product.paymentLink, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/);
    assert.equal(saleState(product, null).available, true);
  }
  for (const product of products.filter(p => p.saleStatus !== 'available')) {
    assert.equal(product.priceInCents, null);
    assert.equal(product.paymentLink, undefined);
    assert.deepEqual(saleState(product, null), { label: 'Not yet for sale', available: false });
  }
});

test('new sheet condition and battery reports are shown for the four offered units', async () => {
  const { products } = JSON.parse(await readFile(new URL('../assets/laptops.json', import.meta.url)));
  const forSale = products.filter(p => p.saleStatus === 'available');
  assert.deepEqual(forSale.map(p => p.batteryDetails.match(/Battery health: (\d+)%/)?.[1]), ['81', '92', '99', '87']);
  assert.ok(forSale.every(p => p.batteryDetails.includes('Estimated')));
  assert.ok(products.every(p => !('batteryCapacityWh' in p) && !('batteryHealthPercent' in p)));
  const cracked = forSale.find(p => p.stockNumber === 34);
  assert.equal(cracked.grade, 'C');
  assert.match(cracked.condition, /crack.*left.*touchpad click sometimes sticks/i);
});

test('sold-out stock disables active checkout', () => {
  const product = {
    id: 'laptop-33', saleStatus: 'available', priceInCents: 110000, paymentLink: 'https://buy.stripe.com/example',
    stripePaymentLinkId: 'plink_example', stripePriceId: 'price_example', stripeProductId: 'prod_example'
  };
  const snapshot = { schemaVersion: 1, products: { 'laptop-33': { remaining: 0, available: false } } };
  assert.deepEqual(saleState(product, snapshot), { label: 'Sold out', available: false });
});

test('pickup slots begin November 19 and require 24 hours of lead time', () => {
  assert.equal(upcomingPickupSlots(new Date('2026-11-16T18:00:00Z'))[0].value, '20261119');
  assert.equal(upcomingPickupSlots(new Date('2026-11-24T02:00:00Z'))[0].value, '20261124');
  assert.equal(upcomingPickupSlots(new Date('2026-11-24T02:01:00Z'))[0].value, '20261201');
  assert.ok(upcomingPickupSlots(new Date('2026-11-16T18:00:00Z')).every(slot => slot.value !== '20261126'));
});

test('selected pickup date is carried into the Stripe checkout reference', () => {
  const now = new Date('2026-11-16T18:00:00Z');
  const url = pickupCheckoutUrl('https://buy.stripe.com/example', 33, '20261119', now);
  assert.equal(new URL(url).searchParams.get('client_reference_id'), 'laptop-33-pickup-20261119');
  assert.equal(pickupCheckoutUrl('https://buy.stripe.com/example', 33, '20261117', now), null);
  assert.equal(pickupCheckoutUrl('https://buy.stripe.com/example', 33, '20261126', now), null);
});
