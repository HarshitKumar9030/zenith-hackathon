# Rewards, billing and history UI verification

24 October 2026. The flow under test is: authenticated dashboard → Rewards / Plans / My history → redeem points, inspect benefits, search payment records or switch history tabs → real account state and owner-only records.

## User-visible changes

- Rewards uses a clear points card, pickup-credit card, three short steps and separate activity/locality cards. The savings and participation detail is collapsed initially. Plants and the isometric collection truck animate only while visible, pause in a hidden document, and respect reduced motion. Truck tyres stay aligned; only their inner spokes rotate.
- Benefits use three separate values: Waste Right fee reductions, included segregation comparison value and actual government benefits (currently ₹0). The independent participation record has a clear locked state until a completed, measured organic collection qualifies. Copy/download controls appear only after issuance; an explanation disclosure keeps detailed accounting out of the main card.
- Plans shows plan comparisons and payment records without duplicating the Rewards/benefits component. Payments show date, amount and readable paid/pending/failed/refund status. Expand a row for transaction IDs and any refund amount. Search appears above more than four records; empty and no-match states are distinct. Download returns an authenticated owner-only JSON payment record, explicitly not a tax invoice.
- Pickups focuses on booking. Collection receipts, balances, cancellation, resident acceptance and weighing/material disputes live under **My history → Receipts & disputes**. Completed records are collapsed; outstanding reviews/disputes are easier to find.
- My history switches between **Scans** and **Receipts & disputes** using a Framer Motion selection highlight and directional fade/slide transition. Only one panel is rendered after a switch. ARIA tabs/panels, roving focus, Left/Right/Home/End navigation and reduced-motion support are included.
- Gold/Platinum allowance pickups include segregation. Basic/reward sorting remains based on helper-measured weight. Historical receipts are not rewritten.

## Environment and checks

Local isolated Next.js instance: `http://localhost:3108/app?view=Rewards`; internal navigation changes the visible dashboard view without rewriting this existing query string. Browser automation used CUA's in-app-browser APIs, including its scoped Playwright locators; no independent Playwright browser was launched. The separate Browser plugin was not available. Desktop 1440×1100 and mobile 390×844 were inspected.

The test server used a dedicated temporary MongoDB database with synthetic resident/helper accounts, fake payment records and no provider credentials. The normal application database, real payments and resident identity data were not changed by QA.

| Check | Result |
| --- | --- |
| Page identity, meaningful content and no framework overlay | Passed |
| Fresh-tab console errors/warnings on tested routes | None |
| Desktop/mobile clipping and horizontal overflow | Passed; mobile document width matched 390px viewport |
| Rewards redemption | 12 → 2 points; 1 → 2 credits; activity updated; insufficient-points button disabled |
| Participation UI | Locked without an accepted organic receipt; issued after qualifying completion; ID copy confirmed |
| Participation APIs | Unauthenticated 401; ineligible download 409; stable concurrent issuance; distinct owner IDs; disputes relock; private downloads |
| Payment UI | Paid, partially refunded, pending and failed states; expanded refund amount; transaction-ID search; no-match state |
| Payment download API | Owner success/private attachment; unauthenticated 401; another owner/unknown order 404; missing order 400 |
| History tabs | Pointer selection, ArrowLeft and End switching, correct selected state/panel/focus |
| Receipt disputes | Resident report changed a synthetic record to disputed; helper could not accept another resident's receipt |
| Plan/pickup organisation | Plans has no duplicate participation panel; Pickups has no collection-record/dispute section |
| TypeScript | Working tree and separately archived committed source passed |
| Unit tests | 27 passed |

Reduced-motion and offscreen-pause branches were reviewed in code; OS-level reduced-motion switching was not independently exercised. Downloads were verified through authenticated HTTP, while the browser verified their owner-scoped links. Camera recognition, live checkout, bank refunds and DigiLocker retrieval were not exercised in this focused UI task. DigiLocker is deliberately unconfigured pending approved requester onboarding; see [setup requirements](digilocker-identity-setup.md).

## Reference comparison

A generated Rewards concept was used as a visual reference; final desktop and mobile renders were inspected against it.

| Reference evidence | Rendered evidence / decision |
| --- | --- |
| Large dark-green heading, white canvas | Retained; existing brand font and sidebar kept for consistency |
| Sage points card and lavender credit card in a wide/narrow grid | Implemented with shared baseline and aligned actions; cards stack on mobile |
| Decorative ten-dot progress track | Replaced with a real accessible progress indicator reflecting actual points |
| Plant and 3D truck illustrations | Implemented as native SVG with contained movement; tyre geometry corrected |
| Three steps, two secondary cards and collapsed benefit detail | Implemented; actual redemption/activity data and opt-in locality messaging replace concept placeholders |

Evidence screenshots were saved outside Git: `waste-right-rewards-final.png`, `waste-right-participation-final.png`, `waste-right-payment-receipts.png`, `waste-right-payment-receipts-mobile.png`, `waste-right-participation-mobile.png`, `waste-right-history-tabs.png`. QA tabs, viewport overrides, temporary server, copied source and isolated database were cleaned up after inspection. Application credentials, screenshots, dependencies and generated datasets remain outside commits.
