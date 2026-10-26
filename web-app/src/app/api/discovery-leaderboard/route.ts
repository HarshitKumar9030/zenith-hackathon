import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {discoveryWallet,discoveryRankings} from '@/lib/discovery-wallet';
export async function GET(request: Request) {
  try {
    const isPublic = new URL(request.url).searchParams.get("public") === "1";
    const user = isPublic ? null : await currentUser();
    if (!isPublic && !user) return NextResponse.json({error:'Sign in to see Discovery Points.'},{status:401});
    const database = await db();
    const [leaders,wallet]=await Promise.all([discoveryRankings(database),user?discoveryWallet(user._id,database):Promise.resolve(null)]);
    // Public pseudonyms only: never expose account names, emails or locations.
    const entries = leaders.map((entry,index)=>({
      rank:index+1, alias:`Explorer ${String(entry._id).slice(-8).toUpperCase()}`,
      points:entry.points, earned:entry.earned, isYou:user ? String(entry._id)===String(user._id) : false,
    }));
    return NextResponse.json({points:wallet?.balance??null,earned:wallet?.earned??null,spent:wallet?.spent??null,penalties:wallet?.penalties??null,activity:wallet?.events.slice(-10).reverse().map(({id,kind,delta,reason,at,prize})=>({id,kind,delta,reason,at,prize})),entries},{headers:{'Cache-Control':'no-store', ...(isPublic ? {'Access-Control-Allow-Origin':'*'} : {})}});
  } catch {
    return NextResponse.json({error:'Discovery leaderboard is unavailable. Please retry.'},{status:503});
  }
}
