# Waste Right: affordable organic collection

Updated 24 October 2026. This direction supersedes older pitch pricing where inconsistent.

## Confirmed status

The founder confirmed that government collaboration and funding are **proposed / applying**. No executed public-authority agreement or funding award has been supplied. Public wording must reflect this status.

The implemented **Basic base fee is ₹10**, reduced from ₹15. Its current limit remains 2 kg. Gold remains ₹599 and Platinum ₹699. Existing sorting and evening charges still apply; historic bookings retain their recorded fees.

## Proposed organic discount

Recommended starting policy: ₹1 off per helper-verified kg of segregated organic material accepted for processing, with a ₹5 collection-fee floor. Use measured weight and verified quality, never image-estimated weight. Apply no organic discount to mixed, rejected or contaminated loads. Membership/reward pickups already cover the base fee and should not also generate a cash discount on that same fee.

| Eligible organic weight | Proposed Basic base fee, before extra fees |
| --- | ---: |
| 0 kg | ₹10 |
| 0.5 kg | ₹9.50 |
| 1 kg | ₹9 |
| 2 kg | ₹8 |

**At the existing 2 kg Basic limit, the attainable range is ₹8–₹10.** The ₹5 floor is reachable only under a future service allowing 5 kg or more; do not advertise ₹5 for the current plan. A stronger ₹2.50/kg discount could reach ₹5 within 2 kg, but needs measured cost evidence before adoption.

The discount is a proposal, **not active checkout behaviour**. Initial payment currently precedes helper weighing. Enabling same-pickup discounts therefore requires a separate verified-organic-weight field, resident approval and a once-only refund/credit ledger. Choose and disclose refund versus future-pickup credit explicitly; a credit is not an immediate price reduction. Do not reprice paid orders silently.

## Operations and income

The resident scans or describes waste and corrects the suggestions. A helper measures the collection. Waste Right groups stops into dense routes and supplies accepted organic material to a contracted biogas/CBG operator. The receiving plant acknowledges accepted weight and quality.

Start as a collection/aggregation partner. Agree accepted feedstocks, contamination limits, delivered price, transport responsibility, rejection rules and payment timing before offering a discount funded by feedstock income. Waste Right earns its contracted payment or share; it cannot also count all gas/manure sales belonging to the processor.

Recurring income may include customer collection fees, allocated subscription receipts, contracted feedstock payments and separately contracted public-service payments. Count each only when earned. More organic weight does not automatically mean greater margin: transport, handling and rejection costs also rise.

**Contribution per pickup = earned customer fee + contracted feedstock/service income − helper pay − transport − handling/rejections − payment costs − earned discount.**

Profit additionally deducts fixed operating expenses. Grants belong in a separate funding schedule, subject to their permitted uses. Use zero public-service support and zero grant funding in the base case until agreements establish entitlement. Track route stops/hour, distance, accepted kg, rejection rate, partner payments, effective customer charge and contribution before expansion. Review Gold/Platinum economics alongside cheaper Basic pricing, accounting for their larger weight limits.

## Government research

**GOBARdhan:** MoPNG's 1 October 2026 announcement describes an integrated CBG scheme covering FY 2026–27 to FY 2035–36, including offtake, pricing, capital assistance, pipeline infrastructure, credit support and ecosystem development. It identifies feedstock collection and aggregation as participation opportunities. Programme features do not establish Waste Right's eligibility, funding award or partnership. Plant-level assistance and gas offtake cannot simply be assumed to accrue to a collection app. [Official scheme launch](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2317937&lang=2&reg=48).

**₹25 lakh challenge:** MoHUA's official September 2022 update describes ₹25 lakh for ten selected startups in the Swachhata Startup Challenge launched in January 2022. Applications ran 27 January–15 April 2022; the award ceremony was scheduled for 20 September 2022. This is historical competitive funding. No current application window or Waste Right selection was verified. [Official challenge update](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1860635&lang=2&reg=48).

**PPP:** the Ministry of Finance describes a contractual arrangement with a public entity, private partner, defined risk allocation and performance standards. Programme registration, an application or a grant alone does not establish a PPP or government ownership. Use “proposed municipal/processing partnership” until the appropriate agreement exists. [Ministry of Finance PPP FAQ](https://www.pppinindia.gov.in/faqs).

## Participation record

Propose a **Waste Right Organic Contribution Record**: verifiable ID, issuer, collection date, helper-measured accepted organic weight, resident approval, downstream acknowledgement and any applied discount or credit. Publish no personal address in a verification view.

Until authorised, label it: **“Issued by Waste Right. Government collaboration proposed; no government endorsement is claimed.”** It is an independent service record, not a government certificate, carbon credit or quantified emissions claim. Official issuer names, programme credentials and government branding require the relevant authority's authorisation. Earlier records must not imply retroactive approval.

## Pitch wording

> Waste Right starts with a ₹10 Basic pickup and is developing incentives for verified, segregated organic waste. We are seeking partnerships with biogas operators and public authorities aligned with GOBARdhan. User fees, subscriptions and contracted collection or feedstock income fund the service. Government collaboration and funding are being pursued; a measured locality pilot will establish operating margins.

## Implementation scope

Implemented: ₹10 shared catalog price, current UI price copy linked to that catalog, and updated existing pricing-test expectations. Proposed only: organic discounts and their settlement, participation-record generation, government partnership and grants. The existing PPTX decks remain historical snapshots and have not been rewritten in this update.

## Validation

All 21 existing unit tests and TypeScript passed. The current localhost landing page displayed ₹10 Basic, ₹599 Gold and ₹699 Platinum; expanding the fee details showed the unchanged sorting/evening policy. No framework overlay or browser errors appeared. Existing GSAP warnings about a missing `.art-float` target were observed and are outside this pricing change. Integration fixtures were updated to use recorded booking amounts, but the MongoDB/provider integration suite was not rerun. The organic discount, official credentials and programme funding remain proposals.
