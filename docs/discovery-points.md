# Discovery Points — hackathon scan challenge

Each newly completed, validated identification earns exactly one Discovery Point, regardless of the number of objects. Photo, live-camera and text identification use the same classification endpoint and count equally. Failed, blocked, truncated and invalid scans earn nothing. A successful scan that identifies no waste still counts: points measure participation, not waste generation. Each new automatic live scan counts; existing daily identification limits remain active.

This is separate from confirmed scan-day reward points, streaks, pickup credits and redemptions. No retrospective points are granted. Discovery Points cannot be spent and have no cash value.

The classification endpoint creates one durable `discovery_points` ledger entry keyed by the saved scan ID, using `$setOnInsert` to prevent duplicate awards for that ID. History expiry or deletion does not erase the ledger. Distinct new submissions count as new scans; this is a participation challenge, not image-uniqueness or anti-cheat verification. A database failure after saving history can leave that scan unawarded; it returns an error rather than claiming an award. No transaction-level all-or-nothing guarantee is claimed.

Authenticated `GET /api/discovery-leaderboard` returns the current user's total and the top 20 global participants. Mongo aggregation ranks totals descending, breaking ties consistently by internal user ID. Display ranks are sequential. Public pseudonyms use `Explorer` plus a short identifier suffix, never names, emails or precise locations. This new global challenge does not alter the existing opt-in locality leaderboard. It is shown on its own Discovery Points sidebar page (`/app?view=Discovery%20Points`), with loading, retry, empty and personal-total states.

The ledger contains only scan ID, user ID and creation time; no photographs or descriptions. Treat it as account-linked personal data for account deletion/retention policy purposes. Hackathon use is not proof of production anti-abuse readiness.

Successful photo/text and active live scans display a +1 Discovery Point notification directing users to Discovery Points. Verification: 67 unit tests, TypeScript and production build passed. An isolated local Mongo check verified repeated award upserts count once and two distinct scans aggregate to two points; temporary records were removed.

## Standalone leaderboard site

`discovery-leaderboard/` contains a dependency-free public leaderboard. Start with `npm start` in that folder and visit port 3002. `?source=local` selects the local app API on port 3001; otherwise it uses the production Waste Right API. The compact view prioritises rank, explorer alias and points, with search across the top 20, manual refresh and a 30-second visible-page refresh interval. Search preserves the original global rank. No fake scores are supplied.

The same API accepts `?public=1` for pseudonymous top-20 scores only, with cross-origin reads permitted. It skips session access and returns no personal total (`points: null`); authenticated requests without that flag retain personal totals and private caching. No emails, names, full user IDs, locations or ledger rows are returned. The separate website is running locally; no public hosting deployment for it was created.

## Participation milestones

Discovery badges unlock at 1 scan (First find), 10 (Explorer), 25 (Trailblazer) and 50 (Pathfinder). These are presentation-only milestones calculated from the existing Discovery total, not additional points or redeemable benefits. The app shows progress between consecutive thresholds, locked/earned badges and a top-20 position only when the user is present in that response; it does not invent a global rank outside the top 20. Both sites use the same thresholds. The public site adds a compact milestone strip and level labels alongside explorer aliases. Motion respects reduced-motion settings.
