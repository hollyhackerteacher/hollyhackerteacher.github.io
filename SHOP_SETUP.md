# Firebolt shop

The standalone storefront is `shop/index.html`. GitHub Pages serves it at
`https://www.fireboltservices.com/shop/` (visiting `/shop` redirects there).
The homepage has no shop link and is unchanged.

## Product and delivery

Edit `assets/products.json` to update the listing. It contains the Gummi Bears
MiniBadge Display Board kit, all six minibadges, three supplied photos, and a
$30 USD total including sales tax. No card surcharge is added to that price.

- Free pickup at SAINTCON at Utah Valley Convention Center in Provo, Utah.
- Shipping is available after the conference, paid by the buyer and arranged
  through the existing contact form. No shipping price has been provided.
- The purchase link is for SAINTCON pickup only. Do not use it to promise
  shipping or collect a shipping payment.
- The listing says the board runs on AA batteries; it does not promise that
  batteries are included.

## Stripe configuration

Reuse these live resources rather than creating duplicates:

| Resource | ID |
| --- | --- |
| Product | `prod_firebolt_gummi_bears_display_kit` |
| One-time USD price | `price_1URzGNHhS4wvEd3Qj7AupyHq` |
| Payment Link | `plink_1URzMuHhS4wvEd3Qzx78u8Zt` |
| SAINTCON performance location | `taxloc_1URzLaHhS4wvEd3QcV0Ug4M2` |

Payment Link: <https://buy.stripe.com/00wfZhfKq1Pf1sGe5ndZ607>

The price has `unit_amount: 3000`, `currency: usd`, and `tax_behavior: inclusive`.
The Payment Link has automatic tax enabled, quantity fixed at one kit, promotion
codes disabled, required buyer name collection, and a SAINTCON pickup reminder
before and after payment. Stripe also collects the buyer's email. Payment methods
use Stripe's dynamic configuration. No card details are collected by this site.

The seller confirmed their existing Utah sales-tax registration and business
address. Stripe Tax now has an active head office and Utah registration. Account
default tax code and tax behavior were left unchanged. Automatic tax was enabled
on this new Payment Link; existing manual/custom-order workflows were not edited.

