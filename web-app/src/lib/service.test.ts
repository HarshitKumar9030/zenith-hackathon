import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { newAccount, reward, redeem, reserve, roleFor } from "./service";
test("only one point per India calendar day", () => {
  const a = newAccount(new ObjectId());
  assert.equal(reward(a, new Date("2026-10-23T06:00Z")), true);
  assert.equal(reward(a, new Date("2026-10-23T12:00Z")), false);
  assert.equal(a.points, 1);
});
test("redemption keeps points and credits atomic", () => {
  const a = newAccount(new ObjectId());
  a.points = 30;
  const now = new Date("2026-10-23");
  redeem(a, now);
  redeem(a, now);
  assert.throws(() => redeem(a, now));
  assert.equal(a.points, 10);
  assert.equal(a.credits, 2);
});
test("cannot spend an absent reward or overbook an allowance", () => {
  const a = newAccount(new ObjectId());
  assert.throws(() => reserve(a, { source: "reward", weightKg: 1 }));
  a.membership = {
    plan: "gold",
    remainingPickups: 1,
    remainingKg: 2,
    expiresAt: "2099-01-01",
  };
  assert.throws(() => reserve(a, { source: "membership", weightKg: 3 }));
  reserve(a, { source: "membership", weightKg: 2 });
  assert.equal(a.membership.remainingPickups, 0);
  const empty = newAccount(new ObjectId());
  empty.membership = {
    plan: "gold",
    remainingPickups: 2,
    remainingKg: 0,
    expiresAt: "2099-01-01",
  };
  assert.throws(() => reserve(empty, { source: "membership", weightKg: 0 }));
  assert.throws(() => reserve(a, { source: "membership", weightKg: 1 }));
});
test("collector roles require approval; requested role is not sufficient", () => {
  assert.equal(
    roleFor({ email: "nobody@test.invalid", role: "collector" }),
    "resident",
  );
  assert.equal(
    roleFor({
      email: "nobody@test.invalid",
      role: "collector",
      collectorApproved: true,
    }),
    "collector",
  );
});
