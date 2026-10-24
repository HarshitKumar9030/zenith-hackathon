# Waste Right

Phone-camera waste scanning, resident pickups and a separate Hindi/English collection-partner workspace. Next.js, TypeScript, local MongoDB, Gemini, browser Tesseract OCR, GSAP and Framer Motion. Indigo accent, no borders or shadows.

## Run locally

```sh
cd web-app
npm ci
cp .env.example .env.local # only for a fresh setup; preserve existing credentials
npm run dev -- --port 3001
```

Start MongoDB separately. Set `MONGODB_URI`, `MONGODB_DB` and `GEMINI_API_KEY` privately. `GEMINI_MODEL` is configurable. The local default database is `wastewise`; existing databases are not modified. Camera and device location need HTTPS or localhost on the device being used.

## Accounts and workflows

Choose **User** or **Helper** at signup. Helper accounts open a separate workspace with collection jobs, earnings and service-area pages, without resident scan/plan/reward navigation. Helpers require Operations approval to accept jobs. English/Hindi selection persists locally. Normal accounts cannot grant themselves collector or administrator privileges.

After confirming a scan, an inline pickup form opens immediately with the saved address, tomorrow’s date and an editable 9 am pickup time. Available plan/credit options are loaded automatically; payment requirements still apply; the price is calculated automatically. Users can scan several visible items, uncheck mistaken detections, correct the overall material/condition, confirm and save. Images are not retained. OCR is optional. Automatic scanning waits 15 seconds after each completed analysis, with eight automatic frames per session. Stop, navigation, hidden tabs and confirmation stop the camera. Confirmed scans remain in history; unconfirmed previews expire after 24 hours. Local-guide controls have been removed. Legacy guide endpoints remain for historical records; the app does not invent local disposal rules.

Both account types have **Use my location**: an explicit browser permission request obtains and saves a single GPS fix, accuracy and timestamp. No continuous tracking or external reverse-geocoding call occurs. Users provide street address and locality separately. Booking coordinates and addresses are revealed to a helper only after assignment. Locality leaderboards use an opt-in alias, not coordinates or full addresses.

Confirming a new identifiable scan earns at most one point per India calendar day. Ten points redeem one Basic pickup credit, at most twice per month. Re-confirming an old scan does not earn a new day's point.

Collectors claim scheduled jobs, enter gross/container weights and send a measured receipt. Residents approve or dispute it. Operations approves collectors, manages legacy quotes, records actual work payments, and records buyer proceeds, direct costs and recovery payouts. Payout references are operator records, not automated bank transfers. Dashboard values come from saved activity, not sample earnings.

## Pilot pricing and payments

Basic: ₹10 per pickup, 2 kg, no resident recovery share. Gold: ₹399, 14 pickups × 8 kg (112 kg/month), 10% of positive net recovery. Platinum: ₹469, 24 pickups × 10 kg (240 kg/month), 15%. Gold/Platinum prices and pickup counts follow the requested model; Basic weight allowance and recovery percentages are configurable pilot defaults in `src/lib/catalog.ts`. Weight allowances apply to total measured waste, including metal. Excess measured weight costs ₹3/kg. Ordinary unsegregated collections are priced automatically. Requests needing special handling cannot use instant booking.

Razorpay test credentials are configured privately on this workstation and accepted by the provider. It does not simulate payment success. Optional private configuration: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Configure the webhook at `/api/payments/webhook` for `payment.captured` and `refund.processed`. Orders use server pricing and stored booking ownership. Captures require signature and amount/currency validation, with idempotent entitlement fulfillment. Monthly passes are manually renewed; no automatic recurring debit is advertised. The credential read check succeeded; a completed provider checkout/refund has not been verified. Webhook delivery still requires a public HTTPS URL configured in Razorpay.

Operations requires both the email in `ADMIN_EMAILS` and `adminApproved: true` on the existing MongoDB user. The existing `harshitkumar9030@gmail.com` account has been approved locally. Other signups do not become administrators automatically. Email verification/recovery is not implemented in this local hackathon build.

## Verification

```sh
npm run typecheck
npm test
npm run build
QA_SKIP_BROWSER=1 node tests/service-integration.mjs
```

Integration checks start a temporary production server and use/drop a separate QA database. They exercise auth, role isolation, batch selection, location validation/privacy, concurrent reward and booking updates, collection claims/receipts, settlement records and signed synthetic payment webhooks. Playwright checks resident/helper navigation, Hindi, geolocation and mobile overflow. Real camera/AI and bank transfers require separate live-device/provider checks.

The scraper remains stopped and custom-model training remains deferred. See [verification](../docs/verification.md) and [research](../docs/research.md).

