# Personal game access at the stall

The Instagram condition applies to **Circular City at /game**. /quiz remains open and does not require an account, code, Instagram follow or story.

## Staff flow

1. Ask the visitor to create/sign in to their EcoMitra account.
2. Check their Instagram follow or story manually. No Instagram credentials, screenshots or profile data are collected by this feature.
3. In Operations → **Game access**, enter their account email and confirm the check(s) performed. At least one is required.
4. Create a personal code and share it privately with that participant. The raw code is displayed only in the creation response.
5. The visitor signs in with that same account at /game and redeems the code.

The code has 48 random bits, displayed as three four-character groups. MongoDB stores its SHA-256 hash, never the raw code. Code entry accepts lowercase, spaces and dashes.

## Timing and accounts

- A code must first be used within 24 hours of issue.
- First redemption starts exactly 30 minutes of game access. Each individual game round still lasts five minutes.
- Refreshing, pausing, signing out, another browser/device or redeeming again cannot restart this server-side clock.
- Codes are bound to the specific existing account ID. Another participant cannot redeem a shared code.
- A newly issued code replaces that account's existing grant, including remaining time. The Operations form states this before issue.
- Revoke ends a grant. Revocation requests include the grant ID so a stale staff action cannot revoke a newer replacement.
- Anyone whose pass expires or is revoked returns to the access screen. They need staff to issue a new code after another check.

The game page checks access on load, focus, visibility changes and every 15 seconds. The visible timer uses server remaining time with a monotonic local countdown. At expiry the game unmounts, stopping animation, controls and audio. Revocation/account sign-out changes on other tabs are detected at the next poll (up to 15 seconds for a visible page). Every new round requires another authorized server request. No game pass bypass is granted to administrators; they can issue a pass to their own account for a demo if needed.

## Storage and authorization

The game_access collection has one document per user ID, a unique codeHash index and a recent-issue index. It stores grant ID, issuer ID, issue/redemption/expiry/revocation timestamps and the manual follow/story booleans. A capped 50-event audit trail records issuance, activation and revocation. Records are not removed at expiry, so Operations can distinguish expired and revoked grants. This is a small event log, not indefinite storage of Instagram evidence.

The /api/game-access route uses existing verified-account sessions and administrator allowlisting. Only administrators can issue, list other participants or revoke. Its normal status response exposes only the current account and public pass fields; admin lists also omit code hashes. Mutations reject cross-origin requests and oversized/malformed bodies. Redemption has a shared MongoDB rate limit of ten attempts per account per ten-minute bucket. Concurrent redemption uses one atomic conditional update; retries return the existing expiry instead of extending it.

Google OAuth accepts /game as a safe, same-origin return path, so Google sign-in returns to the access screen. Email signup, verification and recovery reuse existing account flows. No extra environment variables are required beyond working MongoDB and account configuration.

This is server-backed admission to a browser game, not anti-cheat or a tamper-proof competition. Downloaded 3D assets and client-side scores are not secret or authoritative prize records. Discovery Points, prizes and quiz scores remain separate.

## Verification

Run in web-app: npx tsx --test src/lib/game-access.test.ts src/lib/google-auth.test.ts src/lib/waste-quiz.test.ts; npm run build; node tests/game-access-integration.mjs.

The integration suite uses a disposable isolated database and its own production-mode server. It creates synthetic verified sessions, disables external email and tests authentication, administrator-only operations, required manual checks, account binding, concurrent redemption, fixed expiry, repeat redemption, authorized round starts, expired unused codes, replacement, revocation, stale-grant protection, code-hash redaction and rate limits. It does not claim to verify Instagram or wait thirty real minutes; expiry is advanced in isolated fixtures.