The seller accepted the general physical-goods category. The product uses
`txcd_99999999` (General – Tangible Goods) and the venue performance location:
220 West Center Street, Suite 200, Provo, UT 84601. The address comes from the
[venue's contact page](https://utahvalleycc.com/contact-us/).

### Verified tax calculation

On October 18, 2026, Stripe returned this result for one kit at the pickup venue:

| Value | Result |
| --- | --- |
| Customer total | $30.00 |
| Taxable amount | $27.92 |
| Included tax | $2.08 |
| Calculated venue rate | 7.45% |
| Taxability reason | `standard_rated` |

This differs from the seller's initial 7.25% estimate. The site says “Sales tax
included” rather than hardcoding a percentage. Stripe calculates the applicable
venue rate while keeping the inclusive $30 price. The verification used a Tax
Calculation; no customer payment was submitted. Only the live account was
connected, so no sandbox payment was completed. Stripe Tax has merchant usage
fees in addition to payment processing; these are not customer surcharges.

The website cannot change Stripe pricing or tax by editing its display text.
Change the catalog and Stripe configuration together. Never put secret API keys
in this repository. Only standard `buy.stripe.com` Payment Links are accepted by
the current code; custom checkout domains need a corresponding validation change.

## The 20-kit run and special-run requests

On October 18, 2026, the existing Payment Link was updated with
`restrictions.completed_sessions.limit: 20`. Stripe returned `count: 0` at the
time of the change. Quantity remains fixed at one kit per checkout, so this
limits the link to 20 completed checkouts. Stripe enforces the limit and
automatically deactivates the link when it is reached, including direct links
shared outside the website. Opening checkout does not consume a kit.

The link's `inactive_message` explains the sellout and points to
`https://www.fireboltservices.com/shop/request/`. The shop displays the remaining
quantity from a Stripe snapshot. At zero it automatically replaces Buy with
**Request another run**. The secondary request link is also available before
sellout. The acknowledgement page and its submission service are unchanged.

### Automatic stock sync and deployment

`.github/workflows/shop-pages.yml` builds and deploys the website on pushes to
`main`, on manual dispatch, and on a five-minute schedule. GitHub's scheduler
can delay or skip runs under load, so this is periodic availability, not an
instant reservation system. Normally a purchase appears on the shop within
5–10 minutes, including deployment; there is no guaranteed maximum delay.
Public repositories' scheduled workflows can be disabled after 60 days without
repository activity. Re-enable the workflow before a future conference if needed.

The browser fetches the stock snapshot on load, every minute while the tab is
visible, and when the tab is reopened. It displays when stock was checked. After
30 minutes, a positive count is labeled “Last confirmed”. A failed refresh keeps
the last valid snapshot, especially a known sellout. Without any valid snapshot,
it omits the remaining count and sends buyers to Stripe to confirm availability.
The native Stripe cap continues to protect against overselling between syncs.

The workflow needs one dedicated live restricted Stripe key with **Payment Links:
Read** only, stored as repository Actions secret `STRIPE_INVENTORY_KEY`. It cannot
be the interactive connector credential: GitHub needs its own unattended access.
Never paste the key into chat, code, a committed file, or a workflow log. No write
permissions, customer access, or payment access are needed. The runner uses Stripe
SDK 23.0.0 and its default API version `2026-09-30.endive`.

`scripts/sync-inventory.mjs` retrieves only the configured Payment Links, checks
their price/product, fixed quantity, live mode, and native cap, and computes
`max(0, limit - completed_sessions.count)`. A manually reduced cap accommodates
offline sales; the workflow never increases a cap, reactivates a link, refunds,
charges, or fulfills an order. Completed asynchronous checkouts consume the cap
even while payment is pending, consistently with Stripe's restriction.

The only generated public fields in `_site/assets/inventory.json` are a schema
version, check time, catalog ID, remaining count, run size, and availability. No
customer data, payment details, API credentials, or raw Stripe responses are
published. The deployment artifact includes only website files; tooling,
dependencies, Git history, and environment files are excluded. Local inventory
preview files are ignored and excluded from the build. A failed Stripe read or
configuration mismatch fails the build and leaves the previous deployment live.
Temporary upload artifacts are removed after successful deployment; the source
and public deployed website are retained. Public PR checks run without the key
and cannot deploy the website.

Activation steps after reviewing the code:

1. Store the restricted key as `STRIPE_INVENTORY_KEY` in this repository's
   **Settings → Secrets and variables → Actions**.
2. Merge the workflow and select **Settings → Pages → Source: GitHub Actions**.
   The domain remains `www.fireboltservices.com`.
3. Run **Publish website and sync kit stock** and confirm its build and deploy
   jobs succeed. Read `/assets/inventory.json` and check the shop before declaring
   the sync active. Verify a later scheduled run as well.

This read-only display uses the native Payment Link counter directly. It does
not maintain a separate inventory ledger or perform payment-triggered side
effects, so there is no webhook receiver in this workflow. Any future automated
fulfillment or separate order/inventory ledger still requires the signed event
handler described below.

Account for any cash sales or orders through other links by reducing this
link's cap. Its limit is cumulative completed sessions, not remaining stock.
Refunds or failed delayed payments do not automatically restore inventory;
review them before increasing the limit or reactivating the link. Keep
`runLimit` in the catalog consistent with the advertised run size.

The request page requires a fresh, initially unchecked acknowledgement before
it loads the existing Zoho contact form or offers a direct form link. Unchecking
it removes the form. Acknowledgement wording, version `gummi-bears-special-run-ack-v1`:

> I understand that by joining this list I’m asking Hollyhacker to make a special
> run of the Gummi Bears kit. I really want a kit and intend to buy one if another
> run is offered.

Customers provide their name, email and requested quantity through the existing
contact form. Instructions ask them to include “Gummi Bears special run” in
Message. This reuses the site's working submission service and notification
settings; no new form account or public customer-data file was created.
In Zoho Forms **All Entries**, filter **Referrer Name** for
`gummi-bears-special-run-ack-v1` to find this list. This uses Zoho's documented
[referral parameter](https://help.zoho.com/portal/en/kb/forms/embedding-forms/embedding-forms-in-webpages/articles/tracking-referrals).
The marker identifies the acknowledgement flow; it is not a server-side consent
field or a tamper-proof legal record. The underlying general contact form remains
public. No request is saved merely by checking the box or revealing the form;
the customer must select **Submit** and receive Zoho's confirmation.

## Order handling

Orders are handled manually in the Stripe Dashboard. Confirm that the payment
status is **paid** before handing over or shipping a kit, including orders using
delayed payment methods. Visiting the shop or a confirmation page is not proof
of payment. Fulfillment remains manual. Stripe handles this Payment Link's
20-checkout limit; the site periodically mirrors its remaining count for display.

Any future automated fulfillment, inventory updates, or confirmation-email
workflow needs a signed webhook handler for `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and failure events, gated on payment
status and implemented with idempotency. Fulfillment must not depend on a browser
returning to a success page.

To stop sales early, use `status: "sold-out"` to disable the website buy button
and deactivate the Payment Link in Stripe so older direct links cannot keep
accepting orders. The request link remains available. Set
`hidden: true` to hide a product. Automatic tax collection does not itself file
or remit the seller's returns.

## Preview and checks

From the repository directory:

```text
python -m http.server 8765 --bind 127.0.0.1
npm ci --ignore-scripts
npm test
npm run build
node --check shop.mjs
node --check shop/request/request.mjs
git diff --check
```

Open `http://127.0.0.1:8765/shop/`. Node is only used for tests and deployment;
the published website remains static. For a local preview, an ignored
`assets/inventory.json` can simulate quantities; it is never copied to the Pages
artifact. Only a successful Stripe sync writes the production snapshot.
Test a positive count changing to zero while the page remains open, verify the
Buy link is removed and the request link becomes primary, and verify a failed
refresh cannot reopen a known sellout. Do not change production Stripe inventory
or make purchases to simulate a sellout.
For `/shop/request/`, verify that continuing without the acknowledgement cannot
open the form, checking it opens the real form, and unchecking it removes it.
Do not submit fake requests to the live contact form or make live purchases to
test the cap. The saved Stripe restriction can be verified without transactions.

Stripe references:

- [Payment Links](https://docs.stripe.com/payment-links)
- [Tax-inclusive prices](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior#tax-behavior)
- [Tax categories](https://docs.stripe.com/tax/tax-codes)
- [Tax at the pickup location](https://docs.stripe.com/tax/optional-tax-location/integration-guide)
- [Collect names, addresses, and shipping](https://docs.stripe.com/payment-links/customize)
