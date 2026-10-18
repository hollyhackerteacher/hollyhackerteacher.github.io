import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { checkoutUrl, purchaseState, formatPrice, requestUrl } from '../shop.mjs';
import { REQUEST_FORM_URL, REQUEST_REFERRER } from '../shop/request/request.mjs';

const { products } = JSON.parse(readFileSync(new URL('../assets/products.json', import.meta.url)));
const kit = products[0];

test('published catalog has the real kit, $30 total, delivery terms, and all three photos', () => {
  assert.equal(kit.priceInCents, 3000);
  assert.equal(kit.currency, 'USD');
  assert.equal(kit.runLimit, 20);
  assert.equal(kit.requestPath, '/shop/request/');
  assert.match(kit.priceNote, /Sales tax included/);
  assert.match(kit.priceNote, /No added card fee/);
  assert.match(kit.pickup, /Free pickup at SAINTCON/);
  assert.match(kit.shipping, /after the conference/);
  assert.match(kit.shipping, /Buyer pays shipping/);
  assert.equal(kit.images.length, 3);
  kit.images.forEach(image => assert.ok(existsSync(new URL(`../${image.src}`, import.meta.url))));
});

test('no checkout is offered until an available product has a valid Stripe link', () => {
  assert.equal(purchaseState({ ...kit, status: 'coming-soon' }).url, null);
  assert.equal(purchaseState({ ...kit, status: 'available', paymentLink: '' }).url, null);
  assert.equal(purchaseState({ ...kit, status: 'coming-soon', paymentLink: 'https://buy.stripe.com/Example' }).url, null);
});

test('available products lead directly to Stripe without client-controlled prices', () => {
  const state = purchaseState({ ...kit, status: 'available', paymentLink: 'https://buy.stripe.com/Example' });
  assert.equal(state.url, 'https://buy.stripe.com/Example');
  assert.equal(state.label, 'Buy for SAINTCON pickup');
});

test('sold out, missing prices, and invalid prices cannot open checkout', () => {
  const available = { ...kit, status: 'available', paymentLink: 'https://buy.stripe.com/Example' };
  assert.deepEqual(purchaseState({ ...available, status: 'sold-out' }), { label: 'Sold out', url: null });
  for (const priceInCents of [null, -1, 0, 30.5, '3000', Infinity]) {
    assert.equal(purchaseState({ ...available, priceInCents }).url, null);
  }
});

test('checkout rejects non-Stripe URLs, spoofed domains, credentials, and unsafe protocols', () => {
  for (const url of [
    '', null, 'not a url', 'javascript:alert(1)', 'http://buy.stripe.com/Example',
    'https://buy.stripe.com.evil.example/Example', 'https://evil.example/buy.stripe.com',
    'https://buy.stripe.com@evil.example/Example', 'https://user:pass@buy.stripe.com/Example',
    'https://buy.stripe.com:444/Example', 'https://buy.stripe.com/'
  ]) assert.equal(checkoutUrl(url), null, String(url));
});

test('sandbox links are explicitly labeled as test checkout', () => {
  const state = purchaseState({ ...kit, status: 'available', paymentLink: 'https://buy.stripe.com/test_Example' });
  assert.equal(state.test, true);
  assert.match(state.label, /no real payment/);
});

test('special-run requests stay on the dedicated local request page', () => {
  assert.equal(requestUrl(kit.requestPath), '/shop/request/');
  assert.ok(existsSync(new URL('../shop/request/index.html', import.meta.url)));
  for (const path of [null, '', '//evil.example', 'javascript:alert(1)', 'https://evil.example/shop/request/']) {
    assert.equal(requestUrl(path), null);
  }
});

test('acknowledged requests use the existing contact form with a distinct referral tag', () => {
  const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const form = new URL(REQUEST_FORM_URL);
  assert.ok(homepage.includes(`${form.origin}${form.pathname}`));
  assert.equal(form.searchParams.get('referrername'), REQUEST_REFERRER);
  assert.equal(REQUEST_REFERRER, 'gummi-bears-special-run-ack-v1');
});

test('price formatting keeps $30 whole and preserves cents for future prices', () => {
  assert.equal(formatPrice(3000), '$30');
  assert.equal(formatPrice(3050), '$30.50');
  assert.equal(formatPrice(null), 'Price coming soon');
});

test('the verified 7.45% Provo tax stays inside the $30 total', () => {
  const preTaxCents = Math.round(kit.priceInCents / 1.0745);
  assert.equal(preTaxCents, 2792);
  assert.equal(kit.priceInCents - preTaxCents, 208);
});
