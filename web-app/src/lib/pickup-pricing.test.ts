import { test } from "node:test";
import assert from "node:assert/strict";
import { pickupPrice } from "./pickup-pricing";
test("instant prices itemise sorting and evening fees for all funding sources", () => {
  const base = { weightKg: 1.5, segregated: false, time: "17:35" };
  const p = pickupPrice({ ...base, source: "basic" });
  assert.equal(p.collectionPaise, 1500);
  assert.equal(p.sortingPaise, 750);
  assert.equal(p.surgePaise, 600);
  assert.equal(p.totalPaise, 2850);
  for (const source of ["reward", "membership"])
    assert.equal(pickupPrice({ ...base, source }).totalPaise, 1350);
  assert.equal(
    pickupPrice({ ...base, source: "reward", segregated: true, time: "09:37" })
      .totalPaise,
    0,
  );
});
test("a quote needs a valid weight and an available time", () => {
  for (const weightKg of [0, -1, NaN])
    assert.equal(
      pickupPrice({
        source: "basic",
        weightKg,
        segregated: false,
        time: "09:00",
      }).valid,
      false,
    );
  assert.equal(
    pickupPrice({
      source: "basic",
      weightKg: 1,
      segregated: true,
      time: "15:00",
    }).valid,
    false,
  );
});

test("residents book without weight and sorting is added only after helper measurement", () => {
  const before = pickupPrice({
    source: "basic",
    weightKg: null,
    segregated: false,
    time: "09:00",
  });
  assert.equal(before.valid, true);
  assert.equal(before.sortingPending, true);
  assert.equal(before.totalPaise, 1500);
  const after = pickupPrice({
    source: "basic",
    weightKg: 2.4,
    segregated: false,
    time: "09:00",
  });
  assert.equal(after.sortingPaise, 1200);
  assert.equal(after.totalPaise, 2700);
  assert.equal(
    pickupPrice({
      source: "basic",
      weightKg: null,
      segregated: true,
      time: "09:00",
    }).totalPaise,
    1500,
  );
});
