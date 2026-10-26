import {NextResponse} from 'next/server';
import {ObjectId} from 'mongodb';
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {currentUser,checkOrigin} from '@/lib/auth';
import {roleFor} from '@/lib/service';
import {db} from '@/lib/db';
import {discoveryWallet,changeDiscovery,discoveryReference} from '@/lib/discovery-wallet';
import {applyDiscoveryDebit,reviewDiscoveryScan,restoreDiscoveryPenalty} from '@/lib/discovery-policy';
const objectId=z.string().regex(/^[a-f\d]{24}$/i);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create_prize'),name:z.string().trim().min(2).max(80),description:z.string().trim().max(200).default(''),cost:z.number().int().positive().max(100000)}),
 z.object({action:z.literal('set_prize_active'),prizeId:objectId,active:z.boolean()}),
 z.object({action:z.literal('redeem'),userId:objectId,prizeId:objectId,reference:z.string().trim().min(4).max(100)}),
 z.object({action:z.literal('deduct'),userId:objectId,points:z.number().int().positive().max(100000),reason:z.string().trim().min(5).max(200),reference:z.string().trim().min(4).max(100)}),
 z.object({action:z.literal('review'),userId:objectId,scanId:objectId,approve:z.boolean(),reason:z.string().trim().min(5).max(200)}),
 z.object({action:z.literal('restore_penalty'),userId:objectId,eventId:z.string().max(100),reason:z.string().trim().min(5).max(200)}),
]);
async function admin(){const user=await currentUser();return user&&roleFor(user)==='admin'?user:null;}
export async function GET(request:Request){
 try{
  if(!await admin())return NextResponse.json({error:'Administrator access required.'},{status:403});
  const database=await db(),params=new URL(request.url).searchParams,q=(params.get('q')??'').trim().slice(0,100),userId=params.get('userId');
  const imageId=params.get('scanId');
  if(imageId){
   const image=await database.collection('discovery_review_images').findOne({_id:new ObjectId(objectId.parse(imageId)),expiresAt:{$gt:new Date()}});
   if(!image)return NextResponse.json({error:'Review image expired or unavailable.'},{status:404});
   return new NextResponse(Buffer.from(String(image.thumbnail).split(',')[1],'base64'),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  const regex=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const [users,prizes]=await Promise.all([
   database.collection('users').find(q?{$or:[{name:{$regex:regex,$options:'i'}},{email:{$regex:regex,$options:'i'}}]}:{},{projection:{name:1,email:1}}).limit(30).toArray(),
   database.collection('discovery_prizes').find({}).sort({createdAt:-1}).limit(100).toArray(),
  ]);
  let wallet=null;
  if(userId){const id=new ObjectId(objectId.parse(userId));if(!await database.collection('users').findOne({_id:id}))throw new Error('User not found.');const saved=await discoveryWallet(id,database);wallet={balance:saved.balance,earned:saved.earned,spent:saved.spent,penalties:saved.penalties,events:saved.events.slice(-60).reverse(),pending:saved.events.filter(e=>['similar_image_review','shared_image_review'].includes(e.reason)&&!e.reviewed).slice(-50).reverse(),penaltyEvents:saved.events.filter(e=>e.kind==='penalty'&&!saved.events.some(r=>r.target===e.id&&r.kind==='restoration')).slice(-20).reverse()};}
  return NextResponse.json({users:users.map(u=>({id:String(u._id),name:u.name,email:u.email})),prizes:prizes.map(p=>({...p,_id:String(p._id)})),wallet},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Discovery shop could not be loaded.'},{status:503});}
}
export async function POST(request:Request){
 try{
  checkOrigin(request);const user=await admin();if(!user)return NextResponse.json({error:'Administrator access required.'},{status:403});
  const input=schema.parse(await request.json()),database=await db();
  if(input.action==='create_prize'){
   const count=await database.collection('discovery_prizes').countDocuments();if(count>=100)throw new Error('The prize catalogue is full. Edit an existing prize.');
   const result=await database.collection('discovery_prizes').insertOne({name:input.name,description:input.description,cost:input.cost,active:true,createdAt:new Date(),createdBy:String(user._id)});
   return NextResponse.json({message:'Prize added.',id:String(result.insertedId)});
  }
  if(input.action==='set_prize_active'){
   const result=await database.collection('discovery_prizes').updateOne({_id:new ObjectId(input.prizeId)},{$set:{active:input.active}});if(!result.matchedCount)throw new Error('Prize not found.');return NextResponse.json({message:'Prize updated.'});
  }
  const targetId=new ObjectId(input.userId);if(!await database.collection('users').findOne({_id:targetId}))throw new Error('User not found.');
  let movement;
  if(input.action==='review')movement=await changeDiscovery(targetId,state=>reviewDiscoveryScan(state,input.scanId,input.approve,String(user._id),input.reason),database);
  else if(input.action==='restore_penalty')movement=await changeDiscovery(targetId,state=>restoreDiscoveryPenalty(state,input.eventId,String(user._id),input.reason),database);
  else{
   const prize=input.action==='redeem'?await database.collection('discovery_prizes').findOne({_id:new ObjectId(input.prizeId)}):null;
   if(input.action==='redeem'&&(!prize||(!prize.active&&!(await discoveryWallet(targetId,database)).events.some(e=>e.id===discoveryReference(input.reference)))))throw new Error('This prize is not available.');
   const points=input.action==='deduct'?input.points:prize!.cost;
   const reason=input.action==='deduct'?input.reason:`Prize redemption: ${prize!.name}`;
   const signature=createHash('sha256').update(JSON.stringify({action:input.action,prizeId:input.action==='redeem'?input.prizeId:null,points,reason})).digest('hex');
   movement=await changeDiscovery(targetId,state=>applyDiscoveryDebit(state,{id:discoveryReference(input.reference),points,reason,reference:input.reference,actor:String(user._id),signature,prize:prize?.name}),database);
  }
  return NextResponse.json({message:'Discovery points record saved.',balance:movement.balance,event:movement.result});
 }catch(error){return NextResponse.json({error:error instanceof z.ZodError?'Check the form fields.':error instanceof Error?error.message:'Points could not be updated.'},{status:400});}
}
