import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {seedDemoReviews} from '@/lib/demo-reviews';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  // A temporary, expiring credential authorises only this fixed, labelled sample batch.
  const access=JSON.parse(process.env.DEMO_REVIEW_SEED_ACCESS||'null');
  if(!access||typeof access.token!=='string'||!Number.isFinite(access.expiresAt)||Date.now()>access.expiresAt)return NextResponse.json({error:'Not available.'},{status:404});
  const supplied=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from(`Bearer ${access.token}`);
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return NextResponse.json({error:'Not available.'},{status:404});
  return NextResponse.json(await seedDemoReviews(await db()),{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Demo seed unavailable.'},{status:503});}
}
