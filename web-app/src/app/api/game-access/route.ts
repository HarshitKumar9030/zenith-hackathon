import {NextResponse} from 'next/server';
import {z} from 'zod';
import {ObjectId} from 'mongodb';
import {currentUser,checkOrigin,hashToken} from '@/lib/auth';
import {db} from '@/lib/db';
import {roleFor} from '@/lib/service';
import {activationTimes,createGamePass,hashGameCode,publicGamePass,gamePassState,redemptionFilter,type GamePass} from '@/lib/game-access';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('issue'),email:z.email().max(254),following:z.boolean(),story:z.boolean()}).strict(),
 z.object({action:z.literal('redeem'),code:z.string().min(1).max(40)}).strict(),
 z.object({action:z.literal('revoke'),userId:z.string().regex(/^[a-f\d]{24}$/i),grantId:z.string().uuid()}).strict(),
 z.object({action:z.literal('start')}).strict(),
]);
export async function GET(request:Request){
 try{
  const user=await currentUser(),now=new Date();
  if(!user)return json({user:null,state:'none',serverNow:now.toISOString()});
  const database=await db(),passes=database.collection<GamePass>('game_access');
  if(new URL(request.url).searchParams.get('admin')==='1'){
   if(roleFor(user)!=='admin')return json({error:'Administrator access required.'},403);
   const records=await passes.find({}).sort({issuedAt:-1}).limit(100).toArray();
   const users=await database.collection('users').find({_id:{$in:records.map(p=>p._id)}},{projection:{name:1,email:1}}).toArray();
   return json({passes:records.map(p=>{const u=users.find(u=>String(u._id)===String(p._id));return {...publicGamePass(p,now),userId:String(p._id),name:u?.name||'Participant',email:u?.email||'',issuedAt:p.issuedAt,following:p.following,story:p.story};}),serverNow:now.toISOString()});
  }
  const pass=await passes.findOne({_id:user._id});
  return json({user:{name:user.name,email:user.email,id:String(user._id)},...publicGamePass(pass,now),serverNow:now.toISOString()});
 }catch{return json({error:'Game access could not be checked. Please try again.'},503);}
}
export async function POST(request:Request){
 try{checkOrigin(request);}catch{return json({error:'Cross-origin request rejected.'},403);}
 try{
  const user=await currentUser();if(!user)return json({error:'Sign in to your account first.'},401);
  const raw=await request.text();if(raw.length>2048)return json({error:'Request too large.'},413);
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return json({error:'Check the fields and try again.'},400);
  const data=parsed.data,database=await db(),passes=database.collection<GamePass>('game_access'),now=new Date();
  if(data.action==='issue'||data.action==='revoke'){
   if(roleFor(user)!=='admin')return json({error:'Administrator access required.'},403);
   if(data.action==='issue'){
    const target=await database.collection('users').findOne({email:data.email.trim().toLowerCase()},{projection:{_id:1,email:1,name:1}});
    if(!target)return json({error:'Ask the participant to create an account first, then enter its email.'},404);
    const {code,pass}=createGamePass(target._id,String(user._id),data.following,data.story,now);
    const {_id,...fields}=pass;
    await passes.updateOne({_id},{$set:fields,$push:{audit:{$each:[{action:'issued',at:now,actor:String(user._id),grantId:pass.grantId}],$slice:-50}} as never},{upsert:true});
    return json({code,name:target.name,email:target.email,...publicGamePass(pass,now),message:'Code created. This replaces any previous pass for this account.'});
   }
   const result=await passes.updateOne({_id:new ObjectId(data.userId),grantId:data.grantId,revokedAt:null},{$set:{revokedAt:now},$push:{audit:{$each:[{action:'revoked',at:now,actor:String(user._id),grantId:data.grantId}],$slice:-50}} as never});
   if(!result.matchedCount)return json({error:'This pass has already changed. Refresh the list.'},409);
   return json({message:'Access revoked.'});
  }
  if(data.action==='start'){
   const pass=await passes.findOne({_id:user._id});
   if(gamePassState(pass,now)!=='active')return json({error:'Your game access has expired. Ask the team for a new code.'},403);
   return json({...publicGamePass(pass,now),serverNow:now.toISOString()});
  }
  // A code is bound to this authenticated account, never transferable to another participant.
  const window=Math.floor(now.getTime()/600000);
  const bucket=await database.collection('auth_attempts').findOneAndUpdate({_id:`game-code:${window}:${hashToken(String(user._id))}` as never},{$inc:{count:1},$set:{expiresAt:new Date(now.getTime()+1200000)}},{upsert:true,returnDocument:'after'});
  if((bucket?.count||0)>10)return json({error:'Too many attempts. Try again in ten minutes.'},429);
  const pass=await passes.findOneAndUpdate(redemptionFilter(user._id,data.code,now),{$set:activationTimes(now),$push:{audit:{$each:[{action:'activated',at:now,actor:String(user._id)}],$slice:-50}} as never},{returnDocument:'after'});
  if(pass)return json({...publicGamePass(pass,now),serverNow:now.toISOString()});
  const existing=await passes.findOne({_id:user._id,codeHash:hashGameCode(data.code)});
  if(gamePassState(existing,now)==='active')return json({...publicGamePass(existing,now),serverNow:now.toISOString()});
  return json({error:'This code is invalid, expired or belongs to another account. Check with the team.'},400);
 }catch(error){if(error instanceof SyntaxError)return json({error:'Invalid request.'},400);if(error instanceof Error&&error.message.startsWith('Confirm the Instagram'))return json({error:error.message},400);return json({error:'Game access could not be updated. Please try again.'},503);}
}
