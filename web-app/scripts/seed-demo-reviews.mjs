import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {MongoClient} from 'mongodb';
import {seedDemoReviews} from '../src/lib/demo-reviews.ts';
const file=process.argv[2];
if(!file)throw new Error('Provide an explicit environment-file path for the intended database.');
const env=parseEnv(readFileSync(file,'utf8'));
if(!env.MONGODB_URI||!env.MONGODB_DB)throw new Error('Both MONGODB_URI and MONGODB_DB are required.');
const client=await new MongoClient(env.MONGODB_URI).connect();
try{console.log(JSON.stringify(await seedDemoReviews(client.db(env.MONGODB_DB))));}finally{await client.close();}
