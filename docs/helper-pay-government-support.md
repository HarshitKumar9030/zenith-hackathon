# Helper compensation and resident support

24 October 2026. Basic remains **₹10, up to 2 kg for every material**. The briefly requested 5 kg organic exception was withdrawn and is not implemented. Gold/Platinum limits remain 8/10 kg.

## Pilot helper policy

Completed resident-accepted pickups earn ₹8 base work compensation, plus 50% of the sorting service value (actual sorting fee for Basic/rewards; recorded included-sorting comparison value for membership), plus 40% of positive recorded net recovery proceeds. Pending/disputed/cancelled work does not accrue payable compensation. The dashboard shows earned, recorded paid and outstanding separately, with per-job values. Recovery proceeds must be real, and Operations must include applicable collection, sorting, transport and processing costs in the direct-cost ledger before calculating net recovery; do not count these costs twice or treat gross sales as net profit.

Operations can record actual payments only after completion. Amounts below the outstanding entitlement, duplicate payment references and payments when nothing is outstanding are rejected. Subsequent recovery settlements may create an additional balance; payment history is retained rather than discarding earlier payment records. These are accounting records, not automated bank transfers. No new banking/payout provider has been configured.

This is a configurable pilot policy, not proof of a fair hourly income or profitable operation. Measure route time, travel, safety equipment and actual hourly earnings before scaling. At ₹10 collection revenue and ₹8 base helper pay, only ₹2 remains **before all other costs**. Membership revenue and verified recovery can contribute, but neither grant eligibility nor projected compost sales establish a margin. The company bears deficits; they must not be silently deducted from agreed helper pay.

## Government assistance

The owner asked to model approval as an assumption and selected a resident share of **50% of attributable support actually received**. This is a business assumption; Waste Right's earlier confirmed partnership status remains proposed/applying until evidence is supplied. No government-issued credentials, guaranteed subsidies or automatic Aadhaar linkage are claimed.

The Department of Fertilizers' 10 March 2026 statement describes MDA of **₹1,500 per metric tonne of eligible FOM/LFOM/PROM**, not household waste collected. ₹1,500/tonne is ₹1.50/kg of eligible fertiliser; half would be ₹0.75/kg of eligible output, before considering actual eligibility and attribution. Do not multiply household pickup kg by this rate. The original guideline period was FY2023–24 to FY2025–26; current programme terms and the recipient's entitlement must be confirmed before an operational claim. [Official March 2026 statement](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2237444&lang=2&reg=48), [MDA guidelines](https://gobardhan.sbm.gov.in/whats-new/Market-Development-Assistance-Guidelines.pdf).

`POST /api/government-benefits` is an Operations-admin-only accounting endpoint. It records externally received support and an **already completed** resident credit; it does not transfer funds or verify a government document. Required fields: `residentId`, `pickupId`, `receivedPaise`, `receiptReference`, `processorReference`, `residentCreditReference`. It requires a completed, measured organic pickup, stores the recording actor/time, calculates `floor(receivedPaise / 2)` as the resident credit, and prevents overwriting the pickup or reusing receipt/credit references within that account. Operations must reconcile a shared programme payment across accounts; this is not an automated programme reconciliation system. Never submit this endpoint based on projected support alone.

Savings displays count this recorded credit only while the organic pickup remains completed and not excluded by a refund/review. Unsupported/malformed records contribute zero. Ordinary fee reductions stay labelled as Waste Right benefits, separate from government credits. No credit appears merely because the business assumes programme approval.

## Helper welfare and UI

The helper dashboard links to official **NAMASTE** information: identified/validated waste pickers may receive occupational safety training, PPE and health-insurance/other support under the scheme's requirements. A Waste Right signup does not confer eligibility. [Department of Social Justice and Empowerment](https://socialjustice.gov.in/schemes/37-0).

English/Hindi analytics show seven days of recorded payments by India payment date and completed weight by pickup date, with accessible expandable daily breakdowns. Old payments lacking a timestamp are omitted from the graph. Totals describe the jobs returned by the existing Operations endpoint (currently capped at 100 account documents), not an unlimited financial export. Cards use borderless sage/lavender surfaces, larger controls and reduced-motion-aware chart entrances.

## Verification

29 unit tests pass, including completed-work compensation, sorting/recovery allocation, outstanding balances and government credit validity. TypeScript passed. A temporary UI-only route used explicitly synthetic jobs without changing MongoDB or calling a payment provider: it displayed ₹32.50 earned, ₹24.50 outstanding, ₹8 recorded payments and 7 kg, and its daily breakdown opened correctly. Browser console was clear. Desktop and a narrow viewport were visually inspected. The temporary preview was removed after inspection.

Live helper bank transfers, staff recording of real support and government eligibility have not been exercised or verified. No actual government or resident financial data was invented for the UI test.
