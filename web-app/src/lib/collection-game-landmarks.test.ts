import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ECO_TRAIL,visitEcoTrail} from './collection-game-landmarks';
test('exploration gates reward once, require proximity and cap the round clock',()=>{
 const seen=new Set<string>(),p=ECO_TRAIL[0];
 assert.equal(visitEcoTrail(seen,p.x+20,p.z,200),null);assert.equal(seen.size,0);
 assert.equal(visitEcoTrail(seen,p.x,p.z,298)?.bonus,2);
 assert.equal(visitEcoTrail(seen,p.x,p.z,100),null);
 const q=ECO_TRAIL[1];assert.equal(visitEcoTrail(seen,q.x,q.z,100)?.bonus,5);
 assert.equal(new Set(ECO_TRAIL.map(p=>p.id)).size,ECO_TRAIL.length);
});
