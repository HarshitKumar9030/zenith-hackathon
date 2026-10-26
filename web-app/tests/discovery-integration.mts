import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import {MongoClient,ObjectId} from 'mongodb';
import {createHash,randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {writeFile,unlink,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {recordDiscoveryScan} from '../src/lib/discovery-scans';
import {changeDiscovery,discoveryWallet,discoveryReference,discoveryRankings} from '../src/lib/discovery-wallet';
import {applyDiscoveryDebit,reviewDiscoveryScan} from '../src/lib/discovery-policy';
loadEnvConfig(process.cwd());
const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017';
if(!/127\.0\.0\.1|localhost/.test(uri))throw new Error('This test requires local MongoDB.');
const client=await new MongoClient(uri).connect();
const databaseName=`wastewise_discovery_qa_${Date.now()}`,database=client.db(databaseName);
let server:ReturnType<typeof spawn>|undefined;
const base='http://127.0.0.1:3114';
const qaFile='/tmp/ecomitra-discovery-qa.json';
try{
 const userId=new ObjectId(),other=new ObjectId(),firstScan=new ObjectId();
 await database.collection('discovery_points').insertMany(Array.from({length:99},()=>({_id:new ObjectId(),userId,createdAt:new Date('2026-10-20T00:00:00Z')})));
 const thumbnail='data:image/jpeg;base64,'+(await sharp(await readFile('public/quiz images/easy/banana peel.jfif')).resize(128,128,{fit:'inside'}).jpeg().toBuffer()).toString('base64');
 const fingerprint={exact:'a'.repeat(64),perceptual:'5'.repeat(64),width:800,height:600};
 await recordDiscoveryScan({userId,scanId:firstScan,fingerprint,thumbnail,hasWaste:true},database);
 assert.equal((await discoveryWallet(userId,database)).balance,100);
 await Promise.all(Array.from({length:4},()=>recordDiscoveryScan({userId,scanId:new ObjectId(),fingerprint,hasWaste:true},database)));
 let wallet=await discoveryWallet(userId,database);assert.equal(wallet.balance,65);assert.equal(wallet.events.filter(e=>e.kind==='penalty').length,1);
 const debit={id:discoveryReference('GIFT-001'),points:60,reason:'Test prize handover',reference:'GIFT-001',actor:'test-admin',signature:'same',prize:'Test bottle'};
 await Promise.all([changeDiscovery(userId,s=>applyDiscoveryDebit(s,debit),database),changeDiscovery(userId,s=>applyDiscoveryDebit(s,debit),database)]);
 wallet=await discoveryWallet(userId,database);assert.equal(wallet.balance,5);assert.equal(wallet.spent,60);
 await assert.rejects(()=>changeDiscovery(userId,s=>applyDiscoveryDebit(s,{...debit,id:discoveryReference('GIFT-002'),points:6}),database),/enough/);
 const otherScan=new ObjectId();const shared=await recordDiscoveryScan({userId:other,scanId:otherScan,fingerprint,hasWaste:true},database);assert.equal(shared.result.reason,'shared_image_review');assert.equal(shared.balance,0);
 await Promise.all([changeDiscovery(other,s=>reviewDiscoveryScan(s,String(otherScan),true,'test-admin','Distinct waste verified'),database),changeDiscovery(other,s=>reviewDiscoveryScan(s,String(otherScan),true,'test-admin','Retry'),database)]);
 assert.equal((await discoveryWallet(other,database)).balance,1);
 const ranking=await discoveryRankings(database);assert.equal(ranking.find(r=>String(r._id)===String(userId))?.points,5);
 assert.equal(ranking.find(r=>String(r._id)===String(other))?.points,1);
 console.log('PASS: legacy migration, concurrent duplicate penalties, concurrent idempotent debit, insufficient funds, shared-photo hold, review, net ranking');
 const adminId=new ObjectId(),helperId=new ObjectId(),salt=randomBytes(12).toString('hex');
 const adminPassword=`${salt}:${scryptSync('DiscoveryQA-password-2026!',salt,64).toString('hex')}`;
 await database.collection('users').insertMany([
  {_id:adminId,name:'Discovery QA admin',email:'discovery-admin@example.test',password:adminPassword,emailVerifiedAt:new Date(),accountType:'user'},
  {_id:userId,name:'Discovery QA resident',email:'discovery-resident@example.test',emailVerifiedAt:new Date(),accountType:'user'},
  {_id:helperId,name:'Discovery QA helper',email:'discovery-helper@example.test',emailVerifiedAt:new Date(),accountType:'helper',collectorApproved:true},
 ]);
 const tokens={admin:randomBytes(24).toString('hex'),resident:randomBytes(24).toString('hex'),helper:randomBytes(24).toString('hex')};
 await database.collection<{_id:string;userId:ObjectId;expiresAt:Date}>('sessions').insertMany(Object.entries(tokens).map(([role,token])=>({_id:createHash('sha256').update(token).digest('hex'),userId:role==='admin'?adminId:role==='resident'?userId:helperId,expiresAt:new Date(Date.now()+3600000)})));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3114'],{env:{...process.env,MONGODB_URI:uri,MONGODB_DB:databaseName,ADMIN_EMAILS:'discovery-admin@example.test',APP_URL:base,SMTP_HOST:'',SMTP_FROM:''},stdio:['ignore','pipe','pipe']});
 let ready=false;
 for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/discovery-leaderboard?public=1');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw new Error('Isolated QA server did not start');
 async function request(path:string,role:keyof typeof tokens|null,body?:unknown){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{origin:base,...(role?{cookie:`ww_session=${tokens[role]}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
 assert.equal((await request('/api/discovery-admin',null)).status,403);assert.equal((await request('/api/discovery-admin','resident')).status,403);assert.equal((await request('/api/discovery-admin','helper')).status,403);
 assert.equal((await request('/api/discovery-admin','admin')).status,200);
 assert.equal((await request('/api/discovery-admin?scanId='+firstScan,'resident')).status,403);
 const product=await request('/api/discovery-admin','admin',{action:'create_prize',name:'QA reusable bottle',description:'Synthetic QA prize; no actual fulfilment.',cost:3});assert.equal(product.status,200);
 const payload={action:'redeem',userId:String(userId),prizeId:product.data.id,reference:'QA-HANDOVER-API'};
 const first=await request('/api/discovery-admin','admin',payload),retry=await request('/api/discovery-admin','admin',payload);assert.equal(first.status,200);assert.equal(first.data.balance,2);assert.equal(retry.data.balance,2);
 assert.equal((await request('/api/discovery-admin','admin',{...payload,reference:'QA-SECOND-ORDER'})).status,400);
 assert.equal((await request('/api/discovery-admin','resident',{...payload,reference:'QA-FORGE'})).status,403);
 await request('/api/discovery-admin','admin',{action:'set_prize_active',prizeId:product.data.id,active:false});
 const hiddenRetry=await request('/api/discovery-admin','admin',payload);assert.equal(hiddenRetry.status,200);assert.equal(hiddenRetry.data.balance,2);
 await request('/api/discovery-admin','admin',{action:'set_prize_active',prizeId:product.data.id,active:true});
 const privateImage=await fetch(base+'/api/discovery-admin?scanId='+firstScan,{headers:{cookie:`ww_session=${tokens.admin}`}});assert.equal(privateImage.status,200);assert.equal(privateImage.headers.get('content-type'),'image/jpeg');
 await database.collection('discovery_review_images').updateOne({_id:firstScan},{$set:{expiresAt:new Date(Date.now()-1000)}});
 assert.equal((await request('/api/discovery-admin?scanId='+firstScan,'admin')).status,404);
 const reviewScan=new ObjectId();await recordDiscoveryScan({userId,scanId:reviewScan,fingerprint:{...fingerprint,exact:'b'.repeat(64),perceptual:'4'+'5'.repeat(63)},thumbnail,hasWaste:true},database);
 const reviewPayload={action:'review',userId:String(userId),scanId:String(reviewScan),approve:true,reason:'Distinct waste confirmed after comparing review photos'};
 assert.equal((await request('/api/discovery-admin','admin',reviewPayload)).data.balance,3);assert.equal((await request('/api/discovery-admin','admin',reviewPayload)).data.balance,3);
 const penalty=(await discoveryWallet(userId,database)).events.find(e=>e.kind==='penalty')!;
 const restorePayload={action:'restore_penalty',userId:String(userId),eventId:penalty.id,reason:'QA verifies accidental repeat and restores points'};
 assert.equal((await request('/api/discovery-admin','admin',restorePayload)).data.balance,38);assert.equal((await request('/api/discovery-admin','admin',restorePayload)).data.balance,38);
 console.log('PASS: private review images, expiry enforcement, HTTP review approval and one-time penalty restoration');
 const publicBoard=await request('/api/discovery-leaderboard?public=1',null);assert.equal(publicBoard.data.points,null);assert.equal(publicBoard.data.activity,undefined);assert.equal(JSON.stringify(publicBoard.data).includes('example.test'),false);
 const personal=await request('/api/discovery-leaderboard','resident');assert.equal(personal.data.points,38);assert.equal(personal.data.earned,101);assert.equal(personal.data.spent,63);
 console.log('PASS: admin-only API, helper/resident isolation, server-priced redemption, retry safety, negative balance prevention, private/public net scores');
 if(process.env.DISCOVERY_QA_KEEP==='1'){
  await writeFile(qaFile,JSON.stringify({base,token:tokens.admin,userId:String(userId),databaseName}),{mode:0o600});
  console.log('QA_READY: isolated local server on port 3114; synthetic accounts only.');
  await new Promise<void>(resolve=>{process.once('SIGINT',()=>resolve());process.once('SIGTERM',()=>resolve());});
 }
}finally{
 if(server){server.kill('SIGTERM');await new Promise<void>(resolve=>{server!.once('exit',()=>resolve());setTimeout(resolve,3000);});}
 await database.dropDatabase();await client.close();await unlink(qaFile).catch(()=>{});
 console.log('Cleaned isolated Discovery QA database and server.');
}
