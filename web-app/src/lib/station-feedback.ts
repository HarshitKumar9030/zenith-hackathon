import {createHash,randomBytes} from 'node:crypto';
import type {Db} from 'mongodb';
import {stationFeedbackSchema} from './scan-feedback';
const ticketHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function issueStationFeedback(database:Db){
 const token=randomBytes(32).toString('hex'),now=new Date();
 await database.collection('scan_feedback_tickets').insertOne({_id:ticketHash(token) as never,createdAt:now,expiresAt:new Date(now.getTime()+86400000)});
 return token;
}
export async function saveStationFeedback(database:Db,data:unknown){
 const input=stationFeedbackSchema.parse(data),hash=ticketHash(input.ticket);
 const ticket=await database.collection('scan_feedback_tickets').findOne({_id:hash as never,expiresAt:{$gt:new Date()}});
 if(!ticket)return false;
 const contact=input.contact||null,kind=contact?(contact.includes('@')?'email':'phone'):null;
 const normalized=contact?(kind==='email'?contact.toLowerCase():contact.replace(/[\s()-]/g,'')):null;
 // No operator/account/session identifier is copied into visitor feedback.
 await database.collection('scan_feedback').updateOne({_id:`station:${hash}` as never},{$setOnInsert:{source:'station',accountLinked:false,name:input.name,contact:normalized,contactType:kind,stars:input.stars,comment:input.comment||null,scanAt:ticket.createdAt,createdAt:new Date(),version:2}},{upsert:true});
 return true;
}
