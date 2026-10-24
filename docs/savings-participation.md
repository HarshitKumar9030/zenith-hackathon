# Included segregation, benefits and participation records

Updated 24 October 2026.

## Gold and Platinum

Gold (₹399/month) and Platinum (₹469/month) now include segregation for pickups funded by their membership allowance. The price calculator returns zero sorting fees before and after helper weighing, with no sorting-pending flag. Residents do not have to choose a packing option for these pickups. The evening surcharge still applies for time and, where applicable, weight, but the unsegregated surcharge component is waived for membership pickups.

Basic and reward-credit pickups retain ₹5/kg sorting for unsegregated waste, assessed after helper weighing. Membership eligibility and weight allowances continue to be checked server-side. Using a separate Basic/reward pickup while holding a subscription follows that pickup's funding source. Already accepted/paid historical receipts are not rewritten or automatically refunded.

The helper's newly issued receipt records whether sorting was included and the ₹5/kg comparison value for mixed waste actually handled. These snapshots support a truthful benefits display after the resident accepts the receipt and the collection is completed.

## Savings display

Overview and the expandable participation section in Rewards show separate measures:

- **Waste Right fee reductions:** completed, measured Basic pickups with a saved ₹15 reference baseline, compared with their recorded base collection charge. Old records lacking that baseline are excluded.
- **Included segregation value:** completed membership pickups with a measured receipt explicitly marking segregation included, where the waste was not already separated. This is the value compared with a ₹5/kg sorting charge.
- **Government-funded savings:** defaults to ₹0. Only Operations-recorded, externally completed resident credits backed by support-receipt, processor and credit references count. The resident policy is 50% of attributable support received. Approval remains a business assumption until evidence is supplied; projected fertiliser assistance is not counted as pickup savings. See [helper/support accounting](helper-pay-government-support.md).

The first two figures are comparison values, not cash payouts or net savings after subscription costs. The UI does not add them to government funding or claim they are a government benefit. Pending, disputed, cancelled, invalid-weight and booking-refunded records are excluded. No emissions or biogas yield is inferred from collection weight.

## Independent participation record

An account starts without a participation record. It becomes eligible only after a **completed, measured organic pickup**: the helper receipt must contain positive net weight and identify food/kitchen/garden/organic waste; the resident must accept that receipt and any balance must be settled. Scans, pending receipts, disputed/cancelled pickups and refunded or review-needed payments do not qualify. A generic mixed-material receipt does not establish an organic quantity. No government handover or processing is inferred.

Once eligible, the account receives an opaque UUID-based `WR-…` identifier, saved with issuer, issue date and qualifying pickup ID. A unique partial index protects uniqueness. Revision-protected lazy issuance makes concurrent requests converge. Older reserved identifiers are not exposed until eligibility is established. If all qualifying pickups become disputed/refunded, the UI/API hide the record and block downloads (HTTP 409); the identifier is retained internally for continuity if eligibility is restored.

The eligible signed-in resident can copy the ID or download an owner-only JSON account record at `/api/participation?download=1`. The server always uses the current authenticated user; supplying another account ID does not retrieve that account. Responses use private/no-store caching. The record contains participation metadata, aggregate verified service activity, comparison benefits, government status and a calculation timestamp. It omits the resident's name, email, address, coordinates and Aadhaar data.

**Issuer: Waste Right. This is not a government-issued or cryptographically signed government credential.** Both `governmentIssued` and `aadhaarLinked` are false. The record explicitly states that the ID is not recorded in Aadhaar. Government issuance, subsidy attribution, official branding and any identity-verification integration need the relevant authority's authorisation and a real integration before they can be represented as available.

UIDAI states that its database contains limited enrolment/update identity information and does not store the broader account/activity records of organisations using Aadhaar. Its authentication ecosystem uses authorised requesting entities to verify identity. This app provides no mechanism to write a waste-programme credential into Aadhaar. [UIDAI identity-data explanation](https://uidai.gov.in/hi/aadhaar-mythbusters), [UIDAI authentication ecosystem](https://uidai.gov.in/hi/authentication-partners).

## DigiLocker status

No requester access has been approved. Aadhaar retrieval remains disabled; see [DigiLocker onboarding requirements](digilocker-identity-setup.md). Verification through DigiLocker, when approved and explicitly consented to by the resident, would establish identity provenance, not government issuance or waste processing.

## Verification

All 27 unit tests and TypeScript passed. An isolated temporary Next.js instance on localhost:3108 used synthetic resident/helper accounts in a dedicated MongoDB database with AI/payment credentials disabled. API checks passed for membership weighing without sorting/additional fees; benefits after acceptance; zero government-funded savings; no ID/download before completed organic collection; stable concurrent issuance; distinct owner IDs; dispute relocking; private downloads; and denial of another user's receipt acceptance/download.

Browser checks covered Rewards redemption, corrected truck artwork, the locked/issued participation states, ID copying, separate ₹5 fee reduction / ₹65 included sorting / ₹0 government values in the final synthetic fixture, and payment search/refund details. Payment and participation downloads were checked through authenticated HTTP. See [UI verification](rewards-history.md) for responsive evidence and remaining limits. No live gateway, government credential or Aadhaar integration was exercised.
