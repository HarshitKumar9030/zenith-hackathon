"use client";
import {
  validPickupTime,
  surgeTime,
  pickupSurgePaise,
} from "@/lib/pickup-time";
export default function PickupTimeInput({
  value,
  onChange,
  weightKg = 0,
  segregated = false,
}: {
  value: string;
  onChange: (value: string) => void;
  weightKg?: number;
  segregated?: boolean;
}) {
  const valid = validPickupTime(value);
  return (
    <label className="field">
      Pickup time (IST)
      <input
        type="time"
        aria-label="Pickup time"
        value={value}
        min="07:00"
        max="19:00"
        step="60"
        required
        onChange={(e) => {
          e.currentTarget.setCustomValidity(
            validPickupTime(e.target.value)
              ? ""
              : "Choose 7 am–2 pm or 5 pm–7 pm. The 2–5 pm break is unavailable.",
          );
          onChange(e.target.value);
        }}
        aria-invalid={!valid}
      />
      <small>
        {!valid
          ? "Choose 7 am–2 pm or 5 pm–7 pm. No pickups during the 2–5 pm break."
          : surgeTime(value)
            ? `5–7 pm · ₹${pickupSurgePaise(value, weightKg, segregated) / 100} extra: ₹5 evening base${weightKg > 2 ? " + ₹1 above 2 kg" : ""}${!segregated ? " + ₹1 unsegregated" : ""}. Applies to Basic, plan and reward pickups.`
            : "7 am–2 pm · Standard hours. Choose any minute."}
      </small>
    </label>
  );
}
