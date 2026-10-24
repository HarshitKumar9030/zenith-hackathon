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
- **Government-funded savings:** ₹0. Collaboration and funding are at the application stage. No government award, subsidy ledger or public-service payment is fabricated.

The first two figures are comparison values, not cash payouts or net savings after subscription costs. The UI does not add them to government funding or claim they are a government benefit. Pending, disputed, cancelled, invalid-weight and booking-refunded records are excluded. No emissions or biogas yield is inferred from collection weight.

## Independent participation record

Each account receives an opaque UUID-based `WR-…` identifier, saved in its MongoDB account document with issuer and issue date. A unique partial index protects identifier uniqueness. Existing accounts receive one ID through a revision-protected lazy migration; concurrent requests converge on the same saved ID.

The signed-in resident can copy the ID or download an owner-only JSON account record at `/api/participation?download=1`. The server always uses the current authenticated user; supplying another account ID does not retrieve that account. Responses use private/no-store caching. The record contains participation metadata, aggregate verified service activity, comparison benefits, government status and a calculation timestamp. It omits the resident's name, email, address, coordinates and Aadhaar data.

**Issuer: Waste Right. This is not a government-issued or cryptographically signed government credential.** Both `governmentIssued` and `aadhaarLinked` are false. The record explicitly states that the ID is not recorded in Aadhaar. Government issuance, subsidy attribution, official branding and any identity-verification integration need the relevant authority's authorisation and a real integration before they can be represented as available.

UIDAI states that its database contains limited enrolment/update identity information and does not store the broader account/activity records of organisations using Aadhaar. Its authentication ecosystem uses authorised requesting entities to verify identity. This app provides no mechanism to write a waste-programme credential into Aadhaar. [UIDAI identity-data explanation](https://uidai.gov.in/hi/aadhaar-mythbusters), [UIDAI authentication ecosystem](https://uidai.gov.in/hi/authentication-partners).

## Verification

All 26 unit tests and TypeScript passed, including new tests for included sorting, comparison accounting, refunds/disputes, legacy records and identifier semantics.

A separate temporary Next.js instance on localhost:3108 used an isolated MongoDB database and synthetic resident/helper accounts, with payment/AI credentials disabled. API checks passed for membership weighing with zero sorting/additional charge; inclusion of measured sorting value only after receipt acceptance; zero unawarded government savings; owner-only stable IDs; concurrent migration; independent IDs for different accounts; download content/caching; and denial of another user's receipt acceptance. The ordinary production database and live gateway were not used for these tests.

Browser checks verified the displayed ₹5 internal fee comparison, ₹50 included-segregation comparison and ₹0 government benefit for the synthetic fixture; copying the participation ID; and the download link. The API download attachment itself was checked through authenticated HTTP. No government credential or Aadhaar integration was exercised or claimed. Temporary fixtures, server and QA project were removed after validation.
