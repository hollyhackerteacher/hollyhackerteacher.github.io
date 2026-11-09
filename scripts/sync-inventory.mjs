import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';

// The native Payment Link restriction is authoritative. Never infer purchases
// from page visits, success redirects, client storage or individual payments.
export function stockFromPaymentLink(product, link) {
  const restriction = link.restrictions?.completed_sessions;
  const items = link.line_items;
  const item = items?.data?.[0];
  const price = item?.price;
  const checks = {
    'link ID': link.id === product.stripePaymentLinkId,
    'live mode': link.livemode === true,
    'active flag': typeof link.active === 'boolean',
    'catalog run limit': Number.isSafeInteger(product.runLimit) && product.runLimit >= 1,
    'completed-session limit': Number.isSafeInteger(restriction?.limit) && restriction.limit >= 1 && restriction.limit <= product.runLimit,
    'completed-session count': Number.isSafeInteger(restriction?.count) && restriction.count >= 0,
    'expanded line items': items?.has_more === false && items.data.length === 1,
    'line item quantity': item?.quantity === 1,
    'adjustable quantity': item?.adjustable_quantity?.enabled === false,
    'price ID': price?.id === product.stripePriceId,
    'product ID': price?.product === product.stripeProductId,
    'currency': price?.currency === product.currency.toLowerCase(),
    'unit amount': price?.unit_amount === product.priceInCents,
  };
  const failed = Object.entries(checks).find(([, valid]) => !valid)?.[0];
  if (failed) throw new Error(`Payment Link inventory mismatch for ${product.id}: ${failed}`);
  const remaining = Math.max(0, restriction.limit - restriction.count);
  return { remaining, runLimit: product.runLimit, available: link.active && remaining > 0 };
}

export async function createInventory(catalog, client, now = new Date()) {
  const products = {};
  for (const product of catalog.products.filter(product => !product.hidden &&
      product.status !== 'interest-list' && product.stripePaymentLinkId)) {
    const link = await client.paymentLinks.retrieve(product.stripePaymentLinkId, { expand: ['line_items'] });
    products[product.id] = stockFromPaymentLink(product, link);
  }
  if (!Object.keys(products).length) throw new Error('No inventory products configured.');
  return { schemaVersion: 1, checkedAt: now.toISOString(), products };
}

async function main() {
  const key = process.env.STRIPE_INVENTORY_KEY;
  if (!key?.startsWith('rk_live_')) throw new Error('A dedicated live restricted key is required.');
  const client = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  const catalog = JSON.parse(await readFile(new URL('../assets/products.json', import.meta.url), 'utf8'));
  const laptops = JSON.parse(await readFile(new URL('../assets/laptops.json', import.meta.url), 'utf8'));
  catalog.products.push(...laptops.products);
  const inventory = await createInventory(catalog, client);
  await writeFile(new URL('../_site/assets/inventory.json', import.meta.url), `${JSON.stringify(inventory, null, 2)}\n`);
  console.log('Stock snapshot updated. No customer or payment details were published.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    // Stripe errors can include request details: never print the key or raw error.
    const safeMessage = /^Payment Link inventory mismatch for laptop-\d+: [a-z -]+$/.test(error?.message || '')
      ? error.message : 'Check the restricted key and Payment Link configuration.';
    console.error(`Stock sync failed. ${safeMessage} The previous deployment is unchanged.`);
    process.exitCode = 1;
  });
}
