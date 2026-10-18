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
`https://www.fireboltservices.com/shop/request/`. The shop also has an
“If sold out, request another run” link so customers can always find the form.
The listing describes a **20-kit run**, not a live remaining-stock counter.
GitHub Pages cannot read private Stripe inventory, and there is no backend
poller or webhook syncing the catalog. The shop button does not automatically
change to “Sold out”; Stripe enforces availability when it is opened. Set
`status: "sold-out"` in the catalog when desired to change that button too.

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
20-checkout limit; the static site does not fulfill orders or maintain inventory.

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
node --test tests/shop.test.mjs
node --check shop.mjs
node --check shop/request/request.mjs
git diff --check
```

Open `http://127.0.0.1:8765/shop/`. No build step or new dependencies are needed.
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
