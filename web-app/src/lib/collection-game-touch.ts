export type TouchPedal = "accelerate" | "brake" | "reverse";
export interface TouchDrive { steering: number; throttle: number; brake: boolean }
/** Tracks fingers independently so releasing a pedal never releases another finger. */
export class TouchDriveState {
 private pedals = new Map<number, TouchPedal>();
 private steering = 0;
 steer(value: number) { this.steering = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; }
 press(pointer: number, pedal: TouchPedal) { this.pedals.set(pointer, pedal); }
 release(pointer: number) { this.pedals.delete(pointer); }
 reset() { this.pedals.clear(); this.steering = 0; }
 snapshot(): TouchDrive {
  const held = new Set(this.pedals.values());
  return { steering: this.steering, throttle: held.has("reverse") ? -1 : held.has("accelerate") ? 1 : 0, brake: held.has("brake") };
 }
}
export function steeringFromOffset(offset: number, radius: number) {
 if (!Number.isFinite(offset) || !Number.isFinite(radius) || radius <= 0) return 0;
 const normalized = Math.max(-1, Math.min(1, offset / radius));
 return Math.abs(normalized) < .1 ? 0 : Math.sign(normalized) * (Math.abs(normalized) - .1) / .9;
}
