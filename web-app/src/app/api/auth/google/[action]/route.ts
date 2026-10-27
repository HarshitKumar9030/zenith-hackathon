import {randomBytes,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {googleClient,googleConfigured,googleReturnPath,googleEmailAuthoritative} from '@/lib/google-auth';
import {createSession,hashToken} from '@/lib/auth';
import {db} from '@/lib/db';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{action:string}>}){
 const {action}=await context.params;
 if(action==='status')return NextResponse.json({configured:googleConfigured()});
 const url=new URL(request.url),jar=await cookies();
 let returnTo=googleReturnPath(url.searchParams.get('returnTo'));
 const fail=(code:string)=>{const target=new URL(returnTo,url.origin);target.searchParams.set('authError',code);return NextResponse.redirect(target);};
 if(!googleConfigured())return fail('google_unconfigured');
 try{
  const client=googleClient(request.url),database=await db();
  const states=database.collection('google_oauth_states');
  if(action==='start'){
   const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex');
   const pkce=await client.generateCodeVerifierAsync();
   await states.createIndex({expiresAt:1},{expireAfterSeconds:0});
   await states.insertOne({_id:hashToken(state) as never,nonce,verifier:pkce.codeVerifier,returnTo,accountType:url.searchParams.get('accountType')==='helper'?'helper':'user',expiresAt:new Date(Date.now()+600000)});
   jar.set('ww_google_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/auth/google',maxAge:600});
   return NextResponse.redirect(client.generateAuthUrl({scope:['openid','email','profile'],state,nonce,prompt:'select_account',code_challenge:pkce.codeChallenge,code_challenge_method:'S256' as never}));
  }
  if(action!=='callback')return NextResponse.json({error:'Not found'},{status:404});
  const state=url.searchParams.get('state')||'',browserState=jar.get('ww_google_state')?.value||'';
  jar.set('ww_google_state','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/auth/google',maxAge:0});
  if(!/^[a-f0-9]{64}$/.test(state)||state.length!==browserState.length||!timingSafeEqual(Buffer.from(state),Buffer.from(browserState)))return fail('google_expired');
  const saved=await states.findOneAndDelete({_id:hashToken(state) as never,expiresAt:{$gt:new Date()}});
  if(!saved)return fail('google_expired');
  returnTo=googleReturnPath(saved.returnTo);
  if(url.searchParams.has('error'))return fail('google_cancelled');
  const code=url.searchParams.get('code');if(!code||code.length>4096)return fail('google_failed');
  const {tokens}=await client.getToken({code,codeVerifier:saved.verifier});
  if(!tokens.id_token)return fail('google_failed');
  const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID});
  const profile=ticket.getPayload();
  if(!profile?.sub||!profile.email||!profile.email_verified||profile.nonce!==saved.nonce)return fail('google_failed');
  const users=database.collection('users'),email=profile.email.toLowerCase();
  await users.createIndex({googleSub:1},{unique:true,sparse:true});
  let user=await users.findOne({googleSub:profile.sub});
  if(!user){
   const existing=await users.findOne({email});
   // A third-party email claim is not sufficient to link an existing account.
   if(existing&&(existing.googleSub||!googleEmailAuthoritative(email,profile.hd)))return fail('google_link_required');
   if(existing){await users.updateOne({_id:existing._id,googleSub:{$exists:false}},{$set:{googleSub:profile.sub,emailVerifiedAt:new Date(),emailVerificationRequired:false}});user=await users.findOne({_id:existing._id,googleSub:profile.sub});}
   else{
    const accountType=saved.accountType==='helper'?'helper':'user';
    const created=await users.insertOne({email,name:(profile.name||email.split('@')[0]).slice(0,80),googleSub:profile.sub,emailVerifiedAt:new Date(),emailVerificationRequired:false,accountType,collectorRequested:accountType==='helper',...(accountType==='helper'?{collectorRequestedAt:new Date()}:{}),createdAt:new Date()});
    user=await users.findOne({_id:created.insertedId});
   }
  }
  if(!user)return fail('google_failed');
  await createSession(user._id,'Google');
  return NextResponse.redirect(new URL(returnTo,url.origin));
 }catch{console.error('Google sign-in failed');return fail('google_failed');}
}
