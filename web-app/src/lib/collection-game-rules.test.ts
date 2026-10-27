import { test } from "node:test";
import assert from "node:assert/strict";
import { blocked, canCollect, emptyCargo, finalScore, WASTE, WASTE_TYPES } from "./collection-game-rules";
test("a pickup cannot score twice or overfill a mission category", () => {
 const cargo = emptyCargo(); const taken = new Set(["a"]);
 assert.equal(canCollect("organic", cargo, taken, "a"), false);
 assert.equal(canCollect("organic", cargo, taken, "b"), true);
 cargo.organic = 3; assert.equal(canCollect("organic", cargo, taken, "b"), false);
});
test("time bonus requires every waste category and never uses negative time", () => {
 const cargo = emptyCargo(); cargo.organic = 3;
 assert.equal(finalScore(cargo, 100), 300);
 for (const t of WASTE_TYPES) cargo[t] = WASTE[t].target;
 assert.equal(finalScore(cargo, 100) - finalScore(cargo, 0), 500);
 assert.equal(finalScore(cargo, -20), finalScore(cargo, 0));
});
test("truck collision includes half-width, world boundaries and open roads", () => {
 const c = [{center:[0,10,0],size:[20,20,20]}];
 assert.equal(blocked(12,0,c), true); assert.equal(blocked(14,0,c), false);
 assert.equal(blocked(371,0,[]), true); assert.equal(blocked(-360,330,c), false);
});
