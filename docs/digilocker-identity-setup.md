# DigiLocker identity verification: setup requirements

Updated 24 October 2026. **Not connected.** Waste Right does not yet have approved DigiLocker requester access; no Aadhaar information is fetched, stored or printed on participation records. The owner chose to document onboarding requirements before implementing live retrieval.

## What Waste Right needs

1. Apply as a **DigiLocker requester organisation** through the [official partner portal](https://api.apisetu.gov.in/). DigiLocker determines eligibility. Issuer registration is a separate process if Waste Right later wants to deliver its own certificates into DigiLocker.
2. Obtain the approved requester application/client credentials and confirm the permitted Aadhaar/e-Aadhaar document scopes and intended waste-programme identity-verification purpose. General DigiLocker login or a profile name alone must not be treated as Aadhaar document verification.
3. Register the application domain and the exact HTTPS OAuth callback URL in the partner configuration. Decide the deployment URL before configuring the callback; there is no live Waste Right callback route yet.
4. Obtain the current partner API specification and sandbox/test access from DigiLocker. The [official resource centre](https://apisetu.gov.in/digilocker) currently lists Meri Pehchaan API v2.4 (September 2026), Requester API v1.12 and the requester configuration manual. The linked specification PDFs returned HTTP 403 to this research tool; endpoint paths, payloads and approved scopes must be confirmed from the supplied partner documentation before implementation.
5. Complete the partner's required testing/audit and production approval. Keep client secrets in server-only local/deployment configuration, never in chat, Git or `NEXT_PUBLIC_` variables. Do not share Aadhaar numbers or OTPs with the developer.

DigiLocker describes partner registration/vetting in its [implementation model](https://www.digilocker.gov.in/web/implementation-model) and explicit consent in its [security architecture](https://www.digilocker.gov.in/web/security-architecture).

## Intended flow after approval

- A participation record first requires a completed, resident-accepted pickup whose helper receipt contains positive measured organic weight. Scanning or paying alone does not qualify. Government processing is not inferred from an organic collection: a separately verified authority/processor handover would be needed to establish programme participation.
- The resident explicitly chooses identity verification and sees which information will be retrieved, why, retention/deletion rules and whether any details will appear on a downloadable record. Participation and ordinary pickups should remain available without optional identity verification.
- Use the approved OAuth authorization-code flow with session-bound, single-use state and PKCE as required by the partner specification. Login, consent and OTP entry stay on DigiLocker's official interface. Reject invalid/expired callbacks, mismatched sessions and replayed codes. Keep tokens server-side and out of application logs; retain only what the approved purpose requires.
- Fetch only the permitted document after consent. Verify its issuer authenticity using the approved specification, bind the result to the signed-in Waste Right account, and distinguish verified document data from self-entered profile information.
- For a certificate, use only the consented verified name and verification source/date. Do not print full Aadhaar numbers, DOB, address, photograph or raw identity XML. A masked reference should only be included if the approved integration and explicit resident consent permit it. Do not generate fake masked Aadhaar values for demos.
- Let the resident disconnect optional identity verification and apply the approved retention/deletion policy. Test consent denial, revoked access, invalid signatures, token expiry, account switching and unauthorised document downloads before production.

## What this does not establish

A DigiLocker-verified identity is not proof of government processing of waste, a subsidy award or government endorsement. Retrieving Aadhaar information does not write a certificate into the Aadhaar database. A Waste Right certificate remains independently issued; it must not use government branding or claim government issuance without the relevant authority's agreement. Publishing a certificate through DigiLocker would additionally require the appropriate issuer integration.

The current downloadable record remains an owner-only Waste Right JSON record with `governmentIssued: false` and `aadhaarLinked: false`. No live DigiLocker API, callback, identity credential or government-processing ledger is represented as implemented.
