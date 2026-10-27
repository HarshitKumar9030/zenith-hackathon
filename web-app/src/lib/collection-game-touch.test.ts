import { test } from "node:test";
import assert from "node:assert/strict";
import { TouchDriveState, steeringFromOffset } from "./collection-game-touch";
test("separate fingers can steer, accelerate and brake without releasing each other", () => {
 const pad = new TouchDriveState(); pad.steer(.6); pad.press(1,"accelerate"); pad.press(2,"brake");
 assert.deepEqual(pad.snapshot(),{steering:.6,throttle:1,brake:true});
 pad.release(1); assert.deepEqual(pad.snapshot(),{steering:.6,throttle:0,brake:true});
 pad.release(2); assert.equal(pad.snapshot().brake,false);
});
test("cancel, blur or pause reset every held input; reverse wins conflicting pedals", () => {
 const pad = new TouchDriveState();pad.press(1,"accelerate");pad.press(3,"reverse");pad.steer(-1);
 assert.equal(pad.snapshot().throttle,-1);pad.reset();assert.deepEqual(pad.snapshot(),{steering:0,throttle:0,brake:false});
 pad.release(999);assert.equal(pad.snapshot().throttle,0);
});
test("small thumb drift has a dead zone and steering stays bounded outside the pad", () => {
 assert.equal(steeringFromOffset(3,45),0);assert.equal(steeringFromOffset(90,45),1);assert.equal(steeringFromOffset(-90,45),-1);
 assert.ok(steeringFromOffset(25,45)>.3);assert.equal(steeringFromOffset(10,0),0);
});
