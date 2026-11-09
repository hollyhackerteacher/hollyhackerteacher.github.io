# Used laptop shop

The page at `/shop/laptops/` reads `assets/laptops.json`. It lists the 16 stock
numbers in the owner's sale sheet, #21–#36, using **Suggested List** prices as
the owner selected. Each stock number identifies one physical used machine.
The owner requested full details for each machine, including service tag,
cores/threads, the complete graphics description, weight, and dimensions.
The Latitude 5520 CPU model in the sheet appears truncated (`i7-118G7`);
the owner confirmed listing it as i7-1185G7. The first MSI row's weight differs
from the others, and its sheet value is shown as supplied.

## Stripe setup

Each stock number has a separate live Stripe product, one-time USD price, and
Payment Link. The exact Stripe IDs and URLs are in
`scripts/laptop-stripe-links.json`; the catalog generator merges them with the
sale sheet. Each product is named with its model and stock number and has its
individual service tag, specifications, graphics, grade, and condition in the
description. Each link has one line item with fixed quantity one, adjustable
quantity off, and `restrictions.completed_sessions.limit: 1`. Stripe Dashboard
showed the links active, unused, and limited to 0 of 1 payments. It collects
the customer's name and phone number and states local pickup Thursday
at 6:30 p.m. outside Room 402 at Ensign College, 95 N 300 W, Salt Lake City.
The owner confirmed a specific sales-tax exemption for these laptops and directed
that no tax be added; the listed Suggested List price is the checkout total.
The owner also confirmed Windows 11, factory charger, no pre-purchase inspection,
no seller warranty, and a 3% fee on change-of-mind refunds requested at pickup
before taking the laptop. The site does not charge cards directly.

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
stock-number cards. Buyers should request photos of the actual unit to inspect
cosmetic wear.

The Stripe connector was unavailable, so the products and links were created
and verified in the owner's authenticated Stripe Dashboard. The product image
upload through browser automation was blocked by Chrome's file URL permission;
the site shows the model reference imagery while Stripe checkout uses the text
description. The Stripe connector must be reauthenticated before future API
changes through that connector.
