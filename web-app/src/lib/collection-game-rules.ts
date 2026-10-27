export const WASTE_TYPES = ["organic", "plastic", "paper", "metal", "glass", "ewaste"] as const;
export type WasteType = typeof WASTE_TYPES[number];
export const WASTE: Record<WasteType, { label: string; color: string; target: number; points: number }> = {
  organic: { label: "Organic", color: "#afdc63", target: 3, points: 100 },
  plastic: { label: "Plastic", color: "#76bfff", target: 3, points: 100 },
  paper: { label: "Paper", color: "#f4d18c", target: 2, points: 100 },
  metal: { label: "Metal", color: "#c1cdd8", target: 1, points: 150 },
  glass: { label: "Glass", color: "#62e2ba", target: 2, points: 150 },
  ewaste: { label: "E-waste", color: "#c6a3ff", target: 1, points: 200 },
};
export const ROUND_SECONDS = 300;
export const TOTAL_TARGET = WASTE_TYPES.reduce((sum, type) => sum + WASTE[type].target, 0);
export const emptyCargo = (): Record<WasteType, number> => ({ organic: 0, plastic: 0, paper: 0, metal: 0, glass: 0, ewaste: 0 });
export function canCollect(type: WasteType, cargo: Record<WasteType, number>, collected: Set<string>, id: string) {
  return !collected.has(id) && cargo[type] < WASTE[type].target;
}
export function finalScore(cargo: Record<WasteType, number>, remainingSeconds: number) {
  const base = WASTE_TYPES.reduce((sum, t) => sum + Math.min(cargo[t], WASTE[t].target) * WASTE[t].points, 0);
  const complete = WASTE_TYPES.every(t => cargo[t] >= WASTE[t].target);
  return base + (complete ? Math.max(0, Math.floor(remainingSeconds)) * 5 : 0);
}
export interface BoxCollider { center: number[]; size: number[] }
export function blocked(x: number, z: number, colliders: BoxCollider[]) {
  if (Math.abs(x) > 370 || Math.abs(z) > 370) return true;
  return colliders.some(c => Math.abs(x - c.center[0]) < c.size[0] / 2 + 2.6 && Math.abs(z - c.center[2]) < c.size[2] / 2 + 2.6);
}