## Pickup times and evening surcharge

Users choose any minute from 7 am to before 2 pm, or from 5 pm through 7 pm, in Asia/Kolkata. No pickups can be requested during the 2–5 pm break; both browser and API validate the chosen time. Older records retain their original windows.

Basic pickup is ₹10 for separated or unsegregated waste. Basic and reward pickups add ₹5 per helper-measured kg for unsegregated waste. Gold/Platinum allowance pickups include segregation with no sorting fee. Residents never enter a weight. Evening surcharge is ₹5 plus ₹1 for unsegregated waste before collection; a further ₹1 applies after weighing if above 2 kg (maximum ₹7). Membership/reward cover the base pickup fee. Membership also waives the unsegregated evening-surcharge component; applicable time/weight evening fees remain. Initial fees are paid before scheduling. The helper records actual gross/tare weights, the resident approves the receipt, and additional charges and weighing disputes are handled in My history → Receipts & disputes. Monthly weight allowance is decremented using measured weight. Historical estimated-price bookings retain their original pricing version. Cancelling an unpaid booking restores reserved credits; full recorded refunds restore an uncollected reservation.

## Simpler resident experience

The first visit opens a short, skippable guided tour, with a separate helper tour. Help replays it and explains fees, service hours, editing and payment status. Tour completion is stored per device and account type.

Pickups and the post-scan flow share one booking composer. It shows the current Basic/Gold/Platinum plan, available funding sources, remaining allowance, included weight and itemised fees. The sidebar uses actual active-plan data. Confirmed scans show compact item rows; Edit details opens setting rows with material, condition, handling and a mixed-material toggle. Clicking Confirm/Save provides the review acknowledgement, without an extra checkbox.

History groups scans by date with search, animated filters, direct item removal and a focused details view. Whole-scan removal is a soft delete with Undo; removed scans cannot fund a new booking. Editing/removing a historical product does not rewrite an existing pickup’s snapshot. Model version names are no longer shown in product copy.


## Public site and scanning workspace

`/` is the public landing page; `/app` contains the dashboard. Landing links can open Plans, Rewards, Pickups or Identify waste. Helper signup links select the Helper account type without granting collection privileges. Aceternity UI’s [Resizable Navbar](https://ui.aceternity.com/components/resizable-navbar) and [Text Hover Effect](https://ui.aceternity.com/components/text-hover-effect) are adapted locally to Framer Motion, scoped CSS and the borderless design. No Aceternity runtime service is needed. SVG scan beams are clipped, gradients use unique IDs, and GSAP scenes pause offscreen/when hidden and respect reduced motion.

The camera studio separates permission/off, live and analysing states. Automatic scanning and English label reading have accessible switches, with a description fallback. The text flow accepts optional observed material, residue, mixed-material and handling details as structured context.

Gold/Platinum seals sit beside plan names; hover shimmer and button/nav feedback respect reduced motion. Rewards use a plant illustration, while the daily streak retains its flame. “Use last pickup” sits beside “What are we collecting?” and reuses a retained scan, eligible funding source, packing and time; it never copies weight, charges or an old date.

## Organic collection and programme proposal

Basic now starts at ₹10. Verified comparison benefits and an independent Waste Right participation record are implemented; issuance requires a completed, measured organic pickup. Organic discounts, government credentials and funding remain proposals. See [the researched business-model update](../docs/organic-partnership-model.md) for the proposed rules, partnership status and funding evidence.

## Rewards, receipts and participation

Rewards separate scan points, pickup credits, activity and locality ranking, with paused-offscreen SVG artwork and reduced-motion support. Savings and participation are expandable; Plans no longer duplicates this component. My history switches between Scans and Receipts & disputes with an animated selection indicator and content transition, keyboard navigation and reduced-motion support. Pickups contains booking rather than collection records.

Plans includes expandable payment records with status, amount, date, transaction IDs, refund details and private JSON downloads. More than four records enable search. The `/api/payments/receipt?orderId=…` route authenticates the owner and does not expose gateway credentials or contact the provider.

Participation is issued only after a completed, accepted organic collection with positive measured weight. Disputed/refunded records are excluded; downloads return 409 while ineligible. Comparison values are not cash payouts or net subscription savings. Government benefits default to ₹0 until an attributable resident credit is recorded; no government or Aadhaar-linked credential is fabricated. See [participation rules](../docs/savings-participation.md), [DigiLocker onboarding](../docs/digilocker-identity-setup.md) and [UI verification](../docs/rewards-history.md).

Helper compensation, charts and government-support accounting: see [policy and verification](../docs/helper-pay-government-support.md). Basic remains capped at 2 kg, including organics.
