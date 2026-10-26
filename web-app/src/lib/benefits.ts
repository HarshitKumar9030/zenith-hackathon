export type ParticipationRecord = {
  id: string;
  issuer: "EcoMitra";
  issuedAt: string;
  governmentIssued: false;
  aadhaarLinked: false;
  qualifyingPickupId: string;
};

export type BenefitBooking = {
  id?: string;
  status?: string;
  source?: string;
  segregated?: boolean;
  benefitReferenceBasePaise?: number;
  pricing?: { collectionPaise?: number };
  governmentBenefit?: {receivedPaise:number;residentCreditPaise:number;status:string;receiptReference:string;processorReference:string;residentCreditReference:string};
  receipt?: {
    netKg?: number;
    material?: string;
    sortingIncluded?: boolean;
    sortingReferencePaise?: number;
  };
};

export function benefitSummary(input: {
  bookings: readonly BenefitBooking[];
  payments: readonly { bookingId?: string; status?: string }[];
}) {
  let feeReductionPaise = 0, includedSortingPaise = 0, verifiedKg = 0, completedPickups = 0, organicPickups = 0, organicKg = 0;
  let governmentSavingsPaise = 0;
  let qualifyingPickupId: string | null = null;
  const excluded = new Set(input.payments
    .filter((p) => p.bookingId && ["refunded", "partially_refunded", "review_needed"].includes(p.status || ""))
    .map((p) => p.bookingId));
  for (const b of input.bookings) {
    if (b.status !== "completed" || !b.receipt || (b.id && excluded.has(b.id))) continue;
    const kg = b.receipt.netKg;
    if (typeof kg !== "number" || !Number.isFinite(kg) || kg <= 0) continue;
    verifiedKg += kg;
    completedPickups++;
    const material = b.receipt.material?.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (b.id && material && ["food_waste", "garden_waste", "organic", "organic_waste", "kitchen_waste"].includes(material)) {
      const g=b.governmentBenefit;
      if(g?.status === "credited" && validPaise(g.receivedPaise) && g.receivedPaise > 0 && validPaise(g.residentCreditPaise) && g.residentCreditPaise === Math.floor(g.receivedPaise / 2) && g.receiptReference && g.processorReference && g.residentCreditReference) governmentSavingsPaise += g.residentCreditPaise;
      organicPickups++;
      organicKg += kg;
      qualifyingPickupId ??= b.id;
    }
    const reference = b.benefitReferenceBasePaise;
    const paidBase = b.pricing?.collectionPaise;
    if (b.source === "basic" && validPaise(reference) && validPaise(paidBase))
      feeReductionPaise += Math.max(0, reference - paidBase);
    if (b.source === "membership" && !b.segregated && b.receipt.sortingIncluded === true && validPaise(b.receipt.sortingReferencePaise))
      includedSortingPaise += b.receipt.sortingReferencePaise;
  }
  return {
    feeReductionPaise,
    includedSortingPaise,
    verifiedKg: Math.round(verifiedKg * 1000) / 1000,
    completedPickups,
    organicPickups,
    organicKg: Math.round(organicKg * 1000) / 1000,
    qualifyingPickupId,
    governmentSavingsPaise,
    governmentStatus: "proposed" as const,
  };
}

function validPaise(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export type BenefitSummary = ReturnType<typeof benefitSummary>;
