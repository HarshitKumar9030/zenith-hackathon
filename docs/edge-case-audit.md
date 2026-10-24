# Edge-case audit and UI follow-ups

24 October 2026. This is a focused audit, not a guarantee that every possible bug is eliminated.

## Fixed in this pass

1. **Rounded-zero net weight:** a tiny positive gross/tare difference could round to 0.000 kg. Operations now rejects it before pricing, allowance deduction or receipt creation.
2. **Duplicate helper payment reference across jobs:** reference reuse was checked only against the selected job. The check now covers all bookings in the resident account, under the existing revision-protected update. Cross-account reconciliation remains an Operations responsibility.
3. **Helper refresh failure:** a temporary network/server failure could make an approved helper look unapproved. The component retains its last loaded records and shows a refresh error; explicit access/sign-in failures still remove access.
4. **Sale preview rounding:** the preview previously rounded the proceeds-minus-costs expression, while the API rounds each amount separately. The preview now uses the same paise calculation.
5. **Opaque network errors:** service calls now distinguish network failure, non-JSON gateway errors and API validation errors. They bypass stale caches and never automatically retry mutations, which could duplicate a booking/payment record after an ambiguous response.
6. **Certificate download format:** the participation action now downloads a real landscape PDF, rather than JSON. It has the account-profile name, participation ID, issue date, activity snapshot, accepted organic pickup count and measured organic kg. The original JSON endpoint is retained for structured exports.
7. **Certificate name edge cases:** embedded licensed Noto fonts, Devanagari shaping runtime, control-character cleanup, empty-name fallback and long-name fitting avoid the Hindi font crash and normal long-name overflow. Tests cover English long names, Hindi, empty names and line breaks. Other scripts are not comprehensively verified.
8. **Temporary demo routes:** helper-layout and Operations preview pages were removed from application routes before the production build. Synthetic data is not shipped as a user dashboard.

## Requested UI work completed

- Helper graphs now have larger spacing between totals, descriptions, charts, legends and breakdowns.
- Helper collections has a separate sidebar page, item/locality/ID search, All/Available/In progress/Completed filters, numbered results and grid/list controls. Job acceptance and weighing remain there instead of cluttering the analytics dashboard.
- Operations has Collections, Payments, Helpers and Issues sections, searchable rows, a selected detail pane, contextual actions, readable payment breakdowns and separate recycling-sale disclosures. The sale preview explains recovery pool and resident share; it does not label that pool company profit.
- The sidebar plan summary is a compact card with live membership loading/error states and a clear Plans action. The landing page adds GSAP clip-path reveals to existing sections; keyboard focus clears clipping immediately and reduced-motion users skip the reveal.

## Verification and evidence

- **31 unit tests passed.** Added regressions include PDF generation with name edge cases and network/proxy/API failure handling.
- **Production build and TypeScript passed** after removing preview routes. The PDF font files appear in the participation route's production dependency trace.
- **Isolated MongoDB/API integration suite passed** with synthetic accounts and signed test webhooks, exercising role isolation, collector approval, once-daily points, atomic redemption, booking idempotency, competing claims, measured receipt acceptance, settlements, webhook replay/tampering and item removal/history restore. It created and removed its own QA database and server; no real payment gateway was charged.
- A separately archived committed source tree passed TypeScript before the last client-network patch; the final full working tree passed after it.
- PDF rendered through Poppler and visually inspected: one landscape page, readable name, metrics and ID, no overlap. Example evidence: `/tmp/waste-right-certificate.png` and `/tmp/waste-right-certificate.pdf` (synthetic layout record).
- Browser checks before browser access was disabled verified collection search, no-match/clear filters, active status filter and grid toggle; desktop/narrow chart spacing; Operations helper-pay payload (₹12.75→1275 paise), recycling-sale payload (₹100/₹30→10000/3000 paise), computed ₹70 pool and ₹7 resident share, Helpers section and issue-review panel. These used temporary synthetic preview routes whose actions only displayed payloads, with no database writes/transfers.
- Final browser control returned **Local browser use is disabled in Work settings**. Consequently the new landing clip reveals, final plan card, authenticated Operations navigation and final mobile Operations render were not freshly verified. Earlier tested previews had no console warnings/errors. Do not represent these remaining checks as passed.

## Material limits

Real camera/AI recognition, live bank transfers/refunds, actual government-support reconciliation, DigiLocker and government-issued credentials remain outside this validation. Government savings require recorded, externally completed resident credits; approval assumptions do not create money. Participation eligibility is based on completed organic receipts, not proof of downstream government processing. Certificate identity is self-entered account-profile information and the certificate is independently issued by Waste Right, not government-signed or Aadhaar-linked.

The existing Operations API caps loaded account documents at 100, so dashboards are not a complete historical financial export. Global cross-account uniqueness of external payment/support references is not enforced. Agreed helper pay and route economics still require field validation; no profitable margin is guaranteed. Pre-existing unrelated working-tree edits were preserved instead of included wholesale in this audit's commits. All commits contain six or fewer files.
