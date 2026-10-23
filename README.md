# zenith-hackathon

Waste Right — a camera-assisted waste collection platform for the Zenith hackathon.

## Repository structure

- `web-app/` — application code.
- `model/` — reserved for model experiments and integration if needed.
- `docs/` — project documentation, setup notes, and decisions.
- `data/scraper/` — image collection scripts and configuration.
- `data/datasets/` — local image downloads and annotations (excluded from Git).

Application dependencies and scripts live in `web-app/`.

## Image collection

See [scraper setup and usage](data/scraper/README.md). Collection labels are unverified candidates that require review before training.

## Web application

Waste Right includes resident and bilingual helper dashboards, local MongoDB authentication, multi-item camera scanning, browser OCR, confirmed checklists, collection receipts, reward points, locality leaderboards and an optional Razorpay integration. Checkout is unconfigured; local-guide controls have been removed. See [web app setup](web-app/README.md), [research](docs/research.md), and [verification](docs/verification.md).

```sh
cd web-app
npm ci
# Configure .env.local using .env.example and start local MongoDB.
npm run dev
```
