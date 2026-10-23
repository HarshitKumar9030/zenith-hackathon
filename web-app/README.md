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

After confirming a scan, an inline pickup form opens immediately with the saved address, tomorrow’s date and an editable 9 am pickup time. Available plan/credit options are loaded automatically; payment and quote requirements still apply. Users can scan several visible items, uncheck mistaken detections, correct the overall material/condition, confirm and save. Images are not retained. OCR is optional. Automatic scanning waits 15 seconds after each completed analysis, with eight automatic frames per session. Stop, navigation, hidden tabs and confirmation stop the camera. Confirmed scans remain in history; unconfirmed previews expire after 24 hours. Local-guide controls have been removed. Legacy guide endpoints remain for historical records; the app does not invent local disposal rules.

Both account types have **Use my location**: an explicit browser permission request obtains and saves a single GPS fix, accuracy and timestamp. No continuous tracking or external reverse-geocoding call occurs. Users provide street address and locality separately. Booking coordinates and addresses are revealed to a helper only after assignment. Locality leaderboards use an opt-in alias, not coordinates or full addresses.

Confirming a new identifiable scan earns at most one point per India calendar day. Ten points redeem one Basic pickup credit, at most twice per month. Re-confirming an old scan does not earn a new day's point.

Collectors claim scheduled jobs, enter gross/container weights and send a measured receipt. Residents approve or dispute it. Operations approves collectors, issues quotes for unsegregated/special-handling collections, records actual work payments, and records buyer proceeds, direct costs and recovery payouts. Payout references are operator records, not automated bank transfers. Dashboard values come from saved activity, not sample earnings.

## Pilot pricing and payments

Basic: ₹20 per pickup, 2 kg, no resident recovery share. Gold: ₹600, 14 pickups × 8 kg (112 kg/month), 10% of positive net recovery. Platinum: ₹700, 24 pickups × 10 kg (240 kg/month), 15%. Gold/Platinum prices and pickup counts follow the requested model; Basic weight cap and recovery percentages are configurable pilot defaults in `src/lib/catalog.ts`. Weight caps currently apply to total measured waste; metal is not automatically exempted. Larger or unsegregated/special-handling collections require an Operations quote.

Razorpay checkout is implemented but **unconfigured by request**. It does not simulate payment success. Optional private configuration: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Configure the webhook at `/api/payments/webhook` for `payment.captured` and `refund.processed`. Orders use server pricing and stored booking ownership. Captures require signature and amount/currency validation, with idempotent entitlement fulfillment. Monthly passes are manually renewed; no automatic recurring debit is advertised. Actual gateway checkout/refund behavior has not been tested with provider credentials.

Operations requires both the email in `ADMIN_EMAILS` and `adminApproved: true` on the existing MongoDB user. The existing `harshitkumar9030@gmail.com` account has been approved locally. Other signups do not become administrators automatically. Email verification/recovery is not implemented in this local hackathon build.

## Verification

```sh
npm run typecheck
npm test
npm run build
node tests/service-integration.mjs
```

Integration checks start a temporary production server and use/drop a separate QA database. They exercise auth, role isolation, batch selection, location validation/privacy, concurrent reward and booking updates, collection claims/receipts, settlement records and signed synthetic payment webhooks. Playwright checks resident/helper navigation, Hindi, geolocation and mobile overflow. Real camera/AI and bank transfers require separate live-device/provider checks.

The scraper remains stopped and custom-model training remains deferred. See [verification](../docs/verification.md) and [research](../docs/research.md).

## Pickup times and evening surcharge

Users choose any minute from 7 am to before 2 pm, or from 5 pm through 7 pm, in Asia/Kolkata. No pickups can be requested during the 2–5 pm break; both browser and API validate the chosen time. Older records retain their original windows.

Evening surcharge: ₹5 base, plus ₹1 if estimated weight exceeds 2 kg, plus ₹1 for unsegregated waste, capped at ₹7. It is calculated on the server and disclosed before booking. Basic fees include this surcharge (for example ₹25 for a small segregated evening pickup); plan and reward pickups also require the surcharge to be paid before scheduling. Special-handling/unsegregated bookings still require Operations quotes, whose total must include the surcharge. The surcharge is fixed using the submitted estimate and segregation declaration. Cancelling an unpaid evening booking restores its reserved credit/allowance; a full recorded refund also restores an uncollected reservation.
