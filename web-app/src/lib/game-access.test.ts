import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ObjectId} from 'mongodb';
import {activationTimes,createGamePass,hashGameCode,normalizeGameCode,publicGamePass,gamePassState,redemptionFilter,GAME_ACCESS_MS} from './game-access';
const now=new Date('2026-10-28T10:00:00Z'),id=new ObjectId();
test('codes require a manual check, are random, normalized and never persisted in plaintext',()=>{
 assert.throws(()=>createGamePass(id,'ops',false,false,now),/Confirm/);
 const a=createGamePass(id,'ops',true,false,now),b=createGamePass(id,'ops',false,true,now);
 assert.match(a.code,/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);assert.notEqual(a.code,b.code);
 assert.equal(a.pass.codeHash,hashGameCode(a.code.toLowerCase()));assert.equal(normalizeGameCode(' abcd - 1234 '),'ABCD1234');
 assert.equal(JSON.stringify(a.pass).includes(a.code),false);
 assert.equal(gamePassState(a.pass,now),'pending');
 assert.equal(gamePassState(a.pass,new Date(now.getTime()+86400000)),'expired');
 assert.equal('codeHash' in publicGamePass(a.pass),false);
});
test('activation is thirty minutes, exact expiry is enforced and revocation wins',()=>{
 const {pass}=createGamePass(id,'ops',true,true,now);
 Object.assign(pass,activationTimes(now));
 assert.equal(pass.expiresAt!.getTime()-now.getTime(),GAME_ACCESS_MS);
 assert.equal(gamePassState(pass,new Date(now.getTime()+GAME_ACCESS_MS-1)),'active');
 assert.equal(gamePassState(pass,new Date(now.getTime()+GAME_ACCESS_MS)),'expired');
 pass.revokedAt=now;assert.equal(gamePassState(pass,now),'revoked');assert.equal(gamePassState(null,now),'none');
});
test('redemption predicate binds account, hash, unused state, revocation and validity',()=>{
 const filter=redemptionFilter(id,'ABCD-1234-5678',now);
 assert.equal(filter._id,id);assert.equal(filter.codeHash,hashGameCode('abcd12345678'));
 assert.equal(filter.activatedAt,null);assert.equal(filter.revokedAt,null);assert.equal(filter.redeemBy.$gt,now);
});
