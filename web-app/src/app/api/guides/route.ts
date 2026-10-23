import { NextResponse } from 'next/server';
import { checkOrigin,currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { guideSchema } from '@/lib/rules';
export async function GET(){try{const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in first.'},{status:401});return NextResponse.json({guides:await (await db()).collection('guides').find({userId:user._id}).toArray()});}catch{return NextResponse.json({error:'Guides unavailable.'},{status:503});}}
export async function POST(request:Request){try{checkOrigin(request);const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in first.'},{status:401});if(Number(request.headers.get('content-length'))>200000)return NextResponse.json({error:'Guide exceeds 200 KB.'},{status:413});const guide=guideSchema.parse(await request.json());const result=await (await db()).collection('guides').insertOne({...guide,userId:user._id,createdAt:new Date()});return NextResponse.json({id:String(result.insertedId)});}catch{return NextResponse.json({error:'Invalid guide. Include name, municipality, version, full text, and rules with exact passages and steps.'},{status:400});}}
