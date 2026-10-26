# Discovery Points, scan review and prize shop

Updated 26 October 2026. **Discovery Points belong only to waste scans. Quiz play, quiz scores, answer streaks, confetti and quiz audio never earn or deduct these points.** Pickup reward points remain a separate system.

## Earning and ranking

A successful photograph identification containing at least one item classified as waste can earn one Discovery Point, regardless of item count. Text-only descriptions and images without identified waste earn no prize points. Identification itself still works. Up to 30 original, eligible photographs earn points per India calendar day; the existing identification API quota also remains active. Existing pre-policy points are preserved, including earlier text/photo credits; no retrospective punishment is applied.

The leaderboard uses the available balance after spending and penalties. Milestone badges use lifetime earned points, so spending does not remove them. Participants can see available, earned, spent and penalty totals and recent movements on Discovery Points. The global public site shows only top-20 explorer aliases, available scores and lifetime milestone totals, never emails, locations, scan hashes, private images or account identifiers.

## Repeat-scan module

`scan-fingerprint.ts` decodes a bounded JPEG/PNG/WebP with Sharp, applies orientation, converts to RGB and normalises the working image to a maximum 1024-pixel dimension. It creates a SHA-256 identity over dimensions and decoded pixels, a 256-bit difference hash, and a small review thumbnail without EXIF metadata. Metadata-only edits do not make a new original photo.

For the same account, within a rolling 24-hour sample window:

1. First eligible frame earns +1, subject to the daily cap.
2. Another identical normalised frame earns zero and displays a repeat warning.
3. A third identical submission deducts **35% of the available balance at that moment, rounded down to whole points**. It earns no new point. Balances of 1–2 therefore have a zero-point rounded deduction; duplicates still cannot earn more points.
4. The same frame group cannot apply another automatic penalty within that window. A repeated operation with the same scan ID is idempotent.

Live scanning stops on a repeat warning, review hold or daily-limit message so a stationary camera does not unknowingly keep repeating the same frame.

A close perceptual match (at most 6 differing bits out of 256, comparable aspect ratio, and a non-flat fingerprint) holds the new point for admin review. It does **not** automatically deduct 35%. An identical frame already registered to another account also holds its point without an automatic penalty. Review can approve +1 or reject with no point. An administrator can restore an incorrectly applied exact-frame penalty once, with an audit note.

**Reliability limit:** the system detects image reuse and strong frame similarity, not the unique physical identity of a bottle. Two similar bottles can look alike; the same bottle can look different from another angle. Crops, substantial edits, new accounts or newly photographed objects can evade heuristics. No false-positive rate, perfect abuse prevention or model accuracy is claimed without an independently labelled evaluation. Prizes need human review and real handover verification; a score is not proof of waste disposal, ownership or recycling.

## Atomic balances and audit

`discovery-policy.ts` contains the deterministic rules; `discovery-wallet.ts` provides revision-based compare-and-swap updates on one MongoDB wallet document. Every scan result, penalty, redemption, review and restoration has a durable event ID. Concurrent updates reread and retry; insufficient balances never go negative.

Earlier `discovery_points` records are an immutable migration source. Wallet creation counts them once, retains the existing balance and records prior earnings for the launch day. No historical records are deleted. Ranking combines legacy users and wallets, always preferring a wallet's net balance even when it is zero; it never resurrects spent points by choosing the older gross total.

Each admin debit requires a unique handover/order reference. The reference is case/whitespace-normalised and bound to the operation's server-calculated cost and reason. Reusing it returns the same record, while reusing it for a different transaction is rejected. Prize prices come from the server catalogue, never a client-supplied amount. Catalogue deactivation does not allow an already recorded reference to be charged twice.

The current single-document ledger refuses updates at 20,000 events instead of silently trimming idempotency history. Before operating at sustained production scale, introduce archived ledger/outbox storage with an explicit migration and reconciliation design; do not bypass this guard or remove references to reclaim space.

## Operations → Discovery shop

Only a verified/approved administrator allowed by `ADMIN_EMAILS` can access the shop API. A helper approval does not grant access. The shop provides:

- Search by participant name/email and a balance summary.
- A catalogue of administrator-created prizes and point costs; no prizes are pre-promised.
- Recording a prize handover/order, or another purchase with a reason and point amount.
- Review of held scans with private side-by-side thumbnails.
- One-time restoration of an incorrect penalty.
- An activity trail showing operator, reference, reason and points movement.

These are accounting records, not automatic delivery, bank transfers or stock reservations. Administrators must confirm actual prize availability and fulfilment. The catalogue does not enforce inventory quantities. Ordinary users cannot deduct their own points through these endpoints.

## Data handling

- `discovery_wallets`: account-linked balances, scan/review events and recent fingerprints.
- `discovery_image_registry`: account-linked normalised frame hash, first scan reference and a 30-day TTL; no full photo.
- `discovery_review_images`: private, metadata-free, at-most-256-pixel thumbnails with a seven-day TTL. The admin endpoint also checks expiry before returning an image, since Mongo TTL deletion is asynchronous.
- `discovery_prizes`: catalogue descriptions and costs.

Images never use a public asset URL. The image endpoint requires admin authentication on every request. The main scan does not retain an original full-resolution photo for this feature. These records are personal account-linked data and need inclusion in account-deletion and retention workflows before broad production use.

## Failure behaviour and verification

An identification remains usable if its points update fails; it displays that Operations must review the saved scan rather than claiming an award. Wallet events are the source of truth if a history annotation fails. Similarity holds require an explicit admin decision; expired review images do not automatically approve a point.

Unit tests cover duplicate detection, thresholds, a single 35% deduction, rounding, unchanged scan IDs, 24-hour expiry, close-match/cross-account holds, review idempotency, reversals, daily caps, reference misuse and insufficient funds. Fingerprint tests cover metadata changes, pixel changes, malformed inputs and thumbnail generation.

Run the isolated integration test after building:

```sh
cd web-app
npm run build
./node_modules/.bin/tsx tests/discovery-integration.mts
```

It requires local MongoDB, creates a uniquely named temporary database and synthetic users, disables SMTP, starts a temporary production server on port 3114, and cleans up. It checks concurrent repeated submissions, concurrent redemption retries, server-side pricing, administrator/helper/resident isolation, overspending prevention, hidden-prize retry safety and public/private score projections. It does not modify production balances or hand out real prizes.

## Separate public leaderboard

`discovery-leaderboard/` remains a static website. `npm start` runs it locally on port 3002; `?source=local` selects the local API on port 3001. Vercel uses the explicit static build in that folder. The app's personal page is `/app?view=Discovery%20Points`; pickup rewards remain on Rewards; the unrelated quiz is `/quiz`.
