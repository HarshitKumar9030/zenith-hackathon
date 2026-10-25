# Production readiness and simpler flows

25 October 2026. Code is prepared for staging; this document does not certify a public launch.

## Resident experience

The main journey is scan → review items → choose pickup → pay if required. Camera settings, optional description details, OCR text, alternative sign-in methods and pickup-funding changes stay inside expandable sections. A single clear primary action stays visible in each stage. The photo page no longer repeats the camera action already available in its tab.

Pickup booking defaults to the next valid service window and best eligible payment option. Existing address fields are reused and their summary updates while editing. Missing addresses open and focus the relevant field; no scans leads to Scan waste; special-handling results offer Review item details instead of a disabled button. Review navigates to that scan's editor. Special-handling rules are preserved. Sorting and measured excess-weight fees remain visible before booking.

Paid bookings now open checkout directly, without a detour through history. A shared checkout controller allows only one payment window at a time, keeps the UI busy while open, ignores duplicate success callbacks, verifies payments on the server and handles dismissal. Ambiguous verification errors tell the user to check payment history rather than paying again. The interface remains explicit when checkout is unavailable. No automatic real charge is made by the app without the resident completing the payment provider's flow.

Dropdowns support focus-on-open, arrow keys, Home/End, selection, Escape with focus return, and closing when focus leaves. Mobile layouts were inspected at 390 px with no horizontal overflow in the tested flows. Existing no-border/no-shadow styling remains. User changes to the global stylesheet were preserved.

## Helper tracking

Assigned approved helpers can select Share location in the browser, grant device permission and keep the screen open. No pairing code is needed for foreground sharing. Stop clears the GPS watcher and requests session revocation; navigation does the same. If offline, revocation is best effort and the server’s stale-fix and expiry rules still apply. The browser checks the session every 15 seconds and attempts fresh uploads no more than every five seconds. Permission rejection, cancellation during setup, late server responses, permission revocation and assignment/session expiry are handled. Tokens stay in memory. Android pairing remains under an alternative section for helpers who need background operation.

Browser tracking is foreground-oriented. Do not promise continuous lock-screen tracking or a precise traffic-aware arrival. Native background delivery, real-device GPS quality, weak networks and actual collection operations still need field testing.

## Production controls

Production signup requires configured email delivery by default. Production login and session reads also reject unverified accounts, including legacy accounts. The explicit `ALLOW_UNVERIFIED_SIGNUP=true` override is for isolated QA only and fails the production configuration check. Demo auto-assignment remains disabled.

Security headers disable content-type sniffing and framing, restrict camera/geolocation to this origin, disallow microphone use and object embedding, and limit base URLs. API responses are marked private/no-store. This is a baseline CSP, not a complete script-nonce CSP or a penetration-test certificate. The dependency audit reported no known production-package vulnerabilities at the time of checking.

Run from `web-app/`:

```sh
npm run typecheck
npm test
npm run build
node tests/tracking-integration.mjs
QA_SKIP_BROWSER=1 node tests/service-integration.mjs
node tests/email-auth-integration.mjs
npm run check:production
```

The configuration check prints only labels, never credential values. In the current local setup it reports two missing release requirements: a public HTTPS APP_URL and live Razorpay credentials. SMTP, model key, database settings, webhook-secret presence and administrator allowlist are configured; configuration presence is not verification of external delivery or connectivity.

Before public launch, deploy behind HTTPS, install live payment credentials privately, register the live webhook/callback URLs, verify sender delivery with an authorized recipient, test a real low-value payment/refund with the owner, protect and back up MongoDB, configure monitoring, and complete real-device/operational trials. Never publish the Android debug signing key or local secrets. Government grants, official identity credentials and model accuracy remain subject to the separate documented evidence and approvals.

## Verification evidence

The temporary development preview used the actual UI components with synthetic pickup data and a temporary API adapter. It checked keyboard payment selection, handling-review navigation, short-address focus/error, compact camera/account/tracking controls and desktop/mobile layout. The preview route and adapter were removed. No camera/GPS permission was granted and no real payment was made during UI checks. Saved screenshots: `/tmp/waste-right-simple-pickup.png` and `/tmp/waste-right-simple-pickup-mobile.png`.

Mocked checkout tests exercise duplicate windows/callbacks, verification, and dismissal without charging a gateway. Synthetic geolocation tests check cancellation and watcher/session cleanup. Isolated API tests verify that residents cannot start helper sharing, scoped browser tokens can update/stop only their session, production unverified signup/session access is blocked, and payment/booking/receipt ownership and replay protections still hold.

References: [Razorpay checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [browser geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [Next.js response headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers).

Final local results: TypeScript and production build passed; all 60 unit tests passed; tracking, service and local-TLS email integrations passed; production dependency audit reported zero known vulnerabilities. The production configuration check intentionally remains failing for the local HTTP URL and test-mode Razorpay credentials. No real payment, external test email or real GPS transmission was performed.
