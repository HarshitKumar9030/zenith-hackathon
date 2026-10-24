import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openCameraStream} from './camera';
function feed(deviceId:string,facingMode:string){let stopped=0;const track={stop:()=>{stopped++},getSettings:()=>({deviceId,facingMode})};return {stream:{getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream,stopped:()=>stopped}}
test('phone switching releases the previous camera before requesting the other facing mode',async()=>{
 const back=feed('back','environment'),front=feed('front','user');let constraints:MediaStreamConstraints|undefined;
 const result=await openCameraStream({getUserMedia:async value=>{constraints=value;assert.equal(back.stopped(),1);return front.stream}},{facing:'user',previous:back.stream,isCurrent:()=>true});
 assert.deepEqual((constraints?.video as MediaTrackConstraints).facingMode,{exact:'user'});assert.equal(result?.facing,'user');assert.equal(result?.restored,false);assert.equal(front.stopped(),0);
});
test('an unavailable front camera restores the previous device instead of leaving a black preview',async()=>{
 const back=feed('back','environment'),restored=feed('back','environment');let requests=0;
 const result=await openCameraStream({getUserMedia:async value=>{if(++requests===1)throw new Error('Unavailable');assert.deepEqual((value?.video as MediaTrackConstraints).deviceId,{exact:'back'});return restored.stream}},{facing:'user',previous:back.stream,isCurrent:()=>true});
 assert.equal(result?.restored,true);assert.equal(result?.facing,'environment');assert.equal(requests,2);
});
test('a browser returning the same lens is detected and recovered',async()=>{
 const back=feed('back','environment'),wrong=feed('back','environment'),restored=feed('back','environment');let requests=0;
 const result=await openCameraStream({getUserMedia:async()=>++requests===1?wrong.stream:restored.stream},{facing:'user',previous:back.stream,isCurrent:()=>true});
 assert.equal(wrong.stopped(),1);assert.equal(result?.restored,true);
});
test('streams resolving after cancellation are closed without activating the camera',async()=>{
 const front=feed('front','user');let current=true;
 const result=await openCameraStream({getUserMedia:async()=>{current=false;return front.stream}},{facing:'user',previous:null,isCurrent:()=>current});
 assert.equal(result,null);assert.equal(front.stopped(),1);
});
test('cancelling a failed switch never starts a recovery request',async()=>{
 const back=feed('back','environment');let current=true,requests=0;
 const result=await openCameraStream({getUserMedia:async()=>{requests++;current=false;throw new Error('Cancelled')}},{facing:'user',previous:back.stream,isCurrent:()=>current});
 assert.equal(result,null);assert.equal(requests,1);
});
test('initial camera permission errors propagate and do not retry',async()=>{
 let requests=0;await assert.rejects(()=>openCameraStream({getUserMedia:async()=>{requests++;throw new Error('Permission denied')}},{facing:'environment',previous:null,isCurrent:()=>true}),/Permission denied/);assert.equal(requests,1);
});
