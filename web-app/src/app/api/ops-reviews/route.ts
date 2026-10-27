import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {roleFor} from '@/lib/service';
import {db} from '@/lib/db';
import {z} from 'zod';
export async function GET(request:Request){
 try{
  const user=await currentUser();if(!user||roleFor(user)!=='admin')return NextResponse.json({error:'Administrator access required.'},{status:403});
  const params=new URL(request.url).searchParams;
  const input=z.object({page:z.coerce.number().int().min(1).max(1000000),q:z.string().trim().max(100),source:z.enum(['all','station','app']),stars:z.coerce.number().int().min(0).max(5)}).parse({page:params.get('page')||1,q:params.get('q')||'',source:params.get('source')||'all',stars:params.get('stars')||0});
  const match:Record<string,unknown>={};if(input.source!=='all')match.source=input.source;if(input.stars)match.stars=input.stars;
  const text=input.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),size=30;
  const pipeline:any[]=[{$match:match},{$lookup:{from:'users',let:{owner:'$userId'},pipeline:[{$match:{$expr:{$eq:['$_id','$$owner']}}},{$project:{_id:0,name:1,email:1}}],as:'account'}},{$set:{displayName:{$ifNull:['$name',{$ifNull:[{$arrayElemAt:['$account.name',0]},'App participant']}]},displayContact:{$ifNull:['$contact',{$arrayElemAt:['$account.email',0]}]},linked:{$ne:[{$type:'$userId'},'missing']}}}];
  if(text)pipeline.push({$match:{$or:['displayName','displayContact','comment'].map(field=>({[field]:{$regex:text,$options:'i'}}))}});
  pipeline.push({$facet:{reviews:[{$sort:{createdAt:-1,_id:-1}},{$skip:(input.page-1)*size},{$limit:size},{$project:{_id:0,id:{$toString:'$_id'},name:'$displayName',contact:{$ifNull:['$displayContact',null]},contactType:1,accountLinked:'$linked',source:{$ifNull:['$source','app']},stars:1,comment:1,createdAt:1}}],summary:[{$group:{_id:null,total:{$sum:1},average:{$avg:'$stars'},fiveStar:{$sum:{$cond:[{$eq:['$stars',5]},1,0]}},visitor:{$sum:{$cond:[{$eq:['$accountLinked',false]},1,0]}}}}]}});
  const result=await(await db()).collection('scan_feedback').aggregate(pipeline).next();
  const summary=result?.summary[0]||{total:0,average:0,fiveStar:0,visitor:0};delete summary._id;
  return NextResponse.json({reviews:result?.reviews||[],summary,page:input.page,pageSize:size,hasMore:input.page*size<summary.total},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof z.ZodError?'Invalid review filters.':'Reviews could not be loaded. Please try again.'},{status:error instanceof z.ZodError?400:503});}
}
