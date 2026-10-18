# Firebolt shop

The standalone storefront is `shop/index.html`. GitHub Pages serves it at
`https://www.fireboltservices.com/shop/` (visiting `/shop` redirects there).
The homepage has no shop link and is unchanged.

## Product and delivery

Edit `assets/products.json` to update the listing. It currently contains the
Gummi Bears MiniBadge Display Board kit, all six minibadges, the supplied photos,
and the seller's $30 USD price including 7.25% sales tax.

- SAINTCON pickup is free.
- Shipping is available after the conference, paid by the buyer and arranged
  through the existing contact form. No shipping price has been provided.
- The purchase link is specifically for SAINTCON pickup. Do not use a pickup
  checkout to promise shipping or collect a shipping payment.
- Do not infer batteries are included from the photos; the listing only says
  the board runs on AA batteries.

## Stripe setup still required

Checkout is disabled until a real link is configured. No Stripe account changes,
tax setup, or payment transactions have been performed by this code.

1. Configure a one-time $30 USD price in Stripe with tax **included** in the
   price. Do not leave USD pricing on an automatic/exclusive tax behavior.
2. Ensure the actual checkout calculates the seller-supplied 7.25% tax for
   SAINTCON pickup, included in the $30. For one kit, the rounded breakdown is
   $27.97 before tax and $2.03 tax. Do not add tax or a card surcharge on top.
   Stripe processing fees reduce the seller's proceeds; the seller's fee rate
   has not been supplied and is not assumed here.
3. Verify the tax configuration in Stripe before enabling checkout. Payment
   Links support automatic tax; the storefront cannot set a fixed 7.25% tax
   rate or a pickup tax location by adding URL parameters. If the account's
   Payment Link setup cannot correctly represent SAINTCON pickup and that tax
   rate, use a server-created Stripe Checkout Session with an inclusive manual
   tax rate instead. That requires a separate backend; GitHub Pages is static.
   Do not enable a link whose tax calculation has not been verified.
4. The pickup checkout should collect the buyer's name and email, describe
   SAINTCON pickup, and include a pickup reminder in Stripe's confirmation.
   Keep quantity fixed at one kit for the current purchase flow.
5. Test the checkout in Stripe's sandbox first. Paste its `https://buy.stripe.com/…`
   Payment Link into `paymentLink` and set `status` to `available` in the product
   file. Sandbox links are visibly marked as test checkout by the storefront.
6. After verifying the total, tax breakdown, buyer details, and confirmation,
   replace the sandbox link with the matching live Payment Link. Verify its
   visible checkout configuration before publishing.

Stripe remains the authority for the charged amount. The website's price text
does not configure Stripe. Do not put secret API keys in this repository.
Only standard `buy.stripe.com` Payment Links are accepted by the current code.
Custom Stripe checkout domains or a server checkout endpoint need a corresponding
URL validation update before use.

Use `status: "sold-out"` to disable purchases; also deactivate the Payment Link
in Stripe so anyone holding an older direct link cannot keep buying. Set
`hidden: true` to hide a product. Verify paid orders in the Stripe Dashboard
before handing over or shipping a kit; a browser visit is not proof of payment.

## Preview and checks

From the repository directory:

```text
python -m http.server 8765 --bind 127.0.0.1
node --test tests/shop.test.mjs
node --check shop.mjs
git diff --check
```

Open `http://127.0.0.1:8765/shop/`. No build step or new dependencies are needed.

Stripe references:

- [Payment Links](https://docs.stripe.com/payment-links)
- [Tax-inclusive prices](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior#tax-behavior)
- [Manual inclusive tax rates](https://docs.stripe.com/tax/tax-rates#inclusive-versus-exclusive-tax)
- [Collect names, addresses, and shipping](https://docs.stripe.com/payment-links/customize)
