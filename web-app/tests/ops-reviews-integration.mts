import nextEnv from '@next/env';
import {MongoClient,ObjectId} from 'mongodb';
import {randomBytes,createHash,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
nextEnv.loadEnvConfig(process.cwd());
const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017';if(!/127\.0\.0\.1|localhost/.test(uri))throw new Error('Local MongoDB required');
const client=await new MongoClient(uri).connect(),database=client.db(`ecomitra_reviews_qa_${Date.now()}`),base='http://localhost:3116';
let server:ReturnType<typeof spawn>|undefined;
try{
 const admin=new ObjectId(),helper=new ObjectId(),resident=new ObjectId(),salt=randomBytes(16).toString('hex');
 await database.collection('users').insertMany([
  {_id:admin,email:'reviews-admin@example.test',name:'Reviews QA admin',emailVerifiedAt:new Date(),password:`${salt}:${scryptSync('ReviewsQA-password-2026!',salt,64).toString('hex')}`},
  {_id:helper,email:'reviews-helper@example.test',name:'Helper',emailVerifiedAt:new Date(),collectorApproved:true,accountType:'helper'},
  {_id:resident,email:'reviews-resident@example.test',name:'App reviewer',emailVerifiedAt:new Date(),password:'SECRET_SENTINEL'},
 ]);
 const tokens={admin:randomBytes(32).toString('hex'),helper:randomBytes(32).toString('hex'),resident:randomBytes(32).toString('hex')};
 for(const [role,token]of Object.entries(tokens))await database.collection('sessions').insertOne({_id:createHash('sha256').update(token).digest('hex') as never,userId:role==='admin'?admin:role==='helper'?helper:resident,expiresAt:new Date(Date.now()+3600000)});
 await database.collection('scan_feedback').insertMany([
  {_id:resident,userId:resident,stars:4,comment:'Useful app scanner',source:'app',createdAt:new Date('2026-10-25T10:00:00Z')},
  ...Array.from({length:40},(_,i)=>({_id:`station:qa-${i}`,accountLinked:false,source:'station',name:`Visitor ${String(i+1).padStart(2,'0')}`,contact:i%2?'visitor'+i+'@example.test':null,contactType:i%2?'email':null,stars:i%5+1,comment:i===39?'Clear results and a friendly stall team.':i%3?'Quick and easy to use.':null,createdAt:new Date(Date.UTC(2026,9,26,10,i)),ticket:'PRIVATE_TICKET_SENTINEL'})),
 ] as never[]);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3116'],{env:{...process.env,MONGODB_DB:database.databaseName,ADMIN_EMAILS:'reviews-admin@example.test',APP_URL:base,SMTP_HOST:'',SMTP_FROM:''},stdio:['ignore','pipe','pipe']});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/ops-reviews')).status===403){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready,'QA server ready');
 const get=async(path='',role:keyof typeof tokens='admin')=>{const r=await fetch(base+'/api/ops-reviews'+path,{headers:{cookie:`ww_session=${tokens[role]}`}});return {status:r.status,data:await r.json(),headers:r.headers};};
 for(const role of ['helper','resident']as const)assert.equal((await get('',role)).status,403);
 const first=await get(),second=await get('?page=2');assert.equal(first.status,200);assert.equal(first.data.summary.total,41);assert.equal(first.data.summary.visitor,40);assert.equal(first.data.reviews.length,30);assert.equal(second.data.reviews.length,11);assert.equal(first.data.hasMore,true);assert.equal(second.data.hasMore,false);assert.equal(new Set([...first.data.reviews,...second.data.reviews].map(r=>r.id)).size,41);
 assert.equal(first.headers.get('cache-control'),'private, no-store');
 const text=JSON.stringify([first.data,second.data]);assert(!text.includes('SECRET_SENTINEL'));assert(!text.includes('PRIVATE_TICKET_SENTINEL'));assert(!text.includes('"userId"'));
 const app=await get('?source=app');assert.equal(app.data.summary.total,1);assert.equal(app.data.reviews[0].name,'App reviewer');assert.equal(app.data.reviews[0].contact,'reviews-resident@example.test');assert.equal(app.data.reviews[0].accountLinked,true);
 const stars=await get('?source=station&stars=5');assert.equal(stars.data.summary.total,8);assert(stars.data.reviews.every(r=>r.stars===5&&!r.accountLinked));
 assert.equal((await get('?q=Visitor%2040')).data.summary.total,1);assert.equal((await get('?q=friendly')).data.summary.total,1);assert.equal((await get('?q=visitor39%40example.test')).data.summary.total,1);assert.equal((await get('?q=%5B')).data.summary.total,0);
 for(const path of ['?page=0','?page=1.5','?source=unknown','?stars=6'])assert.equal((await get(path)).status,400);
 console.log('PASS: admin-only access, all 41 reviews across pages, rating/source/name/contact/comment filters, summary counts, legacy account lookup and private projections');
 if(process.env.REVIEWS_QA_KEEP==='1'){await writeFile('/tmp/ecomitra-reviews-qa.json',JSON.stringify({base,database:database.databaseName}),{mode:0o600});console.log('QA_READY: synthetic reviews/admin; SMTP disabled');await new Promise<void>(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});}
}finally{if(server){server.kill('SIGTERM');await new Promise<void>(resolve=>{server!.once('exit',()=>resolve());setTimeout(resolve,3000);});}await database.dropDatabase();await client.close();await unlink('/tmp/ecomitra-reviews-qa.json').catch(()=>{});console.log('Reviews QA cleaned');}
