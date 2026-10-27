# EcoMitra scan station

Open `/scan-station` on the stall laptop. It is a standalone page with an operator sign-in, large camera view, photo fallback and a separate results panel. It reuses the normal scanner's image sizing, camera permissions, front/back switching, optional packaging OCR, 16-item filtering and human exclusion. Camera capture is manual by default so a static display is not repeatedly submitted. Automatic scanning remains optional in camera settings.

A scan lists item names, materials, waste/not-waste/please-confirm status, special collection needs, the existing environmental sorting label and any clarification question. AI suggestions are not a guarantee of item identity or local recycling acceptance. Humans are excluded from returned item lists; the browser frame can still contain them, so position the camera toward the tabletop, not visitors.

**Station mode never saves a scan to personal history and never awards or deducts Discovery Points.** The authenticated identification endpoint accepts `station: true` and returns before either persistence operation. Provider requests still receive a frame for processing. The last frame is held in browser memory for display only. Next visitor clears the result and stops the camera; Sign out also ends the operator session. Existing 100-identifications-per-account daily quota applies, including station use. An account and configured identification service remain necessary. No public unauthenticated AI endpoint was added.

## Google sign-in

Uses Google's authorization code flow through the official `google-auth-library`: browser-bound random state, PKCE S256, a nonce verified against the signed ID token, audience/issuer/expiry verification and a single-use ten-minute database state record. Only `openid email profile` scopes are requested. OAuth tokens are not stored. A verified identity creates the ordinary MongoDB session, including the existing sign-in notification when SMTP is configured.

Configure in local `web-app/.env.local` and Vercel:

- `GOOGLE_CLIENT_ID` — OAuth **Web application** client ID.
- `GOOGLE_CLIENT_SECRET` — keep this server-only.
- `APP_URL` — canonical application origin, HTTPS in production.

In Google Cloud → Google Auth Platform, configure the EcoMitra consent/branding, audience and OAuth Web application client. Add exact authorized redirect URIs:

- `http://localhost:3001/api/auth/google/callback` for local testing.
- `https://ecomitra.harshit.page/api/auth/google/callback` when APP_URL uses EcoMitra.
- `https://wasteright.harshit.page/api/auth/google/callback` when APP_URL uses the older domain.

The callback follows the browser origin for the two registered EcoMitra/Waste Right domains, the configured APP_URL origin, and local development on port 3001. Both production callback URIs must be registered; arbitrary hosts are rejected. OAuth state cookies remain bound to the initiating host. In Google testing mode add the operator accounts as test users. Restart local Next.js or redeploy Vercel after setting credentials. Google credentials were added locally by the owner; an end-to-end Google consent run still requires the operator to choose their Google account. Until configured, Google is visibly unavailable and email/password sign-in still works.

Existing Google identities are matched by Google's immutable subject ID. An existing email account is linked automatically only when Google is authoritative for its verified email (Gmail or Workspace hosted domain); otherwise the user must use existing email sign-in. New users default to residents unless helper signup was explicitly chosen. Existing account type and collector approval are preserved. A helper signup requests approval; it does not grant collector/admin access. Server-side admin allowlist rules continue to apply.

References: [Google web-server OAuth flow](https://developers.google.com/identity/protocols/oauth2/web-server) and [Google backend identity verification and authoritative email guidance](https://developers.google.com/identity/sign-in/web/backend-auth).

Verification: 87 unit tests, TypeScript and production build; isolated local MongoDB tests for authentication, state mismatch/replay, cancellation, callback cookies and live image scans without history or Discovery side effects. SMTP was disabled for synthetic QA accounts. A live image run exposed optional provider detections being omitted despite a valid explanation; new responses now require the item list and explicit per-item waste classifications, while legacy history remains compatible.

Station reviews: after each successful scan, visitors can leave a five-star review with their name and an optional phone number/email and comment. Reviews share the `scan_feedback` collection with app feedback, but contain no operator account identifier. A short-lived per-scan ticket prevents duplicate/replayed submissions; skipping one review does not suppress the next visitor's prompt. See [scan-feedback.md](scan-feedback.md).
