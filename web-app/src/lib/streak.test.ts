import { test } from "node:test";
import assert from "node:assert/strict";
import { streakSummary, activityDay } from "./streak";
const now = new Date("2026-10-23T12:00:00Z");
test("multiple identifications per day count once", () =>
  assert.equal(
    streakSummary(["2026-10-23", "2026-10-23", "2026-10-22"], now).streak,
    2,
  ));
test("yesterday streak remains until end of today", () =>
  assert.equal(streakSummary(["2026-10-22", "2026-10-21"], now).streak, 2));
test("a missed day resets the streak", () =>
  assert.equal(streakSummary(["2026-10-21"], now).streak, 0));
test("Indian calendar boundary is explicit", () =>
  assert.equal(activityDay("2026-10-22T19:00:00Z"), "2026-10-23"));
test("week is seven days and distinguishes today", () => {
  const s = streakSummary([], now);
  assert.equal(s.week.length, 7);
  assert.equal(s.week[6].today, true);
  assert.equal(s.todayActive, false);
});
