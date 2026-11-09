const grid = globalThis.document?.querySelector('#laptop-grid');
const note = globalThis.document?.querySelector('#availability-note');
let products = [];
let inventory = null;
let filter = 'all';
const PURCHASING_PAUSED = true;

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

export function saleState(product, snapshot) {
  if (PURCHASING_PAUSED) return { label: 'Purchasing paused', available: false };
  const link = checkoutUrl(product.paymentLink);
  const stock = snapshot?.schemaVersion === 1 ? snapshot.products?.[product.id] : null;
  if (stock?.remaining === 0 || stock?.available === false) return { label: 'Sold out', available: false };
  if (!link || !product.stripePaymentLinkId || !product.stripePriceId || !product.stripeProductId) {
    return { label: 'Checkout coming soon', available: false };
  }
  return { label: 'Buy this laptop', available: true, link };
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
  body.append(node('p', 'stock-tag', `STOCK #${product.stockNumber}  ·  ${state.label === 'Sold out' ? 'SOLD OUT' : 'ONE OF ONE'}`));
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
    detail('Battery capacity', product.batteryCapacityWh == null ? 'Report pending' : `${product.batteryCapacityWh.toLocaleString('en-US', { maximumFractionDigits: 1 })} Wh`),
    detail('Battery health', product.batteryHealthPercent == null ? 'Report pending' : `${product.batteryHealthPercent.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`),
    detail('Weight', product.weight),
    detail('Dimensions', `${product.dimensions} in`)
  );
  body.append(specs);
  const price = node('div', 'purchase');
  price.append(node('strong', 'price', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(product.priceInCents / 100)));
  if (state.available) {
    const buy = node('a', 'buy-button', state.label + ' ↗');
    buy.href = state.link;
    buy.rel = 'noopener noreferrer';
    price.append(buy);
  } else {
    price.append(node('span', 'buy-button buy-button--disabled', state.label));
  }
  body.append(price);
  article.append(body);
  return article;
}

function render() {
  grid.replaceChildren(...products.filter(p => filter === 'all' || p.model.startsWith(filter)).map(card));
  grid.setAttribute('aria-busy', 'false');
  const live = products.filter(p => saleState(p, inventory).available).length;
  note.textContent = PURCHASING_PAUSED ? 'Purchasing is paused while we finalize the sale details. Listings remain available to review.' : live ? `${live} laptops currently available for checkout. One of each stock number.` : 'All laptops are sold out. Contact us with a stock number if you have a question.';
}

if (grid) document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
    render();
  }));

async function refresh() {
  try {
    const response = await fetch(`../../assets/inventory.json?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) inventory = await response.json();
  } catch { /* Stripe checkout remains the final availability check. */ }
  if (products.length) render();
}

if (grid) try {
  const response = await fetch('../../assets/laptops.json');
  if (!response.ok) throw new Error('Catalog unavailable');
  ({ products } = await response.json());
  render();
  await refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
} catch {
  grid.setAttribute('aria-busy', 'false');
  note.textContent = 'The laptop catalog could not load. Please try again later or contact us.';
}
