// Prices and payment details are configured in Stripe. This file only links to checkout.
export function checkoutUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com' ||
        url.username || url.password || url.port || !/^\/[a-zA-Z0-9_]+$/.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function purchaseState(product) {
  if (product.status === 'sold-out') return { label: 'Sold out', url: null };
  const url = checkoutUrl(product.paymentLink);
  const validPrice = Number.isSafeInteger(product.priceInCents) && product.priceInCents > 0;
  if (product.status !== 'available' || !url || !validPrice || product.currency !== 'USD') {
    return { label: 'Online ordering coming soon', url: null };
  }
  const test = new URL(url).pathname.startsWith('/test_');
  return { label: test ? 'Test checkout — no real payment' : 'Buy for SAINTCON pickup', url, test };
}

export function formatPrice(cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0) return 'Price coming soon';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

export function requestUrl(path) {
  return path === '/shop/request/' ? path : null;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function productPhotos(product) {
  const gallery = element('div', 'product-photos');
  const images = (product.images || []).filter(image =>
    typeof image.src === 'string' && /^assets\/shop\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(image.src));
  if (!images.length) {
    gallery.append(element('p', 'kicker', 'Product photos coming soon.'));
    return gallery;
  }
  const figure = element('figure', 'product-photos__figure');
  const main = element('img', 'product-photos__main');
  main.src = new URL(images[0].src, import.meta.url).href;
  main.alt = images[0].alt;
  main.width = 3024;
  main.height = 4032;
  main.loading = 'lazy';
  const caption = element('figcaption', 'product-photos__caption', images[0].caption);
  caption.setAttribute('aria-live', 'polite');
  figure.append(main, caption);
  gallery.append(figure);
  if (images.length > 1) {
    const thumbnails = element('div', 'product-photos__thumbnails');
    thumbnails.setAttribute('role', 'group');
    thumbnails.setAttribute('aria-label', `${product.name} photos`);
    images.forEach((image, index) => {
      const button = element('button', 'product-photos__thumbnail');
      button.type = 'button';
      button.setAttribute('aria-label', `Show photo ${index + 1}: ${image.caption}`);
      button.setAttribute('aria-pressed', String(index === 0));
      const thumb = element('img');
      thumb.src = new URL(image.src, import.meta.url).href;
      thumb.alt = '';
      thumb.width = 90;
      thumb.height = 90;
      thumb.loading = 'lazy';
      button.append(thumb);
      button.addEventListener('click', () => {
        main.src = new URL(image.src, import.meta.url).href;
        main.alt = image.alt;
        caption.textContent = image.caption;
        thumbnails.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
      });
      thumbnails.append(button);
    });
    gallery.append(thumbnails);
  }
  return gallery;
}

export function renderProduct(product) {
  const article = element('article', 'card product');
  const details = element('div', 'product__details');
  const heading = element('h3', 'product__name', product.name);
  details.append(element('span', 'pill product__eyebrow', 'Display board + 6 minibadges'), heading);
  details.append(element('p', 'product__description', product.description));
  details.append(element('p', 'product__price', formatPrice(product.priceInCents)));
  details.append(element('p', 'product__price-note', product.priceNote));
  if (Number.isSafeInteger(product.runLimit) && product.runLimit > 0) {
    details.append(element('p', 'product__availability', product.status === 'sold-out'
      ? `This run of ${product.runLimit} kits has sold out.`
      : `Limited run: ${product.runLimit} kits. One kit per checkout; availability is confirmed at checkout.`));
  }
  details.append(element('h4', 'product__subheading', 'In the kit'));
  const features = element('ul', 'product__features');
  (product.features || []).forEach(feature => features.append(element('li', '', feature)));
  details.append(features);
  const delivery = element('div', 'product__delivery');
  delivery.append(element('h4', 'product__subheading', 'Pickup & shipping'));
  delivery.append(element('p', '', product.pickup), element('p', '', product.shipping));
  details.append(delivery);
  const state = purchaseState(product);
  const actions = element('div', 'product__actions');
  if (state.url) {
    const buy = element('a', 'btn btn--primary', state.label);
    buy.href = state.url;
    buy.setAttribute('aria-label', `${state.label}: ${product.name}, ${formatPrice(product.priceInCents)}`);
    actions.append(buy);
    details.append(element('p', 'product__checkout-note', state.test
      ? 'Sandbox checkout. No real payment will be taken.'
      : 'Pay securely with Stripe. This checkout is for free pickup at SAINTCON.'));
  } else {
    const unavailable = element('button', 'btn btn--ghost', state.label);
    unavailable.type = 'button';
    unavailable.disabled = true;
    actions.append(unavailable);
  }
  const moreUrl = requestUrl(product.requestPath);
  if (moreUrl) {
    const more = element('a', state.url ? 'product__request' : 'btn btn--primary',
      state.url ? 'If sold out, request another run →' : 'Request another run');
    more.href = moreUrl;
    actions.append(more);
  }
  const contact = element('a', 'product__contact', 'Questions or need shipping? Contact us');
  contact.href = '/#contact';
  actions.append(contact);
  details.append(actions);
  article.append(productPhotos(product), details);
  return article;
}

export async function loadShop() {
  const grid = document.getElementById('shop-products');
  const status = document.getElementById('shop-status');
  if (!grid || !status) return;
  try {
    const response = await fetch(new URL('./assets/products.json', import.meta.url));
    if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.products)) throw new Error('Invalid product catalog');
    const products = data.products.filter(product => product && !product.hidden);
    if (products.some(product => typeof product.name !== 'string' || !product.name.trim())) {
      throw new Error('A product name is missing');
    }
    const cards = products.map(renderProduct);
    grid.replaceChildren(...cards);
    status.textContent = products.length ? '' : 'New items are on the way. Contact us for availability.';
  } catch (error) {
    status.replaceChildren(document.createTextNode('The shop is temporarily unavailable. '));
    const contact = element('a', '', 'Contact us to order.');
    contact.href = '/#contact';
    status.append(contact);
    console.error('Unable to load shop:', error);
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

if (typeof document !== 'undefined') {
  const year = document.getElementById('shop-year');
  if (year) year.textContent = new Date().getFullYear();
  loadShop();
}
