# Google Workspace email setup

Waste Right supports signup verification, password reset, and passwordless sign-in links through Google Workspace SMTP. The sender for this project is `harshit@articulatex.in`.

## Private configuration

Enable 2-Step Verification on the Workspace account, then create an app password if the Workspace administrator permits it. Use the app password, not the normal account password. If app passwords are unavailable, ask the Workspace administrator about an approved SMTP relay or OAuth setup. This implementation uses authenticated SMTP with an app password.

Set these fields directly in ignored `web-app/.env.local`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=harshit@articulatex.in
SMTP_PASSWORD=your-app-password
SMTP_FROM=harshit@articulatex.in
APP_URL=http://localhost:3001
```

Port 587 requires STARTTLS. Port 465 uses implicit TLS automatically. `SMTP_SECURE=true` enables implicit TLS on a custom port, primarily for the local test server. TLS certificate verification remains enabled.

Restart `npm run dev -- --port 3001` after updating configuration. For deployment, replace `APP_URL` with the actual public HTTPS origin and set the same SMTP fields in private hosting configuration. Localhost links work only on the machine running the app. Email links use this configured origin, never a caller-supplied host.

Google's official setup: [Send email from an app](https://support.google.com/a/answer/176600?hl=en). Use [Google Account app passwords](https://myaccount.google.com/apppasswords) while signed into the sender account. Actual delivery and inbox/spam placement still require a real Workspace test after credentials are configured.

## Account behavior

When SMTP is configured, new accounts must verify their email before password sign-in. Signup sends a verification link without creating a session. Resend verification, Forgot password and Email me a sign-in link are available in the sign-in dialog. Successful verification or an email sign-in creates a session. Password reset invalidates all existing sessions and outstanding email links, then requires a fresh sign-in.

Tokens are random, stored only as hashes, purpose-bound, tied to the current password, and expire after 15 minutes. Atomic consumption rejects concurrent reuse. Links carry tokens in URL fragments, and the account page requires an explicit confirmation POST so an email scanner's GET does not consume the link. The page clears the fragment from browser history after loading it. Request responses do not reveal whether an account exists. Email requests share a three-per-address limit in ten-minute buckets, stored in MongoDB.

Until SMTP configuration is complete, email requests explicitly return unavailable and local password-based signup/sign-in remain usable. Existing accounts retain password access. There is no retroactive verification lockout for existing users. Helpers still require Operations approval independently of email verification.

## Verification

```sh
cd web-app
npm test
npm run build
node tests/email-auth-integration.mjs
QA_SKIP_BROWSER=1 node tests/service-integration.mjs
```

The email integration suite starts an isolated application and temporary MongoDB database plus a local TLS SMTP sink. It exercises delivery, verification, email sign-in, expiry, replay/concurrency rejection, reset, session revocation, and rate limits without contacting Google or sending real email. It requires OpenSSL to create an ephemeral test certificate. The service integration suite explicitly disables SMTP so its account fixtures cannot send real mail.

## Sign-in security emails

Each newly created session schedules one sign-in notice after the response: password login, email-link login, and verification that signs the account in. Session lookups, failed logins and replayed links do not send notices. The session record claims the send once; failures are marked and do not block authentication. This is a single best-effort SMTP attempt, not a durable retry queue or inbox-delivery guarantee.

The HTML/plain-text message includes India and UTC time, the sign-in method, browser/OS labels, reported user-agent and a validated client IP when available. It contains no password or bearer token. The reset button points to the configured application origin. No external IP-geolocation service is called.

On Vercel, managed forwarded-IP headers are used. On another host, `AUTH_TRUSTED_PROXY_HOPS` may be set to the number of controlled reverse proxies only when the origin cannot be reached directly and those proxies append/replace forwarded headers correctly. Otherwise the email says the IP is unavailable; arbitrary caller-supplied IP headers are ignored. Device information is reported by the browser and is not verified device identity. See [Vercel headers](https://vercel.com/docs/headers/request-headers) and [forwarded-header trust guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For).

The local TLS SMTP integration verifies exactly one notice for each successful verification/password/email-link session, no replay notice, and the expected IP/method. No real recipient is contacted by the test.
