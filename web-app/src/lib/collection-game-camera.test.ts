import {test} from 'node:test';
import assert from 'node:assert/strict';
import {speedNeedleAngle,toggleDrivingCamera,driverView,chaseOffset} from './collection-game-camera';
test('speed needle clamps to the visible 0–100 km/h dial',()=>{assert.equal(speedNeedleAngle(0),-135);assert.equal(speedNeedleAngle(50),0);assert.equal(speedNeedleAngle(100),135);assert.equal(speedNeedleAngle(900),135);assert.equal(speedNeedleAngle(-10),-135);assert.equal(speedNeedleAngle(NaN),-135);});
test('camera toggle switches third and first person and returns from free look',()=>{assert.equal(toggleDrivingCamera(0),1);assert.equal(toggleDrivingCamera(1),0);assert.equal(toggleDrivingCamera(2),1);});
test('first-person eyes and target face the truck while chase camera stays behind',()=>{
 for(const h of [0,Math.PI/2,Math.PI,-Math.PI/2]){const view=driverView(10,20,h),chase=chaseOffset(h),dx=Math.cos(h),dz=-Math.sin(h);assert.ok((view.target.x-view.eye.x)*dx+(view.target.z-view.eye.z)*dz>20);assert.ok(chase.x*dx+chase.z*dz<0);assert.ok(Number.isFinite(chase.z));}
});
