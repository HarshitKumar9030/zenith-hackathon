import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
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
        { $match: { userId: user._id } },
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
    return NextResponse.json({ days: days.map((d) => d._id) });
  } catch {
    return NextResponse.json(
      { error: "Activity unavailable." },
      { status: 503 },
    );
  }
}
