import {ObjectId,type Db} from 'mongodb';
import {db} from './db';
import {changeDiscovery} from './discovery-wallet';
import {applyDiscoveryScan} from './discovery-policy';
import type {ScanFingerprint} from './scan-fingerprint';
export async function recordDiscoveryScan(input:{userId:ObjectId;scanId:ObjectId;fingerprint?:ScanFingerprint;thumbnail?:string;hasWaste:boolean},store?:Db){
 const database=store??await db();let sharedWithScanId:string|undefined;
 if(input.fingerprint&&input.hasWaste){
  const registry=database.collection('discovery_image_registry'),key=input.fingerprint.exact;
  try{await registry.updateOne({_id:key as never},{$setOnInsert:{userId:input.userId,scanId:String(input.scanId),createdAt:new Date(),expiresAt:new Date(Date.now()+30*86400000)}},{upsert:true});}catch(error){if((error as {code?:number}).code!==11000)throw error;}
  const owner=await registry.findOne({_id:key as never});if(owner&&String(owner.userId)!==String(input.userId))sharedWithScanId=owner.scanId;
  if(input.thumbnail)await database.collection('discovery_review_images').updateOne({_id:input.scanId},{$setOnInsert:{userId:input.userId,thumbnail:input.thumbnail,createdAt:new Date(),expiresAt:new Date(Date.now()+7*86400000)}},{upsert:true});
 }
 return changeDiscovery(input.userId,state=>applyDiscoveryScan(state,{scanId:String(input.scanId),fingerprint:input.fingerprint,hasWaste:input.hasWaste,sharedWithScanId}),database);
}
export function discoveryScanMessage(reason:string,delta:number){
 if(reason==='earned')return '+1 Discovery Point · View your ranking in Discovery Points.';
 if(reason==='duplicate_image')return 'Repeated photo: no extra point. A third identical submission within 24 hours applies a 35% points deduction.';
 if(reason==='repeated_image_35_percent')return `Repeated-photo penalty: ${-delta} Discovery Points deducted (35%, rounded down).`;
 if(reason==='similar_image_review'||reason==='shared_image_review')return 'This photo needs an admin review before it earns a Discovery Point. No penalty has been applied.';
 if(reason==='daily_limit')return 'Your 30-point daily scan limit is reached. You can still identify waste.';
 if(reason==='no_photo')return 'Discovery prize points require a waste photograph. Text identification remains available.';
 return 'No Discovery Point earned: show the waste clearly in a photograph.';
}
