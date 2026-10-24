import { test } from "node:test";
import assert from "node:assert/strict";
import { benefitSummary, type BenefitBooking } from "./benefits";
const basic: BenefitBooking = {
  id: "basic", source: "basic", status: "completed", benefitReferenceBasePaise: 1500,
  pricing: { collectionPaise: 1000 }, receipt: { netKg: 2 },
};
const member: BenefitBooking = {
  id: "member", source: "membership", status: "completed", segregated: false,
  receipt: { netKg: 8, sortingIncluded: true, sortingReferencePaise: 4000 },
};
test("benefits use completed measured records and separate comparison values from government funding", () => {
  const s = benefitSummary({ bookings: [basic, member], payments: [] });
  assert.equal(s.feeReductionPaise, 500);
  assert.equal(s.includedSortingPaise, 4000);
  assert.equal(s.governmentSavingsPaise, 0);
  assert.equal(s.governmentStatus, "proposed");
  assert.equal(s.verifiedKg, 10);
  assert.equal(s.completedPickups, 2);
});
test("unaccepted, disputed, cancelled, refunded and invalid records do not become savings", () => {
  for (const status of ["receipt_pending", "payment_due_after_collection", "disputed", "cancelled", "scheduled"]) {
    assert.equal(benefitSummary({ bookings: [{ ...basic, status }], payments: [] }).feeReductionPaise, 0);
  }
  for (const status of ["refunded", "partially_refunded", "review_needed"])
    assert.equal(benefitSummary({ bookings: [basic], payments: [{ bookingId: "basic", status }] }).feeReductionPaise, 0);
  assert.equal(benefitSummary({ bookings: [{ ...basic, receipt: { netKg: NaN } }], payments: [] }).completedPickups, 0);
});
test("legacy records and already separated waste do not invent a sorting benefit", () => {
  const s = benefitSummary({ bookings: [
    { ...basic, benefitReferenceBasePaise: undefined },
    { ...member, segregated: true },
    { ...member, receipt: { netKg: 8 } },
    { ...basic, benefitReferenceBasePaise: 900 },
  ], payments: [] });
  assert.equal(s.includedSortingPaise, 0);
  assert.equal(s.feeReductionPaise, 0);
});
