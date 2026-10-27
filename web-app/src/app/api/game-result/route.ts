import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkOrigin, hashToken } from "@/lib/auth";
import { createEmailTransport, emailConfigured } from "@/lib/email";
import { gameResultAttachment, gameResultSchema, resultSummary } from "@/lib/game-result-email";
import { TOTAL_TARGET, WASTE, WASTE_TYPES } from "@/lib/collection-game-rules";
export const runtime="nodejs";
export const maxDuration=30;
export async function POST(request:Request){
 try{
  if(!request.headers.get('origin'))return NextResponse.json({error:'Open the game to email your result.'},{status:403});
  try{checkOrigin(request);}catch{return NextResponse.json({error:'Cross-origin request rejected.'},{status:403});}
  if(Number(request.headers.get('content-length'))>4096)return NextResponse.json({error:'Result is too large.'},{status:413});
  const raw=await request.text();if(raw.length>4096)return NextResponse.json({error:'Result is too large.'},{status:413});
  let data:unknown;try{data=JSON.parse(raw);}catch{return NextResponse.json({error:'Enter a valid result.'},{status:400});}
  const parsed=gameResultSchema.safeParse(data);if(!parsed.success)return NextResponse.json({error:'Check your email address and try again.'},{status:400});
  if(!emailConfigured())return NextResponse.json({error:'Email is temporarily unavailable. You can still download your story card.'},{status:503});
  const input=parsed.data,database=await db(),hour=Math.floor(Date.now()/3600000);
  // Shared, atomic counters use the existing TTL-indexed collection. No raw addresses or IPs are stored.
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  for(const [key,limit] of [[`address:${hashToken(input.email)}`,3],[`ip:${hashToken(ip)}`,12]] as const){
   const bucket=await database.collection('auth_attempts').findOneAndUpdate({_id:`game-result:${hour}:${key}` as never},{$inc:{count:1},$set:{expiresAt:new Date(Date.now()+7200000)}},{upsert:true,returnDocument:'after'});
   if((bucket?.count||0)>limit)return NextResponse.json({error:'Email limit reached. Download your card or try again in an hour.'},{status:429,headers:{'Retry-After':'3600'}});
  }
  const {score,count}=resultSummary(input),attachment=await gameResultAttachment(input);
  const breakdown=WASTE_TYPES.map(t=>`${WASTE[t].label}: ${input.cargo[t]}/${WASTE[t].target}`).join('\n');
  const transport=createEmailTransport();
  try{await transport.sendMail({from:{name:'EcoMitra',address:process.env.SMTP_FROM!},to:input.email,subject:'Your EcoMitra Circular City result',text:`Thanks for playing EcoMitra Circular City!\n\nCollection score: ${score}\nPickups: ${count}/${TOTAL_TARGET}\n\n${breakdown}\n\nYour portrait story card is attached. These are simulated game results, separate from Discovery Points and real waste collections.\n\nEcoMitra`,attachments:[{filename:'ecomitra-my-city-score.png',content:attachment,contentType:'image/png'}]});}
  finally{transport.close();}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'We could not send your email. Try again later, or download your card.'},{status:503});}
}
