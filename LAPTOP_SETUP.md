# Used laptop shop

The page at `/shop/laptops/` reads `assets/laptops.json`. It lists the 16 stock
numbers in `Laptop Sale Sheet (1).xlsx`, #21–#36. Only #33–#36 are currently
for sale at the sheet's **Sale Price** amounts ($1,100, $900, $1,100, $1,100).
The other 12 have no public price or checkout URL until released. Their Stripe
links stay deactivated. Each stock number identifies one physical used machine.
Update the older deactivated Stripe product and link text to the current pickup
and refund policy before releasing any of those 12 machines.
The revised Stripe default prices for #21–#26 are $350, $300, $275, $375,
$350, and $350 respectively. Their older deactivated Payment Links still point
to the previous prices. Create replacement one-payment links at the new prices
and update the link IDs and URLs before releasing those stock numbers. The
inventory sync will reject a link whose price differs from the catalog.
The owner requested full details for each machine, including service tag,
cores/threads, the complete graphics description, weight, and dimensions.
The Latitude 5520 CPU model in the sheet appears truncated (`i7-118G7`);
the owner confirmed listing it as i7-1185G7. The first MSI row's weight differs
from the others, and its sheet value is shown as supplied.

## Battery reports

The current sheet supplies **Battery Details** for #33–#36, including measured
health percentages and estimated hours of use. The public cards show that text
exactly as supplied in the spreadsheet. No battery wattage or placeholder is shown.

## Stripe setup

Each stock number has a separate Stripe product, one-time USD price, and
Payment Link. The exact Stripe IDs and URLs are in
`scripts/laptop-stripe-links.json`; the catalog generator exposes only those
for #33–#36. Each active product is named with its model and stock number and
has its individual service tag, specifications, graphics, grade, and condition
in the description. Each link has one line item with fixed quantity one, adjustable
quantity off, and `restrictions.completed_sessions.limit: 1`. It collects
the customer's name and phone number. The website requires a Tuesday or
Thursday at 7 p.m., beginning November 19, 2026, with at least 24 hours of
lead time. It sends the chosen date to Stripe in the Payment Link
`client_reference_id` as `laptop-<stock>-pickup-<YYYYMMDD>`.
The owner confirmed a specific sales-tax exemption for these laptops and directed
that no tax be added; the listed price is the checkout total.
The owner also confirmed Windows 11 and factory charger. The current posted
policy allows the buyer to inspect and decline the laptop for a refund at the
scheduled pickup. Once the buyer accepts it and it is handed over, the sale is
final. There is no pre-purchase inspection, seller warranty, or technical support.
The site does not charge cards directly.

The owner connected Gmail for purchase notices to David and Parker and
Monday/Wednesday pickup lists. These automatic messages still need a payment
event receiver or equivalent paid-session reconciliation. The existing GitHub
Pages site and Stripe inventory read do not send those messages. The owner
chose to remove the stock-alert signup rather than manage the mailing list
manually; visitors should check the page for future listings.

The existing five-minute GitHub Actions workflow checks Stripe's native
completed-session counters. `sync-inventory.mjs` now reads the laptop catalog
too, and the laptop page reads the public stock snapshot. Stripe's one-session
cap protects direct checkout links even between website updates. A purchase
through another channel needs the matching Payment Link disabled or its cap
adjusted manually before the machine is handed over. A refunded checkout does
not automatically restore availability; inspect the machine and manually
reactivate or replace its link before offering it again.

## Model reference imagery

Photos show the model, not the actual used machine. Source image URLs are in
`scripts/prepare-laptop-assets.py`. The Latitude 5520 front and side-port views,
Precision 7550 front/closed composite, Precision 7670 front/lid/left/right views,
and MSI Prestige 14 front/closed/left/right views come from Dell and MSI assets.
The Precision 7560 front, rear/lid, left, and right views are official Dell
gallery images. Each model uses the same reference views across its individual
stock-number cards. The condition notes identify known cosmetic wear on the
individual machines.

The Stripe connector was unavailable, so the products and links were created
and verified in the owner's authenticated Stripe Dashboard. The product image
upload through browser automation was blocked by Chrome's file URL permission;
the site shows the model reference imagery while Stripe checkout uses the text
description. The Stripe connector must be reauthenticated before future API
changes through that connector.
