/** All pickup times are local to India (Asia/Kolkata). */
export function validPickupTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return false;
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

/** First valid service minute after a lead time, independent of the host timezone. */
export function nextPickupSlot(now = Date.now(), leadMinutes = 15) {
 const start = Math.ceil((now + leadMinutes * 60000) / 60000) * 60000;
 for (let minute = 0; minute <= 1440; minute++) {
  const local = new Date(start + minute * 60000 + 330 * 60000).toISOString();
  const time = local.slice(11, 16);
  if(validPickupTime(time)) return {date:local.slice(0,10),time};
 }
 throw new Error("No collection slot is available.");
}
