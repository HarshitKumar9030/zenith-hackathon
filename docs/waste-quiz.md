# Waste Right photo quiz

Open `/quiz` (no sign-in required), or Waste quiz in the resident sidebar. Each round samples five unique easy, two medium and three hard images, then shuffles their display order. Fresh sampling can legitimately repeat images across separate rounds; no image repeats within one round. The supplied bank contains 50 easy, 20 medium and 30 hard images.

Every image shows its cleaned-up filename as its name. Two custom, keyboard-accessible dropdowns collect waste type (biodegradable / non-biodegradable / recyclable) and material/category. Categories include the scanner's existing materials plus wood, rubber, ceramic, electronic, hazardous, sanitary and oil streams for items that cannot sensibly be labelled just plastic or glass.

Each answer earns one point: 20 maximum across 10 images. Both selections are required before continuing; Back retains answers. Results show total score, fully correct images, each missed image, both submitted answers, accepted alternatives and an explanation. Play a new round draws a new random set. Quiz scores do not award Discovery Points or pickup credits.

## Answer-key conventions

`web-app/src/lib/quiz-bank.json` explicitly maps all 100 supplied filenames to accepted types, categories and explanations. The quiz does not ask a model to improvise answers. This is an educational answer key using named-item assumptions, not a local collection guide or independently certified image dataset. The filename and photo do not prove contamination, exact polymer, certification or local recycling acceptance.

Biodegradable and recyclable overlap: clean uncoated paper/cardboard accepts both. A recyclable metal/glass item also accepts non-biodegradable. Specialist electronic and battery recovery is not household-bin acceptance. Certified compostable plastic requires specified processing conditions; a thermal receipt, aerosol, tea bag or contaminated container needs its stated assumptions. A tea bag accepts mixed material or food waste, recognising that the bag and contents differ. These explanations appear in the review.

Reference background: [EPA common recyclables](https://www.epa.gov/recycle/how-do-i-recycle-common-recyclables) distinguishes container and other glass, plastic acceptance, and compostable plastics; [EPA household hazardous waste](https://www.epa.gov/large-scale-residential-demolition/household-hazardous-waste-and-demolition) supports separate handling for contaminated chemical/oil containers; [EPA battery FAQ](https://www.epa.gov/hw/lithium-ion-battery-recycling-frequently-asked-questions) explains separate battery recovery. These sources supply educational context, not Indian locality disposal rules. Image ownership/licence evidence was not supplied; keep the supplied files' provenance for public use.

Tests verify every asset exists, valid answer options, exactly 5/2/3 across 100 generated rounds, no duplicate questions, non-mutating selection, partial credit and overlap handling. No timer or external API is required.
