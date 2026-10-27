# First-scan feedback

After the first successfully processed photograph, the dashboard scanner can display an inline feedback card. Five keyboard-accessible radio stars select a rating; the text comment is optional and limited to 1,000 characters. The card can be dismissed without interrupting scanning, and shows a saved confirmation only after MongoDB acknowledges the write. Quiz scores and Discovery Points are unaffected.

`users.scanFeedbackEligibleAt` and `scanFeedbackSource` record first-scan eligibility, without retaining a station image. `scanFeedbackDismissedAt` persists Not now/dismiss. The dashboard prompt is once per signed-in account. The scan station uses the per-scan visitor flow below. Refreshing or signing in again does not repeat a submitted/dismissed prompt.

`GET /api/scan-feedback` returns only the current account's eligibility/submission state. `POST /api/scan-feedback` accepts `{stars: 1..5, comment?: string}` or `{action: "dismiss"}`. Both require an existing authenticated session; writes require the same origin. The server rejects ratings before the first successful photograph, non-integer/out-of-range stars, unknown fields and oversized comments.

The `scan_feedback` collection stores one document per account using the account ObjectId as `_id` (MongoDB's built-in unique index). Fields: userId, stars, comment (trimmed string or null), source (server-derived app/station), firstScanAt, createdAt and version. Insert-only upsert preserves the first submission across network retries and concurrent requests. No duplicated email, IP, image or payment data is saved. No public feedback feed is added; this is private product feedback. Operators can inspect the collection with authorized MongoDB tooling.

## Stall visitor reviews after every scan

Every successful `/scan-station` scan issues a fresh, random review ticket. The inline card asks for 1–5 stars, a required visitor name (1–80 characters), an optional phone number or email and an optional comment. It is not prefilled from the operator account. Skip/dismiss affects only that scan; the next scan gets a new card, even when an earlier visitor submitted a review.

Station reviews use the **same `scan_feedback` collection**, keyed by `station:` plus the ticket hash. Fields: source=station, accountLinked=false, name, optional contact and contactType, stars, optional comment, scanAt, createdAt, version=2. Operator userId, session, email and IP are not copied into the review. A provided name/contact is still personal information, so the form explains that these details are stored with the review; these records are account-independent rather than literally anonymous personal data. No scan image is retained.

`scan_feedback_tickets` stores only a hash, createdAt and expiresAt, with a 24-hour TTL index. Expiry is checked in the write query even before MongoDB's TTL cleanup runs. The raw random ticket is returned only with a successful authenticated station scan. A visitor can submit with that ticket without a personal sign-in. Missing, invented or expired tickets cannot create reviews. Unique insert-only upserts prevent retry/concurrency duplicates while separate scan tickets permit multiple visitors at the same laptop. Ticket creation and feedback failure do not stop the scanner from displaying its result.

## Operations review inbox

Operations → Reviews loads all saved app and visitor reviews, newest first, in pages of 30 with no dependency on the collections/jobs load limit. Search covers names, contact details and comments; source and exact-star filters combine with it. Summary cards show the filtered review count, average rating, visitor count and five-star count across all matching pages. Refresh returns to the newest page.

`GET /api/ops-reviews` requires server-verified administrator access; residents, helpers and signed-out requests receive 403. The API returns only review display fields and, for legacy/app reviews, the linked account's name/email via a restricted lookup. It never returns review tickets, session identifiers, password data or raw user records. Contact information remains private to administrators, with private/no-store caching. Visitor records stay unlinked in the database. A createdAt/_id index supports the review listing.
