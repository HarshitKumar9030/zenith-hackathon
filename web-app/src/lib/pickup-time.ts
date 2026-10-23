/** All pickup times are local to India (Asia/Kolkata). */
export function validPickupTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  if (minutes > 59) return false;
  const total = hours * 60 + minutes;
  return (
    (total >= 7 * 60 && total < 14 * 60) ||
    (total >= 17 * 60 && total <= 19 * 60)
  );
}
export function surgeTime(value: string) {
  return validPickupTime(value) && Number(value.slice(0, 2)) >= 17;
}
export function pickupTimeLabel(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value; // Keep older collection-window records readable.
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "pm" : "am"}`;
}

export function pickupSurgePaise(
  time: string,
  weightKg: number,
  segregated: boolean,
) {
  return surgeTime(time)
    ? 500 + (weightKg > 2 ? 100 : 0) + (segregated ? 0 : 100)
    : 0;
}
