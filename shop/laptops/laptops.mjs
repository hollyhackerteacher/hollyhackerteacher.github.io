import { upcomingPickupSlots, pickupCheckoutUrl } from './pickup.mjs';

const grid = globalThis.document?.querySelector('#laptop-grid');
const note = globalThis.document?.querySelector('#availability-note');
const liveStockUrl = 'https://script.google.com/macros/s/AKfycbwHBzveCocsHtuMarUVs5Ukbt069GVnV8Yn9l8ZxUJ7SBYfsLsPYOVlMv-c5t1ZvYx1/exec';
let products = [];
let inventory = null;
let filter = 'all';
let liveRequest = null;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

export function checkoutUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' &&
      !url.username && !url.password && !url.port && /^\/[a-zA-Z0-9_]+$/.test(url.pathname)
      ? url.href : null;
  } catch { return null; }
}

export function stockSnapshotIsFresh(snapshot, now = Date.now()) {
  const checked = Date.parse(snapshot?.checkedAt || '');
  return Number.isFinite(checked) && checked <= now + 60_000 && now - checked <= 120_000;
}

export function saleState(product, snapshot, now = Date.now()) {
  if (product.saleStatus !== 'available') return { label: 'Not yet for sale', available: false };
  if (!Number.isSafeInteger(product.priceInCents) || product.priceInCents <= 0) return { label: 'Checkout coming soon', available: false };
  const link = checkoutUrl(product.paymentLink);
  const stock = snapshot?.schemaVersion === 1 ? snapshot.products?.[product.id] : null;
  if (stock?.remaining === 0 || stock?.available === false) return { label: 'Sold out', available: false };
  if (!link || !product.stripePaymentLinkId || !product.stripePriceId || !product.stripeProductId) {
    return { label: 'Checkout coming soon', available: false };
  }
  const confirmed = stock?.available === true && stock?.remaining > 0 && stockSnapshotIsFresh(snapshot, now);
  return { label: confirmed ? 'Buy this laptop' : 'Check availability in Stripe', available: true, confirmed, link };
}

function photoGallery(product) {
  const gallery = node('div', 'photo-gallery');
  const images = product.photos || [];
  const main = node('img', 'photo-gallery__main');
  main.src = `../../assets/laptops/${images[0]}`;
  main.alt = `Model reference ${images[0].split('-').at(-1).split('.')[0]} view of ${product.model}`;
  main.loading = 'lazy';
  gallery.append(main);
  if (images.length > 1) {
    const strip = node('div', 'photo-gallery__strip');
    images.forEach((name, index) => {
      const button = node('button', index === 0 ? 'selected' : '');
      button.type = 'button';
      button.setAttribute('aria-label', `Show ${product.model} reference view ${index + 1}`);
      button.setAttribute('aria-pressed', String(index === 0));
      const thumb = node('img');
      thumb.src = `../../assets/laptops/${name}`;
      thumb.alt = '';
      button.append(thumb);
      button.addEventListener('click', () => {
        main.src = thumb.src;
        main.alt = `Model reference ${name.split('-').at(-1).split('.')[0]} view of ${product.model}`;
        strip.querySelectorAll('button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
      });
      strip.append(button);
    });
    gallery.append(strip);
  }
  return gallery;
}

function detail(label, value) {
  const row = node('div', 'spec');
  row.append(node('dt', null, label), node('dd', null, value));
  return row;
}

function card(product) {
  const article = node('article', 'laptop-card');
  article.id = product.id;
  article.append(photoGallery(product));
  const body = node('div', 'laptop-card__body');
  const state = saleState(product, inventory);
  body.append(node('p', 'stock-tag', `STOCK #${product.stockNumber}  ·  ${product.saleStatus === 'available' ? (state.label === 'Sold out' ? 'SOLD OUT' : state.confirmed ? 'ONE OF ONE' : 'CHECK STRIPE') : 'COMING SOON'}`));
  body.append(node('h3', null, product.model));
  body.append(node('p', 'condition', `Grade ${product.grade} · ${product.condition}`));
  body.append(node('p', 'included', 'Factory charger · Windows 11 installed'));
  const specs = node('dl', 'specs');
  specs.append(
    detail('Service tag', product.serial),
    detail('Processor', product.cpu),
    detail('Cores / threads', product.coresThreads),
    detail('Memory', product.ram),
    detail('Storage', product.storage),
    detail('Display', product.screen),
    detail('Graphics', product.graphics),
    ...(product.batteryDetails ? [detail('Battery details', product.batteryDetails)] : []),
    detail('Weight', product.weight),
    detail('Dimensions', `${product.dimensions} in`)
  );
  body.append(specs);
  const price = node('div', 'purchase');
  if (product.saleStatus === 'available' && Number.isSafeInteger(product.priceInCents)) {
    price.append(node('strong', 'price', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(product.priceInCents / 100)));
  }
  if (state.available) {
    const form = node('form', 'pickup-form');
    const label = node('label', null, 'Choose your pickup date · 7 p.m.');
    const select = node('select');
    select.id = `pickup-${product.stockNumber}`;
    select.required = true;
    label.htmlFor = select.id;
    const placeholder = node('option', null, 'Select Tuesday or Thursday');
    placeholder.value = '';
    select.append(placeholder);
    upcomingPickupSlots().forEach(slot => {
      const option = node('option', null, slot.label);
      option.value = slot.value;
      select.append(option);
    });
    const buy = node('button', 'buy-button', state.confirmed ? 'Continue to secure checkout ↗' : 'Check availability in Stripe ↗');
    buy.type = 'submit';
    form.append(label, select, node('p', 'purchase-limit', 'One laptop per buyer across all batches.'), buy);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const url = pickupCheckoutUrl(state.link, product.stockNumber, select.value);
      if (url) globalThis.location.assign(url);
      else {
        select.setCustomValidity('This pickup date is no longer available. Choose a later date.');
        select.reportValidity();
      }
    });
    select.addEventListener('change', () => select.setCustomValidity(''));
    price.append(form);
  } else {
    price.append(node('span', 'buy-button buy-button--disabled', state.label));
  }
  body.append(price);
  article.append(body);
  return article;
}

