# Discovery Points — hackathon scan challenge

Each newly completed, validated identification earns exactly one Discovery Point, regardless of the number of objects. Photo, live-camera and text identification use the same classification endpoint and count equally. Failed, blocked, truncated and invalid scans earn nothing. A successful scan that identifies no waste still counts: points measure participation, not waste generation. Each new automatic live scan counts; existing daily identification limits remain active.

This is separate from confirmed scan-day reward points, streaks, pickup credits and redemptions. No retrospective points are granted. Discovery Points cannot be spent and have no cash value.

The classification endpoint creates one durable `discovery_points` ledger entry keyed by the saved scan ID, using `$setOnInsert` to prevent duplicate awards for that ID. History expiry or deletion does not erase the ledger. Distinct new submissions count as new scans; this is a participation challenge, not image-uniqueness or anti-cheat verification. A database failure after saving history can leave that scan unawarded; it returns an error rather than claiming an award. No transaction-level all-or-nothing guarantee is claimed.

Authenticated `GET /api/discovery-leaderboard` returns the current user's total and the top 20 global participants. Mongo aggregation ranks totals descending, breaking ties consistently by internal user ID. Display ranks are sequential. Public pseudonyms use `Explorer` plus a short identifier suffix, never names, emails or precise locations. This new global challenge does not alter the existing opt-in locality leaderboard. It is shown as its own card on Rewards, with loading, retry, empty and personal-total states.

The ledger contains only scan ID, user ID and creation time; no photographs or descriptions. Treat it as account-linked personal data for account deletion/retention policy purposes. Hackathon use is not proof of production anti-abuse readiness.
