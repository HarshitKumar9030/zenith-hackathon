import {test} from 'node:test';import assert from 'node:assert/strict';
import {newDiscoveryState,applyDiscoveryScan,applyDiscoveryDebit,reviewDiscoveryScan,restoreDiscoveryPenalty,perceptualDistance,DISCOVERY_DAILY_LIMIT} from './discovery-policy';
const at=new Date('2026-10-26T06:00:00Z');
const fp=(exact='first',perceptual='5'.repeat(64))=>({exact,perceptual,width:800,height:600});
test('first scan earns once; repeat warns, third image applies 35% once and never earns',()=>{
 const state=newDiscoveryState(99,0,at);
 assert.equal(applyDiscoveryScan(state,{scanId:'a',fingerprint:fp(),hasWaste:true,now:at}).delta,1);assert.equal(state.balance,100);
 assert.equal(applyDiscoveryScan(state,{scanId:'b',fingerprint:fp(),hasWaste:true,now:at}).reason,'duplicate_image');assert.equal(state.balance,100);
 const penalty=applyDiscoveryScan(state,{scanId:'c',fingerprint:fp(),hasWaste:true,now:at});assert.equal(penalty.delta,-35);assert.equal(state.balance,65);
 assert.equal(applyDiscoveryScan(state,{scanId:'c',fingerprint:fp(),hasWaste:true,now:at}).delta,-35);assert.equal(state.balance,65);
 applyDiscoveryScan(state,{scanId:'d',fingerprint:fp(),hasWaste:true,now:at});assert.equal(state.balance,65);assert.equal(state.penalties,35);
 restoreDiscoveryPenalty(state,penalty.id,'admin','Review found an accidental repeated capture');assert.equal(state.balance,100);
 restoreDiscoveryPenalty(state,penalty.id,'admin','Retry same restoration');assert.equal(state.balance,100);
});
test('35% is rounded down, never negative; a fresh 24-hour window resets detection',()=>{
 const state=newDiscoveryState(1,0,at);for(const scanId of ['a','b','c'])applyDiscoveryScan(state,{scanId,fingerprint:fp(),hasWaste:true,now:at});assert.equal(state.balance,2);assert.equal(state.penalties,0);
 const later=new Date(at.getTime()+86400001);assert.equal(applyDiscoveryScan(state,{scanId:'later',fingerprint:fp(),hasWaste:true,now:later}).delta,1);
});
test('similar or cross-account frames are held without automatic penalties and reviewed once',()=>{
 const state=newDiscoveryState(20,0,at);applyDiscoveryScan(state,{scanId:'a',fingerprint:fp(),hasWaste:true,now:at});
 const near=applyDiscoveryScan(state,{scanId:'b',fingerprint:fp('different','4'+'5'.repeat(63)),hasWaste:true,now:at});assert.equal(near.reason,'similar_image_review');assert.equal(near.delta,0);assert.equal(state.penalties,0);
 reviewDiscoveryScan(state,'b',true,'admin','Compared photos: separate legitimate waste');assert.equal(state.balance,22);reviewDiscoveryScan(state,'b',true,'admin','Retry');assert.equal(state.balance,22);
 const shared=applyDiscoveryScan(state,{scanId:'c',fingerprint:fp('third','a'.repeat(64)),hasWaste:true,sharedWithScanId:'other-account-scan',now:at});assert.equal(shared.reason,'shared_image_review');assert.equal(shared.delta,0);
 reviewDiscoveryScan(state,'c',false,'admin','Reused source image');assert.equal(state.balance,22);
});
test('text, no-waste and flat-image similarity never fabricate reward evidence',()=>{
 const state=newDiscoveryState(0,0,at);assert.equal(applyDiscoveryScan(state,{scanId:'text',hasWaste:true,now:at}).reason,'no_photo');assert.equal(applyDiscoveryScan(state,{scanId:'empty',fingerprint:fp(),hasWaste:false,now:at}).reason,'no_waste');
 assert.equal(applyDiscoveryScan(state,{scanId:'one',fingerprint:fp('solid1','0'.repeat(64)),hasWaste:true,now:at}).delta,1);assert.equal(applyDiscoveryScan(state,{scanId:'two',fingerprint:fp('solid2','0'.repeat(64)),hasWaste:true,now:at}).delta,1);
 assert.equal(perceptualDistance('0'.repeat(64),'f'.repeat(64)),256);assert.equal(perceptualDistance('bad','bad'),256);
});
test('daily cap prevents unlimited rewards and resets by India calendar day',()=>{
 const state=newDiscoveryState(10,DISCOVERY_DAILY_LIMIT,at);assert.equal(applyDiscoveryScan(state,{scanId:'cap',fingerprint:fp('cap'),hasWaste:true,now:at}).reason,'daily_limit');assert.equal(state.balance,10);
 assert.equal(applyDiscoveryScan(state,{scanId:'new-day',fingerprint:fp('new','a'.repeat(64)),hasWaste:true,now:new Date('2026-10-27T01:00:00Z')}).delta,1);
});
test('redemptions are affordable, idempotent and reference-bound',()=>{
 const state=newDiscoveryState(100,0,at),input={id:'order-1',points:60,reason:'Prize handover',reference:'GIFT-001',actor:'admin',signature:'same',prize:'Bottle'};
 applyDiscoveryDebit(state,input);assert.equal(state.balance,40);assert.equal(state.spent,60);applyDiscoveryDebit(state,input);assert.equal(state.balance,40);
 assert.throws(()=>applyDiscoveryDebit(state,{...input,points:2,signature:'changed'}),/different/);
 assert.throws(()=>applyDiscoveryDebit(state,{...input,id:'order-2',points:41}),/enough/);assert.equal(state.balance,40);
 for(const points of [0,-1,1.5,NaN,Infinity])assert.throws(()=>applyDiscoveryDebit(state,{...input,id:'invalid',points}));
});
