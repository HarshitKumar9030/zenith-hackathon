import {ObjectId,type Document} from 'mongodb';
import {db} from './db';
/** Hackathon dispatch: use any approved helper, without location/shift matching. */
export async function demoHelper(residentId: ObjectId) {
 if(process.env.DEMO_AUTO_ASSIGN !== 'true')return null;
 return (await db()).collection('users').findOne({_id:{$ne:residentId},role:'collector',collectorApproved:true},{sort:{_id:1},projection:{_id:1}});
}
export function assignDemoHelper(booking:Document,helper:{_id:ObjectId}|null){
 if(!helper||booking.status!=='scheduled'||booking.collectorId)return;
 booking.collectorId=String(helper._id);
 booking.status='assigned';
 booking.assignedAt=new Date().toISOString();
 booking.events.push({status:'assigned',action:'demo_auto_assign',actor:'system',at:booking.assignedAt});
}
