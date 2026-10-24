import { pickupSurgePaise, validPickupTime } from "./pickup-time";
import { PLANS } from "./catalog";
export const SORTING_PER_KG_PAISE = 500;
/** No resident weight estimate: null means the helper has not weighed the waste yet. */
export function pickupPrice(input: {
  source: string;
  weightKg?: number | null;
  segregated: boolean;
  time: string;
}) {
  const measured =
    typeof input.weightKg === "number" &&
    Number.isFinite(input.weightKg) &&
    input.weightKg > 0;
  const valid =
    validPickupTime(input.time) && (input.weightKg == null || measured);
  const collectionPaise =
    input.source === "basic" ? PLANS.basic.price * 100 : 0;
  const sortingIncluded = input.source === "membership";
  const sortingPaise =
    sortingIncluded || input.segregated || !measured
      ? 0
      : Math.ceil(input.weightKg! * SORTING_PER_KG_PAISE);
  const surgePaise = pickupSurgePaise(
    input.time,
    measured ? input.weightKg! : 0,
    input.segregated || sortingIncluded,
  );
  return {
    valid,
    measured,
    collectionPaise,
    sortingPaise,
    sortingIncluded,
    surgePaise,
    totalPaise: collectionPaise + sortingPaise + surgePaise,
    sortingPending: !sortingIncluded && !input.segregated && !measured,
  };
}