function render() {
  grid.replaceChildren(...products.filter(p => filter === 'all' || p.model.startsWith(filter))
    .sort((a, b) => Number(b.saleStatus === 'available') - Number(a.saleStatus === 'available') || a.stockNumber - b.stockNumber).map(card));
  grid.setAttribute('aria-busy', 'false');
  const live = products.filter(p => saleState(p, inventory).confirmed).length;
  const checked = Date.parse(inventory?.checkedAt || '');
  const fresh = stockSnapshotIsFresh(inventory);
  const count = fresh ? `${live} ${live === 1 ? 'laptop' : 'laptops'} shown available` : 'Live stock status could not be confirmed';
  const when = Number.isFinite(checked)
    ? ` Last checked ${new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit' }).format(new Date(checked))} Mountain.`
    : '';
  note.textContent = `${count}.${when} Stripe Checkout makes the final availability decision; this page may lag a sale.`;
}

if (grid) document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
    render();
  }));

export function chooseStockSnapshot(current, snapshot, catalog) {
  if (snapshot?.schemaVersion !== 1 || !snapshot.products ||
      !Number.isFinite(Date.parse(snapshot.checkedAt))) return current;
  if (catalog.some(product => product.saleStatus === 'available' &&
      (!snapshot.products[product.id] || !Number.isSafeInteger(snapshot.products[product.id].remaining)))) return current;
  if (current && Date.parse(snapshot.checkedAt) < Date.parse(current.checkedAt)) return current;
  return snapshot;
}

function liveSnapshot() {
  if (!liveStockUrl.startsWith('https://script.google.com/macros/s/')) return Promise.resolve(null);
  if (liveRequest) return liveRequest;
  liveRequest = new Promise(resolve => {
    const callback = 'fireboltStockUpdate';
    const script = document.createElement('script');
    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      delete globalThis[callback];
      script.remove();
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 12_000);
    globalThis[callback] = result => finish(result);
    script.onerror = () => finish(null);
    script.src = `${liveStockUrl}?callback=${callback}&t=${Date.now()}`;
    document.head.append(script);
  }).finally(() => { liveRequest = null; });
  return liveRequest;
}

async function refresh() {
  const [live, backup] = await Promise.all([
    liveSnapshot().catch(() => null),
    fetch(`../../assets/inventory.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null).catch(() => null)
  ]);
  let next = inventory;
  if (stockSnapshotIsFresh(backup)) next = chooseStockSnapshot(next, backup, products);
  if (live) next = chooseStockSnapshot(next, live, products);
  inventory = next;
  render();
}

if (grid) try {
  const response = await fetch('../../assets/laptops.json');
  if (!response.ok) throw new Error('Catalog unavailable');
  ({ products } = await response.json());
  await refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
} catch {
  grid.setAttribute('aria-busy', 'false');
  note.textContent = 'The laptop catalog could not load. Please try again later.';
}
