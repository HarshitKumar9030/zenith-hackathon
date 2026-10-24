import { pickupSurgePaise, validPickupTime } from "./pickup-time";
import { PLANS } from "./catalog";
export const SORTING_PER_KG_PAISE = 500;
export const EXCESS_PER_KG_PAISE = 300;
/** No resident weight estimate: null means the helper has not weighed the waste yet. */
export function pickupPrice(input: {
  source: string;
  weightKg?: number | null;
  includedKg?: number;
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
  const includedKg = input.includedKg ?? (sortingIncluded ? PLANS.gold.perPickupKg : PLANS.basic.perPickupKg);
  const excessKg = measured ? Math.max(0, Math.round((input.weightKg! - includedKg) * 1000) / 1000) : 0;
  const excessPaise = Math.round(excessKg * EXCESS_PER_KG_PAISE);
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
    includedKg,
    excessKg,
    excessPaise,
    surgePaise,
    totalPaise: collectionPaise + sortingPaise + surgePaise + excessPaise,
    sortingPending: !sortingIncluded && !input.segregated && !measured,
  };
}
