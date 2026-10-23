import { pickupSurgePaise, validPickupTime } from "./pickup-time";
export const SORTING_PER_KG_PAISE = 500;
/** Waste Right's configured collection fees, not commodity resale estimates. */
export function pickupPrice(input: {
  source: string;
  weightKg: number;
  segregated: boolean;
  time: string;
}) {
  const valid =
    Number.isFinite(input.weightKg) &&
    input.weightKg > 0 &&
    validPickupTime(input.time);
  const collectionPaise = input.source === "basic" ? 2000 : 0;
  const sortingPaise =
    input.segregated || !valid
      ? 0
      : Math.ceil(input.weightKg * SORTING_PER_KG_PAISE);
  const surgePaise = pickupSurgePaise(
    input.time,
    input.weightKg,
    input.segregated,
  );
  return {
    valid,
    collectionPaise,
    sortingPaise,
    surgePaise,
    totalPaise: collectionPaise + sortingPaise + surgePaise,
  };
}
