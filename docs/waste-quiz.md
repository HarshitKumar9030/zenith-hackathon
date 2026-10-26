# EcoMitra photo quiz

Open `/quiz` (no sign-in required). The quiz is a standalone page and is not embedded in the dashboard. Each round samples five unique easy, two medium and three hard images, then shuffles their display order. Fresh sampling can legitimately repeat images across separate rounds; no image repeats within one round. The supplied bank contains 50 easy, 20 medium and 30 hard images.

Every image shows its cleaned-up filename as its name. Two custom, keyboard-accessible dropdowns collect waste type (biodegradable / non-biodegradable / recyclable) and material/category. Categories include the scanner's existing materials plus wood, rubber, ceramic, electronic, hazardous, sanitary and oil streams for items that cannot sensibly be labelled just plastic or glass.

Each answer earns one point: 20 maximum across 10 images. Both selections are required before continuing; Back retains answers. Results show total score, fully correct images, each missed image, both submitted answers, accepted alternatives and an explanation. Play a new round draws a new random set. Quiz scores do not award Discovery Points or pickup credits.

## Answer-key conventions

`web-app/src/lib/quiz-bank.json` explicitly maps all 100 supplied filenames to accepted types, categories and explanations. The quiz does not ask a model to improvise answers. This is an educational answer key using named-item assumptions, not a local collection guide or independently certified image dataset. The filename and photo do not prove contamination, exact polymer, certification or local recycling acceptance.

Biodegradable and recyclable overlap: clean uncoated paper/cardboard accepts both. A recyclable metal/glass item also accepts non-biodegradable. Specialist electronic and battery recovery is not household-bin acceptance. Certified compostable plastic requires specified processing conditions; a thermal receipt, aerosol, tea bag or contaminated container needs its stated assumptions. A tea bag accepts mixed material or food waste, recognising that the bag and contents differ. These explanations appear in the review.

Reference background: [EPA common recyclables](https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables) distinguishes container and other glass, plastic acceptance, and compostable plastics; [EPA household hazardous waste](https://www.epa.gov/large-scale-residential-demolition/household-hazardous-waste-and-demolition) supports separate handling for contaminated chemical/oil containers; [EPA battery FAQ](https://www.epa.gov/hw/lithium-ion-battery-recycling-frequently-asked-questions) explains separate battery recovery. These sources supply educational context, not Indian locality disposal rules. Image ownership/licence evidence was not supplied; keep the supplied files' provenance for public use.

Tests verify every asset exists, valid answer options, exactly 5/2/3 across 100 generated rounds, no duplicate questions, non-mutating selection, partial credit and overlap handling. No timer or external API is required.

## EcoMitra domain and QR

`https://ecomitra.harshit.page/` serves the landing page. `https://ecomitra.harshit.page/quiz` serves the standalone quiz; no host-specific root rewrite is used. Public page branding is EcoMitra. Existing internal database identifiers, native helper identifiers, certificate IDs and authentication domains are retained for compatibility.

Printable QR assets: `web-app/public/assets/ecomitra-quiz-qr.svg` and `.png`. They encode `https://ecomitra.harshit.page/quiz` with high error correction and a four-module quiet zone. The custom artwork uses rounded dark-green modules and finder frames, a centred leaf mark, a four-module quiet zone, and a high-contrast white code area. The standalone page provides a QR download link. DNS must point the new subdomain to Vercel before this QR destination works publicly.

Scanner results also show independent biodegradability and potential-recyclability properties, including unknown and mixed cases, at scan/group level. The provider supplies these within the same classification request. Legacy records remain readable; an identification correction invalidates the original environmental claims. Potential recycling is not a local acceptance guarantee.

Domain status checked 26 October 2026: attached to Vercel project `web-app`, but DNS is not configured. Cloudflare record required: CNAME `ecomitra` → `28aaf9280a8b06b7.vercel-dns-017.com` with proxy disabled (DNS only). Run `vercel domains verify ecomitra.harshit.page` after configuring it. No Cloudflare-authenticated connection was available in this session.

Verification: 73 unit tests and production build passed. A browser run completed all ten questions with exactly 5 easy / 2 medium / 3 hard and displayed the final score and per-answer mistakes. The host rewrite was checked locally with the ecomitra Host header. The rendered branded QR PNG was decoded independently and matched `https://ecomitra.harshit.page` exactly. Public DNS availability remains outstanding.

Provider compatibility fix: a live API comparison returned HTTP 400 for nested per-item environmental-property objects, while both the previous schema and group-only environmental labels returned HTTP 200. Environmental properties are therefore requested only at scan/group level; individual items retain their existing material and special-handling fields.

Final scanner verification: the actual production prompt and repaired schema processed a supplied banana-peel photograph successfully (HTTP 200, STOP, valid schema, food_waste, biodegradable) in 4195 ms. This is one compatibility smoke, not an accuracy benchmark. All 74 unit tests and the production build passed after the schema repair.

Scanner presentation: display one primary label, prioritising Special collection when handling requires it, then supported Recyclable, Biodegradable or Non-biodegradable properties. Unknown/mixed evidence stays internal and displays the concrete action Separate for sorting. It does not become a fabricated recycling or biodegradability claim. The helper sorts such items at collection.

Routing correction: the QR destination was updated to `/quiz` so the root URL can remain the EcoMitra landing page. Reprint the updated QR artwork rather than using the earlier homepage-targeting copy.

The single primary label is paired with a short fixed sorting instruction. Provider uncertainty prose is not repeated in the visible label panel; unknown evidence is retained in the saved record rather than presented as false certainty.

QR visual revision: a forest-green poster with EcoMitra leaf branding, a centred code mark, rounded modules/finder frames and a lilac Scan to play call to action. PNG size is 1000 × 1360; SVG remains scalable. Independent decoding confirmed the exact `/quiz` URL at rendered widths of 1000, 600, 400 and 300 pixels.
