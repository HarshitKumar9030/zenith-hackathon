import {test} from 'node:test';import assert from 'node:assert/strict';
import {validTrackingPoint,trackingQuality,canReadTracking} from './tracking';
const now=Date.now(),point={latitude:28.6,longitude:77.2,accuracy:12,timestamp:now};
test('tracking rejects invalid, stale and future device fixes',()=>{assert.equal(validTrackingPoint(point,now),true);for(const p of [{...point,latitude:91},{...point,accuracy:0},{...point,longitude:Infinity},{...point,timestamp:now-91000},{...point,timestamp:now+11000}])assert.equal(validTrackingPoint(p,now),false)});
test('reported accuracy and freshness remain separate from a precision promise',()=>{assert.equal(trackingQuality(point,now),'live');assert.equal(trackingQuality({...point,accuracy:500},now),'approximate');assert.equal(trackingQuality(point,now+31000),'stale')});
test('only the pickup owner and assigned helper may read tracking',()=>{assert.equal(canReadTracking('resident','resident','helper'),true);assert.equal(canReadTracking('helper','resident','helper'),true);assert.equal(canReadTracking('other','resident','helper'),false)});
import {estimateArrival} from './tracking';
test('arrival range requires recent precise fixes and a destination',()=>{assert.equal(estimateArrival(point,null,now),null);assert.equal(estimateArrival({...point,accuracy:101},{latitude:28.61,longitude:77.2},now),null);assert.equal(estimateArrival(point,{latitude:28.61,longitude:77.2},now+31000),null);const eta=estimateArrival(point,{latitude:28.61,longitude:77.2},now);assert.ok(eta&&eta.minMinutes>=2&&eta.maxMinutes>eta.minMinutes)});
