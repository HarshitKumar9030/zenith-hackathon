// Synthetic coordinates in an isolated database; no phone location or external email.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {MongoClient,ObjectId} from 'mongodb';
import {createRequire} from 'node:module';
createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const port=3112,base=`http://localhost:${port}`,name=`tracking_qa_${Date.now()}`,hash=s=>createHash('sha256').update(s).digest('hex');
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');await client.connect();const db=client.db(name);
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env:{...process.env,MONGODB_DB:name,SMTP_PASSWORD:'',NODE_ENV:'production'},stdio:'ignore'});
async function request(body,cookie='',token='',path='tracking'){
 const r=await fetch(`${base}/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};
}
async function user(role){const id=new ObjectId(),token=randomBytes(32).toString('hex');await db.collection('users').insertOne({_id:id,email:`${id}@example.test`,password:'qa-password-version',role,collectorApproved:role==='collector'});await db.collection('sessions').insertOne({_id:hash(token),userId:id,expiresAt:new Date(Date.now()+600000)});return {id,cookie:`ww_session=${token}`}}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/auth/session')).ok)break}catch{}await new Promise(r=>setTimeout(r,250));if(i===79)throw Error('QA app failed to start')}
 const resident=await user('resident'),helper=await user('collector'),stranger=await user('resident'),id=new ObjectId().toString();
 await db.collection('service_accounts').insertOne({_id:resident.id,profile:{location:{latitude:28.61,longitude:77.2}},bookings:[{id,status:'assigned',collectorId:String(helper.id),item:'QA bottle'}]});
 assert.equal((await request(null,'','','tracking?bookingId='+id)).status,401);
 assert.equal((await request(null,stranger.cookie,'','tracking?bookingId='+id)).status,404);
 assert.equal((await request({action:'create',bookingId:id},resident.cookie)).status,403);
 const create=await request({action:'create',bookingId:id},helper.cookie);assert.equal(create.status,200);
 const pair=await request({action:'pair',code:create.data.code});assert.equal(pair.status,200);const token=pair.data.token;
 assert.equal((await request({action:'pair',code:create.data.code})).status,401);
 assert.equal((await request({action:'update',latitude:91,longitude:77.2,accuracy:10,timestamp:Date.now()},'',token)).status,400);
 assert.equal((await request({action:'update',latitude:28.6,longitude:77.2,accuracy:10,timestamp:Date.now()},'',token)).status,200);
 let live=await request(null,resident.cookie,'','tracking?bookingId='+id);assert.equal(live.data.state,'live');assert.ok(live.data.eta);assert.equal(live.data.point.latitude,28.6);
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
 const booking=await request({action:'book',requestId:crypto.randomUUID(),source:'basic',scanId:String(scan.insertedId),asap:true,date:'2000-01-01',window:'14:30',segregated:true},fresh.cookie,'','service');
 assert.equal(booking.status,200,JSON.stringify(booking.data));assert.equal(booking.data.result.asap,true);assert.equal(booking.data.result.surgeFeePaise,0);assert.notEqual(booking.data.result.date,'2000-01-01');
 console.log('Tracking integration passed: access, one-use pairing, coordinate validation, live ETA, heartbeat, completion/password revocation, non-waste rejection, sixteen-item confirmation and ASAP booking without surge.');
}finally{app.kill('SIGTERM');await db.dropDatabase();await client.close()}
