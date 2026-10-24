/** All pickup times are local to India (Asia/Kolkata). */
export function validPickupTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  if (minutes > 59) return false;
  return hours <= 23 && minutes <= 59;
}
/** Hackathon policy: no evening surcharge or service break. */
export function surgeTime(_value: string) { return false; }
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
  return 0;
}
