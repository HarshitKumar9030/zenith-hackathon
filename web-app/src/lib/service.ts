import { ObjectId, type Document } from "mongodb";
import { db } from "./db";
import { activityDay, streakSummary } from "./streak";
import { PLANS } from "./catalog";
export { PLANS } from "./catalog";
export type Plan = keyof typeof PLANS;
export const REWARD_COST = 10,
  MONTHLY_REDEMPTIONS = 2;
export function roleFor(user: Document) {
  const email = String(user.email).toLowerCase();
  if (
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .includes(email)
  )
    return "admin";
  return user.role === "collector" && user.collectorApproved === true
    ? "collector"
    : "resident";
}
export function newAccount(userId: ObjectId) {
  return {
    _id: userId,
    rev: 0,
    points: 0,
    rewardDays: [] as string[],
    credits: 0,
    redemptions: [] as { id: string; month: string; createdAt: string }[],
    bookings: [] as Document[],
    membership: null as Document | null,
    profile: { address: "", locality: "", alias: "", leaderboard: false },
    payments: [] as Document[],
  };
}
export type Account = ReturnType<typeof newAccount>;
export async function account(userId: ObjectId) {
  const collection = (await db()).collection<Account>("service_accounts");
  await collection.updateOne(
    { _id: userId },
    { $setOnInsert: newAccount(userId) },
    { upsert: true },
  );
  return (await collection.findOne({ _id: userId }))!;
}
// Each user's entitlements, points, bookings and payment grants share one atomic document.
export async function changeAccount<T>(
  userId: ObjectId,
  change: (a: Account) => T,
) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const a = await account(userId);
    const rev = a.rev;
    const result = change(a);
    a.rev++;
    const updated = await (
      await db()
    )
      .collection<Account>("service_accounts")
      .replaceOne({ _id: userId, rev }, a);
    if (updated.modifiedCount) return result;
  }
  throw new Error("Another update is in progress. Please retry.");
}
export function summarize(a: Account) {
  const now = new Date();
  const active =
    a.membership?.expiresAt && new Date(a.membership.expiresAt) > now
      ? a.membership
      : null;
  return {
    ...a,
    membership: active,
    role: undefined,
    streak: streakSummary(a.rewardDays),
    policy: {
      pointsPerDay: 1,
      pointsPerPickup: REWARD_COST,
      maxRedemptionsPerMonth: MONTHLY_REDEMPTIONS,
    },
    plans: PLANS,
  };
}
export function reward(a: Account, now = new Date()) {
  const day = activityDay(now);
  if (a.rewardDays.includes(day)) return false;
  a.rewardDays.push(day);
  a.points++;
  return true;
}
export function redeem(a: Account, now = new Date()) {
  const month = activityDay(now).slice(0, 7);
  if (a.points < REWARD_COST)
    throw new Error("You need 10 points for a pickup credit.");
  if (
    a.redemptions.filter((r) => r.month === month).length >= MONTHLY_REDEMPTIONS
  )
    throw new Error("You have redeemed two pickup credits this month.");
  a.points -= REWARD_COST;
  a.credits++;
  const redemption = {
    id: new ObjectId().toString(),
    month,
    createdAt: now.toISOString(),
  };
  a.redemptions.push(redemption);
  return redemption;
}
export function reserve(
  a: Account,
  input: { source: "reward" | "membership" | "basic"; weightKg: number },
  now = new Date(),
) {
  if (input.source === "reward") {
    if (a.credits < 1) throw new Error("No pickup credits available.");
    if (input.weightKg > 2) throw new Error("Reward pickups cover up to 2 kg.");
    a.credits--;
    return;
  }
  if (input.source === "membership") {
    const m = a.membership;
    if (!m || new Date(m.expiresAt) <= now)
      throw new Error("An active paid plan is required.");
    const plan = PLANS[m.plan as Plan];
    if (
      !plan ||
      m.remainingPickups < 1 ||
      m.remainingKg < input.weightKg ||
      input.weightKg > plan.perPickupKg
    )
      throw new Error("This pickup exceeds your remaining plan allowance.");
    m.remainingPickups--;
    m.remainingKg -= input.weightKg;
  } else if (input.weightKg > 2)
    throw new Error("Basic pickups cover up to 2 kg.");
}
