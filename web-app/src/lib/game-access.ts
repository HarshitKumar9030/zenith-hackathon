import {createHash,randomBytes,randomUUID} from 'node:crypto';
import type {ObjectId} from 'mongodb';
export const GAME_ACCESS_MS=30*60*1000;
export const CODE_REDEMPTION_MS=24*60*60*1000;
export interface GamePass { _id:ObjectId; grantId:string; codeHash:string; issuedAt:Date; issuedBy:string; redeemBy:Date; activatedAt:Date|null; expiresAt:Date|null; revokedAt:Date|null; following:boolean; story:boolean }
export const normalizeGameCode=(value:string)=>value.toUpperCase().replace(/[\s-]/g,'');
export const hashGameCode=(value:string)=>createHash('sha256').update(normalizeGameCode(value)).digest('hex');
export function gamePassState(pass:GamePass|null,now=new Date()){
 if(!pass)return 'none';
 if(pass.revokedAt)return 'revoked';
 if(pass.activatedAt)return pass.expiresAt&&pass.expiresAt>now?'active':'expired';
 return pass.redeemBy>now?'pending':'expired';
}
export function createGamePass(userId:ObjectId,actor:string,following:boolean,story:boolean,now=new Date()){
 if(!following&&!story)throw new Error('Confirm the Instagram follow or story check before issuing access.');
 const code=randomBytes(6).toString('hex').toUpperCase();
 const pass:GamePass={_id:userId,grantId:randomUUID(),codeHash:hashGameCode(code),issuedAt:now,issuedBy:actor,redeemBy:new Date(now.getTime()+CODE_REDEMPTION_MS),activatedAt:null,expiresAt:null,revokedAt:null,following,story};
 return {code:code.match(/.{4}/g)!.join('-'),pass};
}
/** Atomic predicate prevents two concurrent redemptions from restarting the clock. */
export function redemptionFilter(userId:ObjectId,code:string,now:Date){return {_id:userId,codeHash:hashGameCode(code),activatedAt:null,revokedAt:null,redeemBy:{$gt:now}};}
export function activationTimes(now:Date){return {activatedAt:now,expiresAt:new Date(now.getTime()+GAME_ACCESS_MS)};}
export function publicGamePass(pass:GamePass|null,now=new Date()){
 return {state:gamePassState(pass,now),expiresAt:pass?.expiresAt?.toISOString()??null,redeemBy:pass?.redeemBy?.toISOString()??null,grantId:pass?.grantId??null};
}
