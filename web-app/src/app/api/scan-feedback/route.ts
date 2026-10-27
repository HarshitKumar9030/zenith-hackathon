import {NextResponse} from 'next/server';
import {checkOrigin,currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {scanFeedbackSchema,feedbackAvailable} from '@/lib/scan-feedback';
import {z} from 'zod';
export async function GET(){
 try{const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in to leave feedback.'},{status:401});const saved=await(await db()).collection('scan_feedback').findOne({_id:user._id});return NextResponse.json({eligible:feedbackAvailable(user,Boolean(saved)),submitted:Boolean(saved)});}
 catch{return NextResponse.json({error:'Feedback is temporarily unavailable.'},{status:503});}
}
export async function POST(request:Request){
 try{
  try{checkOrigin(request);}catch{return NextResponse.json({error:'Cross-origin request rejected.'},{status:403});}
  const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in to leave feedback.'},{status:401});
  if(Number(request.headers.get('content-length'))>10000)return NextResponse.json({error:'Your feedback is too long.'},{status:413});
  const data=await request.json(),database=await db(),ratings=database.collection('scan_feedback');
  if(!user.scanFeedbackEligibleAt)return NextResponse.json({error:'Complete your first scan before rating.'},{status:403});
  if(data?.action==='dismiss'){
   await database.collection('users').updateOne({_id:user._id},{$set:{scanFeedbackDismissedAt:new Date()}});
   return NextResponse.json({ok:true});
  }
  const input=scanFeedbackSchema.parse(data);
  // The account ID is the unique key. Retries and concurrent submissions cannot duplicate feedback.
  await ratings.updateOne({_id:user._id},{$setOnInsert:{userId:user._id,stars:input.stars,comment:input.comment||null,source:user.scanFeedbackSource==='station'?'station':'app',firstScanAt:user.scanFeedbackEligibleAt,createdAt:new Date(),version:1}},{upsert:true});
  return NextResponse.json({ok:true,submitted:true});
 }catch(error){
  if(error instanceof z.ZodError||error instanceof SyntaxError)return NextResponse.json({error:'Choose 1–5 stars and keep your comment under 1,000 characters.'},{status:400});
  if((error as {code?:number}).code===11000)return NextResponse.json({ok:true,submitted:true});
  return NextResponse.json({error:'Could not save your feedback. Please try again.'},{status:503});
 }
}
