import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validPickupTime,
  surgeTime,
  pickupTimeLabel,
  pickupSurgePaise,
} from "./pickup-time";
test("pickup times allow exact minutes within service hours and exclude the break", () => {
  for (const time of ["07:00", "09:37", "13:59", "17:00", "18:43", "19:00"])
    assert.equal(validPickupTime(time), true, time);
  for (const time of [
    "06:59",
    "14:00",
    "14:35",
    "16:59",
    "19:01",
    "23:00",
    "07:60",
    "7:00",
    "09:00–12:00",
  ])
    assert.equal(validPickupTime(time), false, time);
});
test("evening hours carry a surge flag", () => {
  assert.equal(surgeTime("13:59"), false);
  assert.equal(surgeTime("16:59"), false);
  assert.equal(surgeTime("17:00"), true);
  assert.equal(surgeTime("19:00"), true);
  assert.equal(pickupTimeLabel("17:35"), "5:35 pm");
});

test("evening surcharge stays between five and seven rupees using disclosed factors", () => {
  assert.equal(pickupSurgePaise("13:30", 5, false), 0);
  assert.equal(pickupSurgePaise("17:30", 1, true), 500);
  assert.equal(pickupSurgePaise("17:30", 3, true), 600);
  assert.equal(pickupSurgePaise("18:05", 1, false), 600);
  assert.equal(pickupSurgePaise("18:05", 3, false), 700);
});
