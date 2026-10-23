# WasteWise: Camera-First Community Collection

## The idea

A shared smart waste station for one apartment complex or campus. Residents place waste under a fixed camera, confirm an AI-generated checklist, and receive a timestamped submission receipt. A scale records weight; collection partners verify materials before downstream processing.

The camera is the main entry point: it detects new submissions, suggests visible materials, reads packaging with OCR, flags uncertainty, and helps residents segregate waste. It cannot identify hidden contents or establish weight by itself.

## Proposed plans

Pilot prices and limits, subject to measured operating costs:

| Plan | Price | Included service | Resident recovery payout |
|---|---:|---|---|
| Basic | ₹20 per submission | Up to 2 kg of segregated waste at the shared station | None, disclosed before confirmation |
| Gold | ₹600/month | 14 station submissions; up to 8 kg each and 112 kg/month | 10% of positive net recovery proceeds attributable to accepted material |
| Platinum | ₹700/month | 24 station submissions; up to 10 kg each and 240 kg/month | 15% of positive net recovery proceeds attributable to accepted material |

These are **station submissions, not individual doorstep trips**. Building-route collections consolidate multiple households. Larger allowances distinguish subscriptions from Basic, whose 2 kg limit makes a direct per-visit comparison misleading. Metal counts toward limits; bulky items and batteries/e-waste need a separate specialist quote. Frequent organic collection requires its own building arrangement.

The payout percentages are proposed starting points, not validated offers. Gold/Platinum payouts depend on actual accepted recovery value, not AI estimates or total wet-waste weight.

## Segregated and unsegregated service

- **Segregated:** Standard plan pricing for correctly separated, accepted materials.
- **Unsegregated:** AI first offers sorting guidance. If staff must sort it, show an additional handling quote and obtain consent before acceptance.
- Uncertain or concealed contents require inspection. Hazardous items never enter ordinary mixed-waste handling automatically.

## Submission flow

1. Resident scans a QR code to identify their account.
2. A camera event triggers image analysis and OCR.
3. Resident confirms or edits the material checklist and answers any clarification.
4. The scale captures weight; the system checks plan limits and displays any charge.
5. Resident confirms the submission. The receipt records time, weight, materials and applicable local-guide instructions.
6. The collector verifies handover; processor acceptance determines the final recovery settlement.

Use event-triggered analysis rather than sending every video frame to an AI API. Aim cameras only at the submission surface, restrict access, and define consent and image-retention policies.

## How WasteWise earns

**Income:** Basic charges + subscriptions + retained recovery proceeds + any contracted building station fee.

**Expenses:** Guaranteed collector pay, transport, sorting, processing, rejected-material handling, hardware, connectivity, AI, support and taxes.

**Profit = retained income − all operating expenses.** No resident payout on Basic does not make ₹20 pure profit. Calculate recovery proceeds after documented, agreed direct deductions; never charge the same expense twice. Pay collectors for completed work, with optional recovery bonuses.

## Dashboards

- **Resident:** Live confirmation checklist, plan usage, receipts, upcoming collection windows, estimated/pending/settled earnings and disputes.
- **Collector:** Consolidated station route, verified weights, material corrections, handovers, guaranteed pay and bonus status.
- **Operations:** Station activity, revenue, costs, processor acceptance and settlement audit trail. Any locality leaderboard uses opt-in aliases and rewards verified segregation rather than generating more waste.

## Pilot decision

Test one building before promising these prices broadly. Measure cost per consolidated collection, sorting labour, full-capacity subscription cost and customer willingness to pay. Platinum offers substantially more capacity for only ₹100 extra; keep ₹700 only if measured costs support it, otherwise raise its price or reduce entitlement.

**Positioning:** “Place it. Confirm it. We collect it.” AI removes repeated entry and sorting effort; people verify the material, weight and value.
