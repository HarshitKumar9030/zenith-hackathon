import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
export async function GET(request: Request) {
  try {
    const isPublic = new URL(request.url).searchParams.get("public") === "1";
    const user = isPublic ? null : await currentUser();
    if (!isPublic && !user) return NextResponse.json({error:'Sign in to see Discovery Points.'},{status:401});
    const database = await db();
    const ledger = database.collection('discovery_points');
    const [leaders, points] = await Promise.all([
      ledger.aggregate([
        {$group:{_id:'$userId',points:{$sum:1}}},
        {$sort:{points:-1,_id:1}}, {$limit:20},
      ]).toArray(),
      user ? ledger.countDocuments({userId:user._id}) : Promise.resolve(null),
    ]);
    // Public pseudonyms only: never expose account names, emails or locations.
    const entries = leaders.map((entry,index)=>({
      rank:index+1, alias:`Explorer ${String(entry._id).slice(-8).toUpperCase()}`,
      points:entry.points, isYou:user ? String(entry._id)===String(user._id) : false,
    }));
    return NextResponse.json({points,entries},{headers:{'Cache-Control':'no-store', ...(isPublic ? {'Access-Control-Allow-Origin':'*'} : {})}});
  } catch {
    return NextResponse.json({error:'Discovery leaderboard is unavailable. Please retry.'},{status:503});
  }
}
