# WasteWise web app

Next.js App Router + TypeScript, local MongoDB, Gemini 3.8 Flash, and browser Tesseract OCR. Borderless and shadow-free responsive dashboard with animated SVG, custom keyboard-accessible dropdowns, image/text identification, PDF/text/JSON guide import, clarifications, corrections, private history, search/filter/export, and account management.

## Local setup

```sh
cd web-app
npm ci
cp .env.example .env.local
# Set GEMINI_API_KEY locally. Never commit it.
# Start MongoDB on localhost:27017 (an existing local instance works).
npm run dev
```

Open http://localhost:3000. Create an account with a password of at least ten characters. Local signup does not require an email provider. Database defaults to the separate `wastewise` database; existing databases are not changed. MongoDB indexes are created on first connection. Configure MONGODB_URI/MONGODB_DB for another instance. Supabase is deferred by request.

1. Import your locality's actual guide under Local guides. Gemini extracts candidate rules from PDF/TXT; compare source text and every rule with the original before saving. Alternatively upload reviewed JSON using the downloadable fictional format example. That example is not a real disposal authority.
2. Select the guide, then upload a photo or write a description. Optionally read packaging text with OCR. OCR output is editable.
3. Identify, answer any clarification, and inspect supporting source text and preparation steps. Results save automatically. Correct materials in the result or delete individual history records. Export covers the most recent 200 loaded records.

Without a Gemini key, account/history/JSON-guide features work and identification reports configuration missing. No mock AI answers are used. The custom classifier is not trained or called yet. Without a matching reviewed guide, disposal guidance is withheld.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

API: `POST /api/auth/signup`, `/api/auth/login`, `/api/auth/logout`; `GET /api/auth/session`; `POST /api/classify`; `GET/PATCH/DELETE /api/history`; `GET/POST /api/guides`; `POST /api/guides/extract`. Authentication uses an HttpOnly cookie. All private data queries use the session's owner ID, never a submitted owner ID.

Model responses use structured output plus server validation. Requests have size/field limits, upstream timeouts, auth attempt limits, 100 identifications/day/user and 10 document extractions/day/user. This is a local hackathon app: public deployment needs TLS, MongoDB access controls, email verification/recovery, broader abuse prevention and operational monitoring. Rule matching deliberately covers explicit clean/single-material and special-handling rules; more complex conditions require clarification and schema extension. Human source review is necessary for model-extracted PDF content.

Research: [sources and rationale](../docs/research.md). Design reference: [concept](../docs/design/wastewise-concept.png).

## Daily habit

The dashboard's fire SVG streak counts distinct saved-identification days in Asia/Kolkata and shows a seven-day activity strip. Multiple scans count once; deleting history can change the streak. It measures using the assistant, not confirmed recycling. Page, control, scan, and flame animations respect reduced motion.

Browser smoke check: `node tests/smoke.mjs` with the app running on port 3001, or set `TEST_BASE_URL`. It creates a QA account and fictional guide. Live verification details and remaining demo checks are in [verification](../docs/verification.md).

## Motion and artwork

GSAP handles scan/orbit motion and gentle movement of the supplied assets. Framer Motion handles page enter/exit, dropdown exits, and result reveals. Artwork appears with guide import (education), empty history (people), uncertain identification (question mark), and in-progress identification (hourglass). Both libraries honor reduced motion; illustration loops pause offscreen and when the tab is hidden. Run `node tests/motion.mjs` while the app serves on port 3001, or set `TEST_BASE_URL`.

Sidebar navigation now uses a shared-layout spring indicator, staggered entrances, icon feedback, and a one-time SVG leaf drawing. Main sections reveal in sequence via GSAP. Keyboard focus remains visible and all spatial effects honor reduced motion.
