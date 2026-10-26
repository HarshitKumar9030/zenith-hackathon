# Pickup review flow

A scan marked with unknown or special handling cannot use ordinary pickup booking. Previously, saving an unchanged “Not sure” handling choice returned a confirmed scan, so the user could cycle between Review item details and Schedule a pickup.

The checklist now explains the required handling choice inline, opens the controls and focuses the handling section. Everyday household waste can be marked Ordinary; batteries, electronics and hazardous items must remain Special. Special items explicitly explain that specialist help is needed rather than implying ordinary booking is available.

After an ordinary scan is corrected through the booking review action, the dashboard updates its cached scan and returns directly to Pickups. The server-side special-handling restriction remains intact.

Validation: TypeScript, 60 unit tests, and a browser check with a synthetic uncertain plastic-bottle scan. Continue exposed the handling explanation; selecting Ordinary cleared it. No real scan was modified or payment made during this browser check.

## Special collection requests

Confirmed Special items now continue to an Operations review request rather than sending the resident back to Help. The server sets `source=quote`, `status=quote_requested` and no payable fee yet, consumes no plan allowance/reward credit and performs no demo assignment. The resident sees that packing, price and weight limits require agreement. Existing Operations estimate and resident acceptance/payment flow must complete before a special-pickup-approved helper can claim the scheduled job. Unknown handling still requires clarification; this does not automatically certify that hazardous material is accepted.
