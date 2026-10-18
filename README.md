# Firebolt “Circuit Glow” Theme (One-page)

This is a darker, “PCB/circuit” aesthetic similar to the reference style you shared.

## Deploy (GitHub Pages)
- Push changes to `main`. The GitHub Actions workflow tests and deploys the site,
  including the latest Stripe stock count. Pages uses **Source: GitHub Actions**.
- See [SHOP_SETUP.md](SHOP_SETUP.md) for the restricted stock key and activation
  steps. Credentials are stored in Actions secrets, never in the website.

## Update gallery
- Put images in `assets/gallery/`
- Edit `assets/gallery.json`

## Update references
- Edit `assets/testimonials.json`

## Contact form
- The homepage embeds the existing Zoho Contact Us form. The special-run request
  page reuses that form after a required acknowledgement and adds a referral tag.
