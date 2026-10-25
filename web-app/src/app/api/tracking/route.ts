import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {ObjectId,type Document} from 'mongodb';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser,checkOrigin,hashToken} from '@/lib/auth';
import {roleFor} from '@/lib/service';
import {estimateArrival,TRACKING_SESSION_MS,PAIRING_MS,validTrackingPoint,trackingQuality,canReadTracking,type TrackingPoint} from '@/lib/tracking';
export const dynamic='force-dynamic';
const options={headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{...options,status});
const bookingId=z.string().regex(/^[a-f0-9]{24}$/);
const payload=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),bookingId}),z.object({action:z.literal('pair'),code:z.string().regex(/^[a-f0-9]{24}$/)}),
 z.object({action:z.literal('heartbeat')}),
 z.object({action:z.literal('stop'),bookingId:bookingId.optional()}),
 z.object({action:z.literal('update'),latitude:z.number(),longitude:z.number(),accuracy:z.number(),timestamp:z.number()}),
]);
type Track=Document&{_id:string;helperId:string;ownerId:string;passwordVersion:string;tokenHash:string;expiresAt:Date;point?:TrackingPoint;receivedAt?:Date};
async function booking(id:string){
 const d=await db();const a=await d.collection('service_accounts').findOne({'bookings.id':id},{projection:{_id:1,bookings:{$elemMatch:{id}}}});
 return a?{ownerId:String(a._id),job:a.bookings[0]}:null;
}
async function allowedAssignment(id:string,helperId:string){
 const b=await booking(id);if(!b||b.job.status!=='assigned'||b.job.collectorId!==helperId)return null;
 const h=await (await db()).collection('users').findOne({_id:new ObjectId(helperId)});
 return h&&roleFor(h)==='collector'?{...b,helper:h}:null;
}
export async function GET(req:Request){
 try{
  const user=await currentUser();if(!user)return reply({error:'Sign in first.'},401);
  const id=bookingId.parse(new URL(req.url).searchParams.get('bookingId'));
  const b=await booking(id);if(!b||!canReadTracking(String(user._id),b.ownerId,b.job.collectorId||''))return reply({error:'Pickup not found.'},404);
  const tracks=(await db()).collection<Track>('pickup_tracking');
  if(b.job.status!=='assigned'){await tracks.deleteOne({_id:id});return reply({state:'ended'});}
  const t=await tracks.findOne({_id:id,expiresAt:{$gt:new Date()}});
  if(!t)return reply({state:'waiting'});
  const permitted=await allowedAssignment(id,t.helperId);
  if(!permitted||hashToken(permitted.helper.password)!==t.passwordVersion){await tracks.deleteOne({_id:id});return reply({state:'ended'});}
  const point=t.point&&Date.now()-t.point.timestamp<=120000?t.point:null;
  const account=await (await db()).collection('service_accounts').findOne({_id:new ObjectId(b.ownerId)},{projection:{'profile.location':1}});
  const rawDestination=b.job.location||account?.profile?.location||null;
  const destination=rawDestination&&[rawDestination.latitude,rawDestination.longitude].every(Number.isFinite)&&Math.abs(rawDestination.latitude)<=90&&Math.abs(rawDestination.longitude)<=180?{latitude:rawDestination.latitude,longitude:rawDestination.longitude}:null;
  const eta=point?estimateArrival(point,destination):null;
  return reply({destination,eta,state:point?trackingQuality(point):'waiting',point,receivedAt:t.receivedAt||null,expiresAt:t.expiresAt});
 }catch{return reply({error:'Tracking is temporarily unavailable.'},400);}
}
export async function POST(req:Request){
 try{
  checkOrigin(req);const data=payload.parse(await req.json());const d=await db(),tracks=d.collection<Track>('pickup_tracking');
  if(data.action==='create'){
   const user=await currentUser();if(!user||roleFor(user)!=='collector')return reply({error:'Approved helper access required.'},403);
   if(!await allowedAssignment(data.bookingId,String(user._id)))return reply({error:'Only your assigned pickup can be paired.'},403);
   const code=randomBytes(12).toString('hex');const expiresAt=new Date(Date.now()+PAIRING_MS);
   await d.collection('tracking_pairings').replaceOne({_id:data.bookingId as never},{_id:data.bookingId as never,codeHash:hashToken(code),helperId:String(user._id),expiresAt},{upsert:true});
   return reply({code,expiresAt,server:new URL(process.env.APP_URL||req.url).origin});
  }
  if(data.action==='pair'){
   const pair=await d.collection('tracking_pairings').findOneAndDelete({codeHash:hashToken(data.code),expiresAt:{$gt:new Date()}});
   if(!pair)return reply({error:'Pairing code expired or already used. Request a new code.'},401);
   const b=await allowedAssignment(String(pair._id),pair.helperId);if(!b)return reply({error:'Pickup is no longer assigned to this helper.'},409);
   const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+TRACKING_SESSION_MS);
   await tracks.deleteMany({helperId:pair.helperId});
   await tracks.replaceOne({_id:String(pair._id)},{_id:String(pair._id),helperId:pair.helperId,ownerId:b.ownerId,passwordVersion:hashToken(b.helper.password),tokenHash:hashToken(token),expiresAt},{upsert:true});
   return reply({token,bookingId:String(pair._id),item:b.job.item,expiresAt});
  }
  const bearer=req.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  let track:Track|null=null;
  if(bearer)track=await tracks.findOne({tokenHash:hashToken(bearer),expiresAt:{$gt:new Date()}});
  else if(data.action==='stop'&&data.bookingId){
   const user=await currentUser();if(user&&roleFor(user)==='collector'){
    await d.collection('tracking_pairings').deleteOne({_id:data.bookingId as never,helperId:String(user._id)});
    track=await tracks.findOne({_id:data.bookingId,helperId:String(user._id)});
   }
  }
  if(!track)return data.action==='stop'?reply({ok:true}):reply({error:'Tracking session ended. Pair again.'},401);
  if(data.action==='stop'){await tracks.deleteOne({_id:track._id,tokenHash:track.tokenHash});return reply({ok:true});}
  const assignment=await allowedAssignment(track._id,track.helperId);
  if(!assignment||hashToken(assignment.helper.password)!==track.passwordVersion){await tracks.deleteOne({_id:track._id});return reply({error:'Pickup tracking has ended.'},409);}
  if(data.action==='heartbeat')return reply({ok:true});
  const point={latitude:data.latitude,longitude:data.longitude,accuracy:data.accuracy,timestamp:data.timestamp};
  if(!validTrackingPoint(point))return reply({error:'A fresh, valid GPS fix is required.'},400);
  if(track.receivedAt&&Date.now()-track.receivedAt.getTime()<2000)return reply({error:'Please wait before sending another location.'},429);
  await tracks.updateOne({_id:track._id,tokenHash:track.tokenHash,$or:[{'point.timestamp':{$lt:point.timestamp}},{point:{$exists:false}}]},{$set:{point,receivedAt:new Date()}});
  return reply({ok:true});
 }catch(error){return reply({error:error instanceof z.ZodError?'Invalid tracking request.':'Tracking is temporarily unavailable.'},400);}
}
