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
  if (link.id !== product.stripePaymentLinkId || link.livemode !== true ||
      typeof link.active !== 'boolean' || !Number.isSafeInteger(product.runLimit) || product.runLimit < 1 ||
      !Number.isSafeInteger(restriction?.limit) || restriction.limit < 1 || restriction.limit > product.runLimit ||
      !Number.isSafeInteger(restriction?.count) || restriction.count < 0 ||
      items?.has_more !== false || items.data.length !== 1 || item.quantity !== 1 ||
      item.adjustable_quantity?.enabled !== false || price?.id !== product.stripePriceId ||
      price.product !== product.stripeProductId || price.currency !== product.currency.toLowerCase() ||
      price.unit_amount !== product.priceInCents) {
    throw new Error('Payment Link inventory configuration does not match the catalog.');
  }
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
  const inventory = await createInventory(catalog, client);
  await writeFile(new URL('../_site/assets/inventory.json', import.meta.url), `${JSON.stringify(inventory, null, 2)}\n`);
  console.log('Stock snapshot updated. No customer or payment details were published.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Stripe errors can include request details: never print the key or raw error.
    console.error('Stock sync failed. Check the restricted key and Payment Link configuration. The previous deployment is unchanged.');
    process.exitCode = 1;
  });
}
