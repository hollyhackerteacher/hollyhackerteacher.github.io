import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { checkoutUrl, purchaseState, formatPrice, requestUrl } from '../shop.mjs';
import { REQUEST_FORM_URL, REQUEST_REFERRER, requestFormDetails } from '../shop/request/request.mjs';

const { products } = JSON.parse(readFileSync(new URL('../assets/products.json', import.meta.url)));
const kit = products[0];

test('published catalog has the real kit, $30 total, delivery terms, and all three photos', () => {
  assert.equal(kit.priceInCents, 3000);
  assert.equal(kit.currency, 'USD');
  assert.equal(kit.runLimit, 26);
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

test('an interest listing never offers checkout, even if pricing or a payment link is accidentally supplied', () => {
  const interest = { ...kit, status: 'interest-list' };
  assert.deepEqual(purchaseState(interest), { label: 'Get on the list', url: null });
  assert.equal(purchaseState(interest, { available: false, remaining: 0 }).label, 'Get on the list');
});

test('the healthcare interest list is tagged separately from Gummi Bears requests', () => {
  const healthcare = requestFormDetails('healthcare');
  const gummi = requestFormDetails();
  assert.equal(gummi.url, REQUEST_FORM_URL);
  assert.notEqual(healthcare.referrer, gummi.referrer);
  assert.equal(new URL(healthcare.url).searchParams.get('referrername'), 'healthcare-special-run-interest-v1');
  assert.equal(requestFormDetails('unknown'), null);
  assert.equal(requestUrl('/shop/healthcare-special-run/'), '/shop/healthcare-special-run/');
});

test('the Medic badge shows a tax-inclusive estimate and photos without enabling orders', () => {
  const badge = products.find(product => product.id === 'startrek-medic-communicator-badge');
  assert.equal(badge.name, 'Star Trek Medic Communicator Badge');
  assert.equal(badge.status, 'interest-list');
  assert.match(badge.contestNote, /only by winning a contest at the HealthCare Hacking Community/);
  assert.match(badge.contestNote, /special run after the con/);
  assert.match(badge.interestNote, /No order or payment/);
  assert.match(badge.description, /magnets.*shirt without making holes/);
  assert.equal(badge.anticipatedPrice, 'Anticipated cost: $10 each, including sales tax.');
  assert.equal(badge.anticipatedPriceNote, 'Final pricing will be confirmed at the time of the special run.');
  assert.equal(purchaseState(badge).url, null);
  assert.equal(badge.images.length, 2);
  badge.images.forEach(image => assert.ok(existsSync(new URL(`../${image.src}`, import.meta.url))));
  for (const field of ['priceInCents', 'currency', 'paymentLink', 'stripeProductId', 'stripePriceId', 'stripePaymentLinkId']) {
    assert.equal(Object.hasOwn(badge, field), false, field);
  }
  const interestPage = readFileSync(new URL(`..${requestUrl(badge.requestPath)}index.html`, import.meta.url), 'utf8');
  assert.ok(interestPage.includes(badge.anticipatedPrice));
  assert.ok(interestPage.includes(badge.anticipatedPriceNote));
});
