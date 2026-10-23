import { NextResponse } from "next/server";
import { currentUser, checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await currentUser();
    if (!u)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (u.accountType !== "helper" && u.role !== "collector")
      return NextResponse.json(
        { error: "Choose Helper when creating your account." },
        { status: 403 },
      );
    const data = await req.json();
    if (data.action !== "apply")
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    await (await db()).collection("users").updateOne(
      { _id: u._id },
      {
        $set: { collectorRequested: true, collectorRequestedAt: new Date() },
      },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Application unavailable." },
      { status: 503 },
    );
  }
}
