// Synthetic coordinates in an isolated database; no phone location or external email.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {MongoClient,ObjectId} from 'mongodb';
import {createRequire} from 'node:module';
createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const port=3112,base=`http://localhost:${port}`,name=`tracking_qa_${Date.now()}`,hash=s=>createHash('sha256').update(s).digest('hex');
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');await client.connect();const db=client.db(name);
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env:{...process.env,MONGODB_DB:name,SMTP_PASSWORD:'',DEMO_AUTO_ASSIGN:'false',ADMIN_EMAILS:'ops@example.test',NODE_ENV:'production'},stdio:'ignore'});
async function request(body,cookie='',token='',path='tracking'){
 const r=await fetch(`${base}/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};
}
async function user(role){const id=new ObjectId(),token=randomBytes(32).toString('hex');await db.collection('users').insertOne({_id:id,email:`${id}@example.test`,password:'qa-password-version',emailVerifiedAt:new Date(),role,collectorApproved:role==='collector'});await db.collection('sessions').insertOne({_id:hash(token),userId:id,expiresAt:new Date(Date.now()+600000)});return {id,cookie:`ww_session=${token}`}}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/auth/session')).ok)break}catch{}await new Promise(r=>setTimeout(r,250));if(i===79)throw Error('QA app failed to start')}
 const security=await fetch(base+'/api/auth/session');assert.equal(security.headers.get('x-content-type-options'),'nosniff');assert.match(security.headers.get('cache-control')||'',/no-store/);assert.match(security.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
 const blockedSignup=await request({name:'Launch check',email:'unverified@example.test',password:'qa-password-1234',accountType:'user'},'','','auth/signup');assert.equal(blockedSignup.status,503);assert.equal(await db.collection('users').countDocuments({email:'unverified@example.test'}),0);
 const legacyUser=await user('resident');await db.collection('users').updateOne({_id:legacyUser.id},{$unset:{emailVerifiedAt:''}});assert.equal((await request(null,legacyUser.cookie,'','auth/session')).data.user,null);
 const resident=await user('resident'),helper=await user('collector'),stranger=await user('resident'),id=new ObjectId().toString();
 await db.collection('service_accounts').insertOne({_id:resident.id,profile:{location:{latitude:28.61,longitude:77.2}},bookings:[{id,status:'assigned',collectorId:String(helper.id),item:'QA bottle'}]});
 assert.equal((await request(null,'','','tracking?bookingId='+id)).status,401);
 assert.equal((await request(null,stranger.cookie,'','tracking?bookingId='+id)).status,404);
 assert.equal((await request({action:'create',bookingId:id},resident.cookie)).status,403);
 assert.equal((await request({action:'start',bookingId:id},resident.cookie)).status,403);
 assert.equal((await request({action:'start',bookingId:id},stranger.cookie)).status,403);
 const browser=await request({action:'start',bookingId:id},helper.cookie);assert.equal(browser.status,200);assert.match(browser.data.token,/^[a-f0-9]{64}$/);
 assert.equal((await request({action:'update',latitude:28.6,longitude:77.2,accuracy:12,timestamp:Date.now()},'',browser.data.token)).status,200);
 assert.equal((await request({action:'stop'},'',browser.data.token)).status,200);
 const create=await request({action:'create',bookingId:id},helper.cookie);assert.equal(create.status,200);
 const pair=await request({action:'pair',code:create.data.code});assert.equal(pair.status,200);const token=pair.data.token;
 assert.equal((await request({action:'pair',code:create.data.code})).status,401);
 assert.equal((await request({action:'update',latitude:91,longitude:77.2,accuracy:10,timestamp:Date.now()},'',token)).status,400);
 assert.equal((await request({action:'update',latitude:28.6,longitude:77.2,accuracy:10,timestamp:Date.now()},'',token)).status,200);
 let live=await request(null,resident.cookie,'','tracking?bookingId='+id);assert.equal(live.data.state,'live');assert.ok(live.data.eta);assert.equal(live.data.point.latitude,28.6);assert.deepEqual(live.data.destination,{latitude:28.61,longitude:77.2});
 assert.equal((await request({action:'heartbeat'},'',token)).status,200);
 await db.collection('service_accounts').updateOne({_id:resident.id},{$set:{'bookings.0.status':'completed'}});
 assert.equal((await request({action:'heartbeat'},'',token)).status,409);
 assert.equal((await request(null,resident.cookie,'','tracking?bookingId='+id)).data.state,'ended');
 await db.collection('service_accounts').updateOne({_id:resident.id},{$set:{'bookings.0.status':'assigned'}});
 const c2=await request({action:'create',bookingId:id},helper.cookie),p2=await request({action:'pair',code:c2.data.code});
 await db.collection('users').updateOne({_id:helper.id},{$set:{password:'changed'}});
 assert.equal((await request({action:'heartbeat'},'',p2.data.token)).status,409);
 // A non-waste scan cannot be confirmed, including an empty result.
 const shape={object_name:'phone',material:'metal',physical_state:'dry',contaminated:'no',mixed_material:false,special_handling:'no',explanation:'Phone in use',clarification_question:null};
 for(const detected_items of [[{name:'phone',material:'metal',special_handling:'no',classification:'not_waste'}],[]]){
 const scan=await db.collection('history').insertOne({userId:resident.id,identification:{...shape,detected_items},confirmed:false});
 const result=await request({id:String(scan.insertedId),material:'metal',contaminated:'no',mixed_material:false,special_handling:'no',reviewed:true,...(detected_items.length?{selectedItems:[0]}:{})},resident.cookie,'','confirm');assert.equal(result.status,400);
 }
 const fresh=await user('resident');
 assert.equal((await request(null,fresh.cookie,'','service')).status,200);
 await request({action:'profile',address:'QA residence, synthetic only',locality:'QA campus',alias:'',leaderboard:false},fresh.cookie,'','service');
 const scan=await db.collection('history').insertOne({userId:fresh.id,identification:{...shape,object_name:'16 bottles',material:'plastic',detected_items:Array.from({length:16},(_,i)=>({name:'bottle '+i,material:'plastic',classification:'waste',special_handling:'no'}))},confirmed:false});
 const confirmation=await request({id:String(scan.insertedId),material:'plastic',contaminated:'no',mixed_material:false,special_handling:'no',reviewed:true,selectedItems:Array.from({length:16},(_,i)=>i)},fresh.cookie,'','confirm');
 assert.equal(confirmation.status,200,JSON.stringify(confirmation.data));assert.equal(confirmation.data.item.identification.detected_items.length,16);
 const tomorrow=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 const mismatch=await request({action:'book',requestId:crypto.randomUUID(),source:'basic',scanId:String(scan.insertedId),asap:false,date:tomorrow,window:'17:30',segregated:true,quotedFeePaise:1000},fresh.cookie,'','service');assert.equal(mismatch.status,400);assert.match(mismatch.data.error,/pricing changed/);
 const booking=await request({action:'book',requestId:crypto.randomUUID(),source:'basic',scanId:String(scan.insertedId),asap:true,date:'2000-01-01',window:'09:00',segregated:true},fresh.cookie,'','service');
 assert.equal(booking.status,200,JSON.stringify(booking.data));assert.equal(booking.data.result.asap,true);assert.equal(booking.data.result.surgeFeePaise,Number(booking.data.result.window.slice(0,2))>=17?500:0);assert.notEqual(booking.data.result.date,'2000-01-01');
 await db.collection('service_accounts').updateOne({_id:fresh.id},{$set:{credits:1}});
 const future=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 const included=await request({action:'book',requestId:crypto.randomUUID(),source:'reward',scanId:String(scan.insertedId),asap:false,date:future,window:'09:00',segregated:true},fresh.cookie,'','service');
 assert.equal(included.status,200,JSON.stringify(included.data));assert.equal(included.data.result.status,'scheduled');assert.equal(included.data.result.collectorId,undefined);
 const claimed=await request({action:'claim',residentId:String(fresh.id),id:included.data.result.id},helper.cookie,'','operations');assert.equal(claimed.status,200,JSON.stringify(claimed.data));
 const cancelled=await request({action:'cancel',id:included.data.result.id},fresh.cookie,'','service');assert.equal(cancelled.status,200,JSON.stringify(cancelled.data));
 const saved=await db.collection('service_accounts').findOne({_id:fresh.id});assert.equal(saved.credits,1);assert.equal(saved.bookings.find(b=>b.id===included.data.result.id).status,'cancelled');
 const admin=await user('admin');await db.collection('users').updateOne({_id:admin.id},{$set:{email:'ops@example.test'}});
 assert.equal((await request({action:'set_special_pickup',email:`${helper.id}@example.test`,enabled:true},helper.cookie,'','operations')).status,400);
 assert.equal((await request({action:'set_special_pickup',email:`${helper.id}@example.test`,enabled:true},admin.cookie,'','operations')).status,200);
 assert.equal((await request(null,admin.cookie,'','operations')).data.role,'admin','Verified configured administrators do not need a local-only approval flag');
 const helperState=await request(null,helper.cookie,'','operations');assert.equal(helperState.data.specialPickupApproved,true);
 const specialResident=await user('resident');await request(null,specialResident.cookie,'','service');
 await request({action:'profile',address:'Synthetic special residence',locality:'QA campus',alias:'',leaderboard:false},specialResident.cookie,'','service');
 await db.collection('service_accounts').updateOne({_id:specialResident.id},{$set:{credits:1}});
 const specialScan=await db.collection('history').insertOne({userId:specialResident.id,confirmed:true,identification:{...shape,object_name:'Used battery',special_handling:'yes'}});
 const specialRequest=await request({action:'book',requestId:crypto.randomUUID(),source:'reward',scanId:String(specialScan.insertedId),date:future,window:'09:00',segregated:true},specialResident.cookie,'','service');
 assert.equal(specialRequest.status,200,JSON.stringify(specialRequest.data));assert.equal(specialRequest.data.result.status,'quote_requested');assert.equal(specialRequest.data.result.source,'quote');assert.equal(specialRequest.data.result.feePaise,0);assert.equal(specialRequest.data.result.collectorId,undefined);assert.equal((await db.collection('service_accounts').findOne({_id:specialResident.id})).credits,1);
 // Special handling is visible in jobs and enforced when claiming, not just a badge.
 const specialistJob={id:new ObjectId().toString(),status:'scheduled',specialHandling:'yes',source:'quote',events:[],item:'Used battery',material:'metal',date:future,window:'09:00',locality:'QA campus'};
 const unresolved={...specialistJob,id:new ObjectId().toString(),specialHandling:'unknown'};
 await db.collection('service_accounts').updateOne({_id:fresh.id},{$push:{bookings:{$each:[specialistJob,unresolved]}}});
 const ordinaryHelper=await user('collector');
 const visible=await request(null,ordinaryHelper.cookie,'','operations');assert.equal(visible.data.jobs.find(j=>j.id===specialistJob.id).specialHandling,'yes');
 const denied=await request({action:'claim',residentId:String(fresh.id),id:specialistJob.id},ordinaryHelper.cookie,'','operations');assert.equal(denied.status,400);assert.match(denied.data.error,/approved special-pickup/);
 const unresolvedClaim=await request({action:'claim',residentId:String(fresh.id),id:unresolved.id},helper.cookie,'','operations');assert.equal(unresolvedClaim.status,400);assert.match(unresolvedClaim.data.error,/resolve handling/);
 const specialClaim=await request({action:'claim',residentId:String(fresh.id),id:specialistJob.id},helper.cookie,'','operations');assert.equal(specialClaim.status,200,JSON.stringify(specialClaim.data));
 const afterClaim=await db.collection('service_accounts').findOne({_id:fresh.id});assert.equal(afterClaim.bookings.find(j=>j.id===specialistJob.id).collectorId,String(helper.id));

 console.log('Tracking integration passed: access, one-use pairing, coordinate validation, live ETA, heartbeat, completion/password revocation, non-waste rejection, sixteen-item confirmation and restored service windows and surge, manual dispatch, cancellation credit restoration and administrator-only special pickup designation, specialist review without consuming credits and enforced special-helper claim permissions.');
}finally{app.kill('SIGTERM');await db.dropDatabase();await client.close()}
