# Verification — 23 October 2026

## Automated and live checks

- Next.js production build and TypeScript checks passed.
- Ten unit tests passed: exact-passage recommendations; absent guide; mixed material, uncertainty, contamination, and special handling; rule conflicts; unsupported steps; streak uniqueness, gaps, yesterday grace, India-time boundary, and week length.
- Playwright Chromium fallback used because Browser plugin/skill was unavailable.
- Desktop 1440 × 1000 and mobile 390 × 844 checked; no mobile horizontal overflow or browser runtime errors.
- UI signup, cookie-backed session, JSON guide upload/review/save, navigation, description input, and history access control exercised. An unauthenticated second browser context received HTTP 401 for history.
- Keyboard ArrowDown opens custom guide dropdown; Escape closes it.
- Live Gemini 3.8 Flash identification succeeded. Missing guide correctly withheld disposal advice. Clean cardboard with the fictional test guide produced its exact supporting passage/category. Uncertain lined cup triggered a clarification and no recommendation. Corrections withdrew previous guidance.
- Live Gemini text-document rule extraction returned validated candidate rules. PDF code path is implemented but not separately exercised with a real campus PDF.
- Browser Tesseract OCR recognized “PAPER PACKAGING / RECYCLE LOCALLY” from an uploaded test image.
- The app's camera input is implemented; physical device capture has not been tested. A full 15–20-item demo with the actual locality guide is still needed.

## Visual review

Reference: `docs/design/wastewise-concept.png`, generated with built-in ImageGen. Inspected reference and final desktop/mobile Playwright screenshots with view_image. Reviewed white main canvas and pale neutral sidebar, forest-green/lime palette, typography scale, SVG scan illustration, upload/description actions, zero-state statistics/activity, spacing, custom guide selector, and responsive overflow. The final layout retains the concept's structure, with requested intentional changes: all borders/shadows removed, supported JPG/PNG/WebP copy, secondary text-input action, actual account/guide states, and fire-asset streak. Page transitions, dropdown reveal, SVG orbit/bottle motion, and flame motion honor reduced-motion preferences. No unexplained layout mismatches remain; the implementation was visually verified against this design direction with these intentional differences.

No benchmark or model accuracy claims are made. Identification latency is recorded per request. AI-generated guide extraction still requires comparing against the original document before use. Tests used fictional guides and separate QA accounts, not real disposal authorities or user photos.

Final streak layout check found and fixed narrow-screen overflow by reducing seven-day spacing at 480px and below. Rechecked final desktop/mobile screenshots with view_image: no horizontal overflow remains, dropdown keyboard behavior still works, and the supplied fire asset renders correctly.

## GSAP and Framer Motion update

Playwright checked that scanner SVG transforms change over time, all contextual SVG illustrations load, page navigation completes, dropdown exit animation preserves Escape behavior, and mobile layout has no horizontal overflow. Changing reduced motion at runtime stopped scanner transforms; no browser runtime errors were captured. Local-guides desktop and mobile screenshots were inspected with view_image. The supplied artwork is used intact; three supplied SVGs contain embedded raster imagery, so animation applies to their wrappers rather than inventing internal vector layers. `node tests/motion.mjs` repeats these checks against the local dev server.
