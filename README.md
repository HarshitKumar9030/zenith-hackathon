# zenith-hackathon

WasteWise — an AI-powered waste identification and disposal assistant for the Zenith hackathon.

## Repository structure

- `web-app/` — application code.
- `model/` — reserved for model experiments and integration if needed.
- `docs/` — project documentation, setup notes, and decisions.
- `data/scraper/` — image collection scripts and configuration.
- `data/datasets/` — local image downloads and annotations (excluded from Git).

Dependency manifests currently live at the repository root.

## Image collection

See [scraper setup and usage](data/scraper/README.md). Collection labels are unverified candidates that require review before training.
