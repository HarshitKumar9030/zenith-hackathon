export const PLANS = {
  basic: {
    name: "Basic",
    price: 15,
    pickups: 1,
    perPickupKg: 2,
    monthlyKg: 2,
    recoveryPercent: 0,
  },
  gold: {
    name: "Gold",
    price: 599,
    pickups: 14,
    perPickupKg: 8,
    monthlyKg: 112,
    recoveryPercent: 10,
  },
  platinum: {
    name: "Platinum",
    price: 699,
    pickups: 24,
    perPickupKg: 10,
    monthlyKg: 240,
    recoveryPercent: 15,
  },
} as const;
