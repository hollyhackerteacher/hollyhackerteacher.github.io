# Used laptop shop

The page at `/shop/laptops/` reads `assets/laptops.json`. It lists the 16 stock
numbers in the owner's sale sheet, #21–#36, using **Suggested List** prices as
the owner selected. Each stock number identifies one physical used machine.
Serial numbers remain out of the public site. The Latitude 5520 CPU model in the
sheet appears truncated (`i7-118G7`), so the page says only 11th Gen Core i7
until the exact chip is verified. The first MSI row's weight differs from the
others; weights are omitted from the page.

## Stripe setup

Create a separate live Stripe product, one-time USD price, and Payment Link for
each stock number. Name each product with the model and stock number, include
RAM, storage, GPU, grade, and the individual condition note in its description,
and keep the serial in private Stripe metadata if useful for fulfillment. Each
link must have one line item with fixed quantity one, adjustable quantity off,
and `restrictions.completed_sessions.limit: 1`. State local pickup Thursday
at 6:30 p.m. outside Room 402 at Ensign College, 95 N 300 W, Salt Lake City.
The owner confirmed a specific sales-tax exemption for these laptops and directed
that no tax be added; the listed Suggested List price is the checkout total.
The owner also confirmed Windows 11, factory charger, no pre-purchase inspection,
no seller warranty, and a 3% fee on change-of-mind refunds requested at pickup
before taking the laptop. Add the IDs and link URL to the matching object in
`assets/laptops.json`. Verify every Stripe price matches `priceInCents` and each
link is live before publishing. The site does not charge cards directly.

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
Precision 7550 front/closed composite, Precision 7670 front and port view, and
MSI Prestige 14 front/closed/left/right views come from Dell and MSI assets.
The Precision 7560 front/closed composite is a Dell product render hosted by
Laptop88. Each model uses the same reference views across its individual
stock-number cards. Buyers should request photos of the actual unit to inspect
cosmetic wear.

The Stripe connection must be reauthenticated before products and Payment Links
can be created and verified. Do not publish checkout buttons before that step.
