# WasteWise research and implementation decisions

Researched 23 October 2026. Scope: one campus/locality and its supplied disposal guide; a demonstration of 15–20 everyday objects, uncertainty, correction, and history. This document distinguishes published information from our design decisions. Research is context, never a replacement for the supplied local guide.

## Identification and document understanding

Google lists `gemini-3.8-flash` with text, image, video, audio, and PDF inputs. We use it for image/text identification and candidate-rule extraction from PDF/text, with a configurable server-side model ID. Structured outputs constrain JSON shape; Zod additionally validates returned content. Neither schema validation nor a model response establishes factual correctness. Google-generated confidence is not treated as a calibrated probability.

Sources: [Gemini 3.8 Flash model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

Implementation: Gemini identifies materials and uncertainty, but cannot author final disposal recommendations. The deterministic rule matcher requires one matching rule, an exact passage in the supplied source text, and compatible clean/single-material or special-handling conditions. Ambiguity, mixed materials, unknown handling, contamination, or conflicts withhold ordinary recommendations. Extracted PDF text is model-generated and can be wrong; the user must compare candidate passages with the original before saving. Full semantic rule verification remains a human review task. No unsupported preparation steps are accepted.

## Packaging OCR

Tesseract.js runs in browsers and Node through WebAssembly and workers. We load it only when requested, recognize English packaging text, let users edit the result, and terminate the worker afterward. OCR is supporting evidence; it cannot establish whether a lining is present, contamination is absent, or local facilities accept a material. Worker/language assets require internet on first use; OCR is not guaranteed offline.

Source: [Official Tesseract.js repository and usage](https://github.com/naptha/tesseract.js).

## Why local rules and special handling matter

EPA guidance directs residents to check local programs and distinguishes batteries from ordinary recyclables. Its battery guidance says lithium-ion batteries should not enter household garbage or recycling bins because of fire risks. This supports our decision to preserve special handling and avoid forcing every object into wet/dry categories. EPA guidance is US-specific context; it is not an authoritative disposal guide for an Indian campus or municipality. The application does not inject these rules into a local recommendation.

Sources: [EPA common recyclables](https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables), [EPA used household batteries](https://www.epa.gov/recycle/used-household-batteries).

## Local storage and authentication

MongoDB recommends reusing a MongoClient because each represents a connection pool. We reuse one process-wide client, store per-user history and guides, and scope every query by the authenticated user. Passwords use random salts and Node scrypt. Random session tokens are hashed in MongoDB; browser cookies are HttpOnly, SameSite=Lax, and Secure in production. Session expiry is checked at request time in addition to a TTL index. There is no email verification/password recovery in this local hackathon scope. Do not expose an unauthenticated local MongoDB instance to a network.

Sources: [MongoDB Node connection pooling guidance](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/), [Node crypto scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

## Design and product decisions (our inferences)

- No borders or shadows: surfaces, whitespace, typography, and accessible focus outlines establish hierarchy.
- Zero-state metrics are calculated from stored history; no fabricated CO₂ savings, recycling rates, or model accuracy.
- Photos are sent to Gemini on an explicit identification action and are not stored locally or reused for training. Descriptions, OCR text, results, corrections, and guide references are saved to private history.
- An uncertain result asks a short question. A correction withdraws previous disposal guidance and requires reassessment.
- The custom classifier is unavailable until trained. Gemini/OCR do not substitute for evaluated custom-model metrics.
- Demo candidates: PET bottle, detergent bottle, yogurt tub, plastic wrapper, newspaper, receipt, paper bag, cardboard box, egg carton, glass jar, glass bottle, aluminium can, food tin, foil, banana peel, food leftovers, lined cup, milk carton, battery, and unclear/multiple-item photograph. Expected outcomes depend on the actual supplied guide; no universal disposal labels are prefilled.

## Daily streak

The optional habit feature counts distinct calendar days with saved identifications, using Asia/Kolkata. Multiple scans in one day count once. Yesterday's streak remains active until today ends; a missed full day resets it. The last seven days reflect actual database history across all records, not the dashboard's 200-record display limit. Deleting history can change this history-derived streak. A scan is not evidence that an item was actually recycled, so this feature does not claim diversion or environmental impact.
