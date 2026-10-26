import type {ScanFingerprint} from './scan-fingerprint';
import {activityDay} from './streak';
export const DISCOVERY_DAILY_LIMIT=30;
const DAY=86400000;
export type DiscoveryEvent={id:string;kind:'scan'|'penalty'|'redemption'|'deduction'|'review'|'restoration';delta:number;reason:string;at:string;reference?:string;actor?:string;prize?:string;target?:string;signature?:string;matchScanId?:string;reviewed?:boolean};
export type DiscoverySample=ScanFingerprint & {scanId:string;at:number;repeats:number;penalized:boolean};
export type DiscoveryState={balance:number;earned:number;spent:number;penalties:number;events:DiscoveryEvent[];samples:DiscoverySample[];migrationDay:string;migrationDayEarned:number};
export function newDiscoveryState(legacyPoints=0,legacyToday=0,now=new Date()):DiscoveryState{return {balance:legacyPoints,earned:legacyPoints,spent:0,penalties:0,events:[],samples:[],migrationDay:activityDay(now),migrationDayEarned:legacyToday};}
export function perceptualDistance(a:string,b:string){if(!/^[a-f0-9]{64}$/.test(a)||!/^[a-f0-9]{64}$/.test(b))return 256;let total=0;for(let i=0;i<a.length;i++){let value=parseInt(a[i],16)^parseInt(b[i],16);while(value){total+=value&1;value>>=1;}}return total;}
function informative(hash:string){let ones=0;for(const ch of hash){let n=parseInt(ch,16);while(n){ones+=n&1;n>>=1;}}return ones>=16&&ones<=240;}
function append(state:DiscoveryState,event:DiscoveryEvent){if(state.events.length>=20000)throw new Error('Discovery ledger needs archiving by Operations. No points were changed.');state.events.push(event);return event;}
export function applyDiscoveryScan(state:DiscoveryState,input:{scanId:string;fingerprint?:ScanFingerprint;hasWaste:boolean;sharedWithScanId?:string;now?:Date}){
 const now=input.now??new Date(),at=now.toISOString(),id=`scan:${input.scanId}`;
 const prior=state.events.find(e=>e.id===id);if(prior)return prior;
 const base={id,kind:'scan' as const,delta:0,at};
 if(!input.fingerprint)return append(state,{...base,reason:'no_photo'});
 if(!input.hasWaste)return append(state,{...base,reason:'no_waste'});
 state.samples=state.samples.filter(sample=>sample.at>now.getTime()-DAY);
 const fp=input.fingerprint;
 const exact=state.samples.find(sample=>sample.exact===fp.exact);
 if(exact){
  exact.repeats++;
  if(exact.repeats>=2&&!exact.penalized){
   const amount=Math.floor(state.balance*35/100);exact.penalized=true;state.balance-=amount;state.penalties+=amount;
   return append(state,{...base,kind:'penalty',delta:-amount,reason:'repeated_image_35_percent',matchScanId:exact.scanId});
  }
  return append(state,{...base,reason:'duplicate_image',matchScanId:exact.scanId});
 }
 const similar=informative(fp.perceptual)?state.samples.find(sample=>informative(sample.perceptual)&&Math.abs((sample.width/sample.height)/(fp.width/fp.height)-1)<.05&&perceptualDistance(sample.perceptual,fp.perceptual)<=6):undefined;
 state.samples.push({...fp,scanId:input.scanId,at:now.getTime(),repeats:0,penalized:false});
 if(input.sharedWithScanId)return append(state,{...base,reason:'shared_image_review',matchScanId:input.sharedWithScanId});
 if(similar)return append(state,{...base,reason:'similar_image_review',matchScanId:similar.scanId});
 const today=activityDay(now);
 const start=Date.parse(`${today}T00:00:00+05:30`);
 const earnedToday=(state.migrationDay===today?state.migrationDayEarned:0)+state.events.filter(e=>e.kind==='scan'&&e.delta===1&&Date.parse(e.at)>=start&&Date.parse(e.at)<start+DAY).length;
 if(earnedToday>=DISCOVERY_DAILY_LIMIT)return append(state,{...base,reason:'daily_limit'});
 state.balance++;state.earned++;
 return append(state,{...base,delta:1,reason:'earned'});
}
export function applyDiscoveryDebit(state:DiscoveryState,input:{id:string;points:number;reason:string;reference:string;actor:string;signature:string;prize?:string;now?:Date}){
 const prior=state.events.find(e=>e.id===input.id);if(prior){if(prior.signature!==input.signature)throw new Error('This reference was already used for a different points transaction.');return prior;}
 if(!Number.isSafeInteger(input.points)||input.points<=0)throw new Error('Enter a positive whole number of points.');
 if(state.balance<input.points)throw new Error('This user does not have enough Discovery Points.');
 // Check ledger capacity before mutating even when used outside the repository CAS.
 if(state.events.length>=20000)throw new Error('Discovery ledger needs archiving by Operations.');
 state.balance-=input.points;state.spent+=input.points;
 return append(state,{id:input.id,kind:input.prize?'redemption':'deduction',delta:-input.points,reason:input.reason,reference:input.reference,actor:input.actor,signature:input.signature,prize:input.prize,at:(input.now??new Date()).toISOString()});
}
export function reviewDiscoveryScan(state:DiscoveryState,scanId:string,approve:boolean,actor:string,reason:string){
 const id=`review:${scanId}`,prior=state.events.find(e=>e.id===id);if(prior)return prior;
 const target=state.events.find(e=>e.id===`scan:${scanId}`);
 if(!target||!['similar_image_review','shared_image_review'].includes(target.reason)||target.reviewed)throw new Error('This scan is not awaiting review.');
 const event=append(state,{id,kind:'review',delta:approve?1:0,reason,actor,target:target.id,at:new Date().toISOString()});
 target.reviewed=true;if(approve){state.balance++;state.earned++;}return event;
}
export function restoreDiscoveryPenalty(state:DiscoveryState,eventId:string,actor:string,reason:string){
 const id=`restore:${eventId}`,prior=state.events.find(e=>e.id===id);if(prior)return prior;
 const penalty=state.events.find(e=>e.id===eventId&&e.kind==='penalty');if(!penalty)throw new Error('Penalty not found.');
 const event=append(state,{id,kind:'restoration',delta:-penalty.delta,reason,actor,target:eventId,at:new Date().toISOString()});
 state.balance-=penalty.delta;state.penalties+=penalty.delta;return event;
}
