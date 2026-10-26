import {ObjectId,type Db} from 'mongodb';
import {createHash} from 'node:crypto';
import {db} from './db';
import {activityDay} from './streak';
import {newDiscoveryState,type DiscoveryState} from './discovery-policy';
type Wallet=DiscoveryState & {_id:ObjectId;rev:number};
export async function discoveryWallet(userId:ObjectId,database?:Db):Promise<Wallet>{
 const store=database??await db(),collection=store.collection<Wallet>('discovery_wallets');
 let wallet=await collection.findOne({_id:userId});if(wallet)return wallet;
 const today=activityDay(new Date()),dayStart=new Date(`${today}T00:00:00+05:30`);
 const [legacyCount,countToday]=await Promise.all([
  store.collection('discovery_points').countDocuments({userId}),
  store.collection('discovery_points').countDocuments({userId,createdAt:{$gte:dayStart,$lt:new Date(dayStart.getTime()+86400000)}}),
 ]);
 try{await collection.updateOne({_id:userId},{$setOnInsert:{_id:userId,rev:0,...newDiscoveryState(legacyCount,countToday)}},{upsert:true});}catch(error){if((error as {code?:number}).code!==11000)throw error;}
 wallet=await collection.findOne({_id:userId});if(!wallet)throw new Error('Discovery wallet unavailable');return wallet;
}
export async function changeDiscovery<T>(userId:ObjectId,change:(state:DiscoveryState)=>T,database?:Db){
 const store=database??await db();
 for(let attempt=0;attempt<16;attempt++){
  const wallet=await discoveryWallet(userId,store),revision=wallet.rev;
  const result=change(wallet);wallet.rev++;
  const saved=await store.collection<Wallet>('discovery_wallets').replaceOne({_id:userId,rev:revision},wallet);
  if(saved.modifiedCount)return {result,balance:wallet.balance};
 }
 throw new Error('Points are being updated. Refresh before retrying with the same reference.');
}
export function discoveryReference(reference:string){return 'admin:'+createHash('sha256').update(reference.trim().toLowerCase()).digest('hex');}
export async function discoveryRankings(database:Db){
 return database.collection('discovery_points').aggregate([
  {$group:{_id:'$userId',legacy:{$sum:1}}},{$project:{legacy:1,wallet:{$literal:-1},earned:'$legacy'}},
  {$unionWith:{coll:'discovery_wallets',pipeline:[{$project:{legacy:{$literal:0},wallet:'$balance',earned:'$earned'}}]}},
  {$group:{_id:'$_id',legacy:{$max:'$legacy'},wallet:{$max:'$wallet'},earned:{$max:'$earned'}}},
  {$project:{points:{$cond:[{$gte:['$wallet',0]},'$wallet','$legacy']},earned:1}},
  {$match:{points:{$gt:0}}},{$sort:{points:-1,_id:1}},{$limit:20},
 ]).toArray();
}
