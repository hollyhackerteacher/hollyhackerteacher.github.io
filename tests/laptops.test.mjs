import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { saleState } from '../shop/laptops/laptops.mjs';

test('all sixteen one-off laptops have unique live checkout links and their own condition', async () => {
  const { products } = JSON.parse(await readFile(new URL('../assets/laptops.json', import.meta.url)));
  assert.equal(products.length, 16);
  assert.equal(new Set(products.map(p => p.stockNumber)).size, 16);
  assert.equal(new Set(products.map(p => p.serial)).size, 16);
  assert.equal(new Set(products.map(p => p.stripePaymentLinkId)).size, 16);
  assert.equal(new Set(products.map(p => p.stripeProductId)).size, 16);
  assert.equal(new Set(products.map(p => p.stripePriceId)).size, 16);
  for (const product of products) {
    assert.equal(product.runLimit, 1);
    assert.ok(product.condition);
    assert.ok(product.priceInCents > 0);
    assert.match(product.paymentLink, /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/);
    assert.equal(saleState(product, null).available, true);
  }
});

test('sold-out stock disables checkout even if a direct link remains configured', () => {
  const product = {
    id: 'laptop-21', paymentLink: 'https://buy.stripe.com/example',
    stripePaymentLinkId: 'plink_example', stripePriceId: 'price_example', stripeProductId: 'prod_example'
  };
  const snapshot = { schemaVersion: 1, products: { 'laptop-21': { remaining: 0, available: false } } };
  assert.deepEqual(saleState(product, snapshot), { label: 'Sold out', available: false });
});
