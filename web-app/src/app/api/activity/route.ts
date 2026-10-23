import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { account } from "@/lib/service";
import { db } from "@/lib/db";
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const days = await (
      await db()
    )
      .collection("history")
      .aggregate([
        { $match: { userId: user._id, confirmed: true } },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$createdAt",
                format: "%Y-%m-%d",
                timezone: "Asia/Kolkata",
              },
            },
          },
        },
      ])
      .toArray();
    const a = await account(user._id);
    return NextResponse.json({
      days: [...new Set([...a.rewardDays, ...days.map((d) => d._id)])],
      points: a.points,
      credits: a.credits,
    });
  } catch {
    return NextResponse.json(
      { error: "Activity unavailable." },
      { status: 503 },
    );
  }
}
