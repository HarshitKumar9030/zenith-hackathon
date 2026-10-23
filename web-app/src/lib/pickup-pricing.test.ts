import { test } from "node:test";
import assert from "node:assert/strict";
import { pickupPrice } from "./pickup-pricing";
test("instant prices itemise sorting and evening fees for all funding sources", () => {
  const base = { weightKg: 1.5, segregated: false, time: "17:35" };
  const p = pickupPrice({ ...base, source: "basic" });
  assert.equal(p.collectionPaise, 2000);
  assert.equal(p.sortingPaise, 750);
  assert.equal(p.surgePaise, 600);
  assert.equal(p.totalPaise, 3350);
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
