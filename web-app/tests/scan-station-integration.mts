import nextEnv from '@next/env';
import {MongoClient,ObjectId} from 'mongodb';
import {spawn} from 'node:child_process';
import {randomBytes,createHash,scryptSync} from 'node:crypto';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
nextEnv.loadEnvConfig(process.cwd());
const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017';
if(!/127\.0\.0\.1|localhost/.test(uri))throw new Error('Local MongoDB required.');
const client=await new MongoClient(uri).connect(),database=client.db(`ecomitra_station_qa_${Date.now()}`),base='http://localhost:3115';
let server:ReturnType<typeof spawn>|undefined;
try{
 const userId=new ObjectId(),token=randomBytes(32).toString('hex'),salt=randomBytes(16).toString('hex');
 await database.collection('users').insertOne({_id:userId,name:'Stall QA operator',email:'station-qa@example.test',password:`${salt}:${scryptSync('StationQA-password-2026!',salt,64).toString('hex')}`,emailVerifiedAt:new Date(),accountType:'user'});
 await database.collection('sessions').insertOne({_id:createHash('sha256').update(token).digest('hex') as never,userId,expiresAt:new Date(Date.now()+3600000)});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3115'],{env:{...process.env,MONGODB_DB:database.databaseName,APP_URL:base,SMTP_HOST:'',SMTP_FROM:'',GOOGLE_CLIENT_ID:'qa.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'qa-not-a-real-secret'},stdio:['ignore','pipe','pipe']});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/auth/google/status')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready,'QA server ready');
 const noAuth=await fetch(base+'/api/classify',{method:'POST',headers:{'Content-Type':'application/json',origin:base},body:JSON.stringify({station:true,text:'banana peel'})});assert.equal(noAuth.status,401);
 const start=await fetch(base+'/api/auth/google/start?returnTo=/scan-station',{redirect:'manual'});assert.equal(start.status,307);
 const authUrl=new URL(start.headers.get('location')!);assert.equal(authUrl.origin,'https://accounts.google.com');assert.equal(authUrl.searchParams.get('redirect_uri'),base+'/api/auth/google/callback');assert.equal(authUrl.searchParams.get('code_challenge_method'),'S256');assert(authUrl.searchParams.get('nonce'));
 const cookie=start.headers.get('set-cookie')!.split(';')[0],state=authUrl.searchParams.get('state')!;
 const mismatched=await fetch(base+'/api/auth/google/callback?state='+('b'.repeat(64)),{headers:{cookie},redirect:'manual'});assert(new URL(mismatched.headers.get('location')!).searchParams.get('authError')==='google_expired');
 assert.equal(await database.collection('google_oauth_states').countDocuments(),1);
 const cancelled=await fetch(base+'/api/auth/google/callback?state='+state+'&error=access_denied',{headers:{cookie},redirect:'manual'});assert.equal(new URL(cancelled.headers.get('location')!).pathname,'/scan-station');assert.equal(await database.collection('google_oauth_states').countDocuments(),0);
 assert(cancelled.headers.get('set-cookie')?.includes('Path=/api/auth/google'));
 const replay=await fetch(base+'/api/auth/google/callback?state='+state+'&code=fake',{headers:{cookie},redirect:'manual'});assert(new URL(replay.headers.get('location')!).searchParams.get('authError')==='google_expired');
 assert.equal(await database.collection('users').countDocuments(),1);
 console.log('PASS: signed-out scanner blocked; OAuth PKCE, callback, mismatched state, cancellation, one-time state and cookie cleanup');
 if(process.env.STATION_QA_LIVE_SCAN==='1'){
  const image='data:image/jpeg;base64,'+(await sharp(await readFile('public/quiz images/easy/banana peel.jfif')).resize(1000,1000,{fit:'inside'}).jpeg().toBuffer()).toString('base64');
  const response=await fetch(base+'/api/classify',{method:'POST',headers:{cookie:`ww_session=${token}`,'Content-Type':'application/json',origin:base},body:JSON.stringify({station:true,image})});const data=await response.json();assert.equal(response.status,200,data.error);assert(data.identification.detected_items.length>0);
  for(const collection of ['history','discovery_points','discovery_wallets','discovery_image_registry','discovery_review_images'])assert.equal(await database.collection(collection).countDocuments(),0,collection+' stays empty');
  console.log('PASS: live image identification with no personal history, Discovery credits, penalties or review images');
 }
 if(process.env.STATION_QA_KEEP==='1'){
  await writeFile('/tmp/ecomitra-station-qa.json',JSON.stringify({base,database:database.databaseName}),{mode:0o600});console.log('QA_READY: synthetic operator, email notifications disabled.');
  await new Promise<void>(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
 }
}finally{if(server){server.kill('SIGTERM');await new Promise<void>(resolve=>{server!.once('exit',()=>resolve());setTimeout(resolve,3000);});}await database.dropDatabase();await client.close();await unlink('/tmp/ecomitra-station-qa.json').catch(()=>{});console.log('Isolated station QA cleaned up.');}
