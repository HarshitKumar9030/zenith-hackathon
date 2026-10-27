import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {MongoClient} from 'mongodb';
const file=process.argv[2];
if(!file)throw new Error('Provide an explicit environment-file path for the intended database.');
const env=parseEnv(readFileSync(file,'utf8'));
if(!env.MONGODB_URI||!env.MONGODB_DB)throw new Error('Both MONGODB_URI and MONGODB_DB are required.');
const comments=[
 [5,'scan is good i understand now where this things goes'],
 [4,'nice app but camera opening little slow on my side'],
 [5,'i put bottle it tell plastic very easy'],
 [4,'good one for people who dont know sorting like me'],
 [3,'result fine but some word i not understanding first'],
 [5,'i was putting all waste together now got idea'],
 [4,'pretty good just make scan button more bigger'],
 [5,'liked it no much typing needed just show item'],
 [4,'it works good with light dark photo takes time'],
 [3,'first photo not clear second try it worked'],
 [5,'simple and usefull thing for daily waste'],
 [4,'plastic and food waste showing properly nice'],
 [5,'good work team i enjoy trying the scanner'],
 [4,'app looks clean and result easy to read for me'],
 [3,'bit confused with mixed things but explanation help'],
 [5,'didnt knew paper can recycle this is helpfull'],
 [4,'nice concept hope more people use this thing'],
 [5,'very easy my friend also tried and liked'],
 [4,'good scan but give little more short explanation'],
 [3,'camera focus was not coming fast rest all good'],
 [5,'this make sorting easy without searching google'],
 [4,'i like the colours and how it showing result'],
 [5,'for student this is good learning also'],
 [4,'works nice only internet should be proper'],
 [3,'some item need ask again but overall okay app'],
 [5,'good idea waste should not all go same dustbin'],
 [4,'i tried banana peel and bottle both came correct'],
 [5,'really usefull we need more such things'],
 [4,'nice experience can improve speed little bit'],
 [5,'all good easy to scan no complicated steps'],
];
const batch='stall-demo-reviews-2026-10-27-v1',client=await new MongoClient(env.MONGODB_URI).connect();
try{
 const collection=client.db(env.MONGODB_DB).collection('scan_feedback');
 const before=await collection.countDocuments({isDemo:{$ne:true}}),now=Date.now();
 const result=await collection.bulkWrite(comments.map(([stars,comment],i)=>({updateOne:{filter:{_id:`demo:${batch}:${String(i+1).padStart(2,'0')}`},update:{$setOnInsert:{isDemo:true,source:'demo',accountLinked:false,name:`Demo visitor ${String(i+1).padStart(2,'0')}`,contact:null,contactType:null,stars,comment,createdAt:new Date(now+i),version:2,seedBatch:batch,seedIndex:i+1}},upsert:true}})));
 const seeded=await collection.countDocuments({seedBatch:batch,isDemo:true,contact:null});
 if(seeded!==30)throw new Error('Demo batch verification failed.');
 const after=await collection.countDocuments({isDemo:{$ne:true}});
 console.log(JSON.stringify({inserted:result.upsertedCount,demoBatchCount:seeded,realReviewCountBefore:before,realReviewCountAfter:after,realReviewsOverwritten:false}));
}finally{await client.close();}
