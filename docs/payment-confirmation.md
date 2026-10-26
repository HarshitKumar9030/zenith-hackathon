# Pickup payment confirmation

The pickup screen restores the latest non-cancelled booking for the selected scan. Previously it could choose the first, older unpaid request, or show a fresh payment form after returning to Pickups even when the latest matching booking was paid. Paid bookings now show their confirmation and View pickup; another pickup requires the explicit Book another pickup action.

## Delayed confirmation

`POST /api/payments/status` accepts a booking ID, requires its resident session and reads only that resident's recorded order attempts. It checks initial collection fees separately from post-collection balances. Captured Razorpay payments are matched to order ID, exact recorded amount and INR currency before the existing idempotent bookkeeping function runs. This records a payment that a delayed/missing checkout callback or webhook did not yet apply. It does not capture an authorised payment, charge a card, create an order or trust a browser success flag.

Authorised payments remain Processing. Unreachable providers or unrecognised responses remain Unknown; mismatches/refunds/conflicting records require Operations review. These states do not open another payment window. A bounded read covers five recent attempts; if that limit prevents ruling out an older capture, the result stays Unknown rather than inviting a new charge. Automatic checks run about every five seconds for up to twelve attempts, with manual Check payment status and focus/visibility refresh available afterwards.

Checkout creation performs the same reconciliation before issuing a new order. A paid booking returns alreadyPaid and never opens Razorpay again. An existing unpaid order is reused only for the same resident, booking, stage, amount and INR currency. A verification failure after checkout returns a pending result rather than declaring the payment failed. Legacy pickups without a timeline array can now accept a captured payment correctly.

## Verification

- Unit tests cover latest paid booking selection over an old unpaid request, captured recovery from an older order, authorised/unknown states, amount/order mismatch and refunds, plus checkout suppression for paid/pending results.
- Isolated API tests cover ownership, signed capture/replay, legacy missing timelines, and already-paid checkout without a new order. Service tests also retain separate measured-balance payments.
- A synthetic paid pickup was opened in the production build, with an older unpaid booking for the same scan. The latest paid confirmation appeared and no Pay button appeared, including after reload. Fixture records and the temporary setup route were removed.

No real purchase, capture, refund or external email was performed in these checks. Existing legitimate fees and historical receipts are not rewritten.
