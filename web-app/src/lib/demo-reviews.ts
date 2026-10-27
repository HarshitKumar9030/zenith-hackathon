import type {Db} from 'mongodb';
export const demoReviewComments: [number,string][] =[
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
export const demoReviewBatch='stall-demo-reviews-2026-10-27-v1';
export async function seedDemoReviews(database:Db){
 const collection=database.collection('scan_feedback'),now=Date.now();
 const result=await collection.bulkWrite(demoReviewComments.map(([stars,comment],i)=>({updateOne:{filter:{_id:`demo:${demoReviewBatch}:${String(i+1).padStart(2,'0')}` as never},update:{$setOnInsert:{isDemo:true,source:'demo',accountLinked:false,name:`Demo visitor ${String(i+1).padStart(2,'0')}`,contact:null,contactType:null,stars,comment,createdAt:new Date(now+i),version:2,seedBatch:demoReviewBatch,seedIndex:i+1}},upsert:true}})));
 const count=await collection.countDocuments({seedBatch:demoReviewBatch,isDemo:true,contact:null});
 if(count!==30)throw new Error('Demo batch verification failed');
 return {inserted:result.upsertedCount,demoBatchCount:count};
}
