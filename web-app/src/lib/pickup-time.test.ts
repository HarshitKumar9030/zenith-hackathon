import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validPickupTime,surgeTime,pickupTimeLabel,pickupSurgePaise} from './pickup-time';
test('hackathon pickups accept all 24 hours including the former break',()=>{
 for(const t of ['00:00','06:59','14:00','16:59','19:01','23:59'])assert.equal(validPickupTime(t),true,t);
 for(const t of ['24:00','07:60','7:00','09:00–12:00',''])assert.equal(validPickupTime(t),false,t);
});
test('no time or sorting combination adds surge',()=>{for(const t of ['00:00','14:30','17:30','23:59'])for(const kg of [0,1,5,20])for(const sorted of [true,false]){assert.equal(surgeTime(t),false);assert.equal(pickupSurgePaise(t,kg,sorted),0)}assert.equal(pickupTimeLabel('17:35'),'5:35 pm')});
