// Isolated synthetic accounts; no Instagram calls, real email or production database writes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomBytes,scryptSync} from 'node:crypto';
import {MongoClient,ObjectId} from 'mongodb';
import {createRequire} from 'node:module';
createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const port=3122,base='http://localhost:'+port,name='game_access_qa_'+Date.now(),hash=s=>createHash('sha256').update(s).digest('hex');
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');await client.connect();const database=client.db(name);
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env:{...process.env,MONGODB_DB:name,ADMIN_EMAILS:'game-ops@example.test',SMTP_PASSWORD:'',GOOGLE_CLIENT_SECRET:'',NODE_ENV:'production'},stdio:'ignore'});
async function request(body,cookie='',path='/api/game-access',origin=base){
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json(),headers:r.headers};
}
async function user(email){
 const id=new ObjectId(),token=randomBytes(32).toString('hex'),salt=randomBytes(16).toString('hex');
 await database.collection('users').insertOne({_id:id,email,name:email.startsWith('game-ops')?'Game operations QA':'Game participant QA',emailVerifiedAt:new Date(),password:salt+':'+scryptSync('Local-game-QA-123!',salt,64).toString('hex')});
 await database.collection('sessions').insertOne({_id:hash(token),userId:id,expiresAt:new Date(Date.now()+3600000)});
 return {id,email,cookie:'ww_session='+token};
}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/game-access')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));if(i===99)throw Error('QA server did not start');}
 const admin=await user('game-ops@example.test'),resident=await user('game-participant@example.test'),other=await user('game-other@example.test');
 const guest=await request(null);assert.equal(guest.data.user,null);assert.match(guest.headers.get('cache-control'),/no-store/);
 assert.equal((await request({action:'start'})).status,401);
 assert.equal((await request({action:'start'},resident.cookie)).status,403);
 assert.equal((await request(null,resident.cookie,'/api/game-access?admin=1')).status,403);
 assert.equal((await request({action:'issue',email:resident.email,following:true,story:false},resident.cookie)).status,403);
 assert.equal((await request({action:'issue',email:resident.email,following:false,story:false},admin.cookie)).status,400);
 assert.equal((await request({action:'issue',email:'missing@example.test',following:true,story:false},admin.cookie)).status,404);
 assert.equal((await request({action:'issue',email:resident.email,following:true,story:false},admin.cookie,'/api/game-access','https://evil.example')).status,403);
 const issued=await request({action:'issue',email:resident.email,following:true,story:false},admin.cookie);
 assert.equal(issued.status,200);assert.equal(issued.data.state,'pending');const code=issued.data.code;
 assert.equal((await request({action:'redeem',code},other.cookie)).status,400);
 const stored=await database.collection('game_access').findOne({_id:resident.id});assert.equal(stored.code,undefined);assert.notEqual(stored.codeHash,code);
 const attempts=await Promise.all(Array.from({length:4},()=>request({action:'redeem',code:code.toLowerCase()},resident.cookie)));
 assert.ok(attempts.every(r=>r.status===200));assert.equal(new Set(attempts.map(r=>r.data.expiresAt)).size,1);
 const expiresAt=attempts[0].data.expiresAt;const active=await database.collection('game_access').findOne({_id:resident.id});
 assert.equal(active.expiresAt-active.activatedAt,1800000);assert.equal(active.audit.filter(e=>e.action==='activated').length,1);
 assert.equal((await request(null,resident.cookie)).data.state,'active');
 assert.equal((await request({action:'redeem',code},resident.cookie)).data.expiresAt,expiresAt);
 const round=await request({action:'start'},resident.cookie);assert.equal(round.status,200);assert.equal(round.data.state,"active");
 const listed=await request(null,admin.cookie,'/api/game-access?admin=1');assert.equal(listed.status,200);assert.equal(JSON.stringify(listed.data).includes('codeHash'),false);assert.equal(listed.data.passes[0].following,true);
 await database.collection('game_access').updateOne({_id:resident.id},{$set:{expiresAt:new Date(Date.now()-1)}});
 assert.equal((await request(null,resident.cookie)).data.state,'expired');assert.equal((await request({action:'start'},resident.cookie)).status,403);assert.equal((await request({action:'redeem',code},resident.cookie)).status,400);
 const replacement=await request({action:'issue',email:resident.email,following:false,story:true},admin.cookie);assert.equal(replacement.status,200);
 assert.equal((await request({action:'redeem',code},resident.cookie)).status,400);
 assert.equal((await request({action:'redeem',code:replacement.data.code},resident.cookie)).status,200);
 assert.equal((await request({action:'revoke',userId:String(resident.id),grantId:issued.data.grantId},admin.cookie)).status,409);
 assert.equal((await request({action:'revoke',userId:String(resident.id),grantId:replacement.data.grantId},admin.cookie)).status,200);
 assert.equal((await request({action:'start'},resident.cookie)).status,403);assert.equal((await request(null,resident.cookie)).data.state,'revoked');
 const unused=await request({action:'issue',email:resident.email,following:true,story:true},admin.cookie);
 await database.collection('game_access').updateOne({_id:resident.id},{$set:{redeemBy:new Date(Date.now()-1)}});
 assert.equal((await request({action:'redeem',code:unused.data.code},resident.cookie)).status,400);
 let limited;for(let i=0;i<11;i++)limited=await request({action:'redeem',code:'WRONG-CODE'},other.cookie);assert.equal(limited.status,429);
 console.log('Game access integration passed: authentication, admin-only issue/revoke, manual checks, ownership, atomic redemption, fixed expiry, new-round gate, replacement, redaction and rate limits.');
 if(process.env.QA_HOLD==='1'){
  await request({action:'issue',email:resident.email,following:true,story:true},admin.cookie);
  console.log('QA preview ready at '+base+'/game. Synthetic login: game-participant@example.test / Local-game-QA-123!; admin: game-ops@example.test with same QA password.');
  await new Promise(resolve=>{process.once('SIGTERM',resolve);process.once('SIGINT',resolve);});
 }
}finally{app.kill('SIGTERM');await new Promise(r=>app.once('exit',r));await database.dropDatabase();await client.close();}
