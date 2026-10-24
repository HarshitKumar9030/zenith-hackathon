import {test} from 'node:test';import assert from 'node:assert/strict';import {ObjectId} from 'mongodb';import {assignDemoHelper} from './demo-assignment';
test('demo assignment uses a real helper once and never bypasses payment',()=>{
 const helper={_id:new ObjectId()};
 const scheduled={status:'scheduled',events:[]} as Record<string,any>;assignDemoHelper(scheduled,helper);assert.equal(scheduled.status,'assigned');assert.equal(scheduled.collectorId,String(helper._id));assignDemoHelper(scheduled,{_id:new ObjectId()});assert.equal(scheduled.events.length,1);assert.equal(scheduled.collectorId,String(helper._id));
 for(const status of ['payment_due','completed','cancelled']){const b={status,events:[]};assignDemoHelper(b,helper);assert.equal(b.status,status)}
 const noHelper={status:'scheduled',events:[]};assignDemoHelper(noHelper,null);assert.equal(noHelper.status,'scheduled');
});
