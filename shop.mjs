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

export function purchaseState(product, stock = null) {
  if (product.status === 'sold-out' || stock?.remaining === 0) return { label: 'Sold out', url: null };
  if (stock?.available === false) return { label: 'Orders currently closed', url: null };
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

export function inventoryState(product, snapshot, now = Date.now()) {
  const checkedAt = Date.parse(snapshot?.checkedAt);
  const stock = snapshot?.products?.[product.id];
  if (snapshot?.schemaVersion !== 1 || !Number.isFinite(checkedAt) || checkedAt > now + 300_000 ||
      !snapshot.products || typeof snapshot.products !== 'object' || Array.isArray(snapshot.products) ||
      !Number.isSafeInteger(product.runLimit) || product.runLimit < 1 ||
      !Object.hasOwn(snapshot.products, product.id) || stock?.runLimit !== product.runLimit ||
      !Number.isSafeInteger(stock?.remaining) || stock.remaining < 0 || stock.remaining > product.runLimit ||
      typeof stock.available !== 'boolean' || (stock.remaining === 0 && stock.available)) return null;
  return { ...stock, checkedAt, stale: now - checkedAt > 30 * 60_000 };
}

export function stockMessage(product, stock) {
  if (product.status === 'sold-out' || stock?.remaining === 0) {
    return `Sold out — all ${product.runLimit} kits in this run are spoken for.`;
  }
  if (stock?.available === false) return 'Orders are currently closed.';
  if (stock) {
    return `${stock.stale ? 'Last confirmed: ' : ''}${stock.remaining} ${stock.remaining === 1 ? 'kit' : 'kits'} left`;
  }
  return Number.isSafeInteger(product.runLimit) && product.runLimit > 0
    ? `Limited run: ${product.runLimit} kits. Availability is confirmed at checkout.`
    : 'Availability is confirmed at checkout.';
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

function updateAvailability(article, product, snapshot) {
  const stock = inventoryState(product, snapshot);
  const state = purchaseState(product, stock);
  const availability = article.querySelector('[data-stock-count]');
  const message = stockMessage(product, stock);
  if (availability.textContent !== message) availability.textContent = message;
  const checked = article.querySelector('[data-stock-checked]');
  checked.replaceChildren();
  if (stock) {
    const time = element('time');
    time.dateTime = new Date(stock.checkedAt).toISOString();
    time.textContent = new Date(stock.checkedAt).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    time.title = new Date(stock.checkedAt).toLocaleString();
    checked.append(document.createTextNode('Stock checked '), time,
      document.createTextNode('. Usually updates every 5–10 minutes; availability is confirmed at checkout.'));
  } else {
    checked.textContent = 'The stock count is temporarily unavailable. Stripe will confirm availability at checkout.';
  }

  const actions = article.querySelector('[data-purchase-actions]');
  const actionKey = `${state.label}|${state.url}`;
  if (actions.dataset.state !== actionKey) {
    const hadFocus = actions.contains(document.activeElement);
    const oldHref = hadFocus ? document.activeElement.getAttribute('href') : null;
    const moreUrl = requestUrl(product.requestPath);
    const children = [];
    if (state.url) {
      const buy = element('a', 'btn btn--primary', state.label);
      buy.href = state.url;
      buy.setAttribute('aria-label', `${state.label}: ${product.name}, ${formatPrice(product.priceInCents)}`);
      children.push(buy);
      if (moreUrl) {
        const more = element('a', 'product__request', 'If sold out, request another run →');
        more.href = moreUrl;
        children.push(more);
      }
    } else if (moreUrl) {
      const more = element('a', 'btn btn--primary', 'Request another run');
      more.href = moreUrl;
      children.push(more);
    } else {
      const unavailable = element('button', 'btn btn--ghost', state.label);
      unavailable.type = 'button';
      unavailable.disabled = true;
      children.push(unavailable);
    }
    const contact = element('a', 'product__contact', 'Questions or need shipping? Contact us');
    contact.href = '/#contact';
    children.push(contact);
    actions.replaceChildren(...children);
    actions.dataset.state = actionKey;
    if (hadFocus) (children.find(child => child.getAttribute('href') === oldHref) || children[0]).focus({ preventScroll: true });
  }
  const note = article.querySelector('[data-checkout-note]');
  note.hidden = !state.url;
  note.textContent = state.test ? 'Sandbox checkout. No real payment will be taken.'
    : 'Pay securely with Stripe. This checkout is for free pickup at SAINTCON.';
}

export function renderProduct(product, snapshot = null) {
  const article = element('article', 'card product');
  const details = element('div', 'product__details');
  const heading = element('h3', 'product__name', product.name);
  details.append(element('span', 'pill product__eyebrow', 'Display board + 6 minibadges'), heading);
  details.append(element('p', 'product__description', product.description));
  details.append(element('p', 'product__price', formatPrice(product.priceInCents)));
  details.append(element('p', 'product__price-note', product.priceNote));
  const availability = element('p', 'product__availability');
  availability.dataset.stockCount = '';
  availability.setAttribute('role', 'status');
  const checked = element('p', 'product__stock-checked');
  checked.dataset.stockChecked = '';
  details.append(availability, checked);
  details.append(element('h4', 'product__subheading', 'In the kit'));
  const features = element('ul', 'product__features');
  (product.features || []).forEach(feature => features.append(element('li', '', feature)));
  details.append(features);
  const delivery = element('div', 'product__delivery');
  delivery.append(element('h4', 'product__subheading', 'Pickup & shipping'));
  delivery.append(element('p', '', product.pickup), element('p', '', product.shipping));
  details.append(delivery);
  const actions = element('div', 'product__actions');
  actions.dataset.purchaseActions = '';
  const note = element('p', 'product__checkout-note');
  note.dataset.checkoutNote = '';
  details.append(note, actions);
  article.append(productPhotos(product), details);
  updateAvailability(article, product, snapshot);
  return article;
}

export async function loadShop() {
  const grid = document.getElementById('shop-products');
  const status = document.getElementById('shop-status');
  if (!grid || !status) return;
  try {
    const response = await fetch(new URL('./assets/products.json', import.meta.url), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.products)) throw new Error('Invalid product catalog');
    const products = data.products.filter(product => product && !product.hidden);
    if (products.some(product => typeof product.name !== 'string' || !product.name.trim())) {
      throw new Error('A product name is missing');
    }
    const cards = products.map(product => renderProduct(product));
    grid.replaceChildren(...cards);
    status.textContent = products.length ? '' : 'New items are on the way. Contact us for availability.';
    let snapshot = null;
    let inFlight = false;
    async function refreshInventory() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const url = new URL('./assets/inventory.json', import.meta.url);
        // A different URL each minute avoids the static host's ten-minute cache.
        url.searchParams.set('v', String(Math.floor(Date.now() / 60_000)));
        const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error('Stock snapshot unavailable');
        const next = await response.json();
        if (products.every(product => inventoryState(product, next)) &&
            (!snapshot || Date.parse(next.checkedAt) >= Date.parse(snapshot.checkedAt))) snapshot = next;
      } catch {
        // Keep a known sellout during an outage. A failed refresh must never
        // turn a sold-out product back into a purchasable one.
      } finally {
        cards.forEach((card, index) => updateAvailability(card, products[index], snapshot));
        inFlight = false;
      }
    }
    await refreshInventory();
    window.setInterval(refreshInventory, 60_000);
    document.addEventListener('visibilitychange', refreshInventory);
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
