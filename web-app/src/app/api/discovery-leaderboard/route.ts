import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({error:'Sign in to see Discovery Points.'},{status:401});
    const database = await db();
    const ledger = database.collection('discovery_points');
    const [leaders, points] = await Promise.all([
      ledger.aggregate([
        {$group:{_id:'$userId',points:{$sum:1}}},
        {$sort:{points:-1,_id:1}}, {$limit:20},
      ]).toArray(),
      ledger.countDocuments({userId:user._id}),
    ]);
    // Public pseudonyms only: never expose account names, emails or locations.
    const entries = leaders.map((entry,index)=>({
      rank:index+1, alias:`Explorer ${String(entry._id).slice(-8).toUpperCase()}`,
      points:entry.points, isYou:String(entry._id)===String(user._id),
    }));
    return NextResponse.json({points,entries},{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return NextResponse.json({error:'Discovery leaderboard is unavailable. Please retry.'},{status:503});
  }
}
