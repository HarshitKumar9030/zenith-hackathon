import { test } from "node:test";
import assert from "node:assert/strict";
import { pickupPrice } from "./pickup-pricing";
test("instant prices itemise sorting and evening fees for all funding sources", () => {
  const base = { weightKg: 1.5, segregated: false, time: "17:35" };
  const p = pickupPrice({ ...base, source: "basic" });
  assert.equal(p.collectionPaise, 1000);
  assert.equal(p.sortingPaise, 750);
  assert.equal(p.surgePaise, 600);
  assert.equal(p.totalPaise, 2350);
  assert.equal(pickupPrice({ ...base, source: "reward" }).totalPaise, 1350);
  assert.equal(pickupPrice({ ...base, source: "membership" }).totalPaise, 500);
  assert.equal(
    pickupPrice({ ...base, source: "reward", segregated: true, time: "09:37" })
      .totalPaise,
    0,
  );
});

test("Gold and Platinum allowance pickups include sorting before and after weighing", () => {
  for (const weightKg of [null, 1.5, 8, 10]) {
    const price = pickupPrice({ source: "membership", includedKg: 10, weightKg, segregated: false, time: "09:00" });
    assert.equal(price.sortingIncluded, true);
    assert.equal(price.sortingPending, false);
    assert.equal(price.sortingPaise, 0);
    assert.equal(price.totalPaise, 0);
  }
  const evening = pickupPrice({ source: "membership", weightKg: 8, segregated: false, time: "17:30" });
  assert.equal(evening.sortingPaise, 0);
  assert.equal(evening.surgePaise, 600); // Time/weight surcharge only; no segregation penalty.
  assert.equal(pickupPrice({ source: "basic", weightKg: 2, segregated: false, time: "09:00" }).sortingPaise, 1000);
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
  assert.equal(before.totalPaise, 1000);
  const after = pickupPrice({
    source: "basic",
    weightKg: 2.4,
    segregated: false,
    time: "09:00",
  });
  assert.equal(after.sortingPaise, 1200);
  assert.equal(after.excessPaise, 120);
  assert.equal(after.totalPaise, 2320);
  assert.equal(
    pickupPrice({
      source: "basic",
      weightKg: null,
      segregated: true,
      time: "09:00",
    }).totalPaise,
    1000,
  );
});

test('excess weight costs three rupees per measured kg for Basic, reward and both tiers',()=>{
 for(const [source,includedKg] of [['basic',2],['reward',2],['membership',8],['membership',10]] as const){
  const base={source,includedKg,segregated:true,time:'09:00'};
  assert.equal(pickupPrice({...base,weightKg:includedKg}).excessPaise,0);
  assert.equal(pickupPrice({...base,weightKg:includedKg+1}).excessPaise,300);
  assert.equal(pickupPrice({...base,weightKg:includedKg+.5}).excessPaise,150);
  assert.equal(pickupPrice({...base,weightKg:null}).excessPaise,0);
 }
});
