import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { checkOrigin, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { identificationSchema } from "@/lib/rules";
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json(
        { error: "Sign in to view history." },
        { status: 401 },
      );
    return NextResponse.json({
      items: await (
        await db()
      )
        .collection("history")
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray(),
    });
  } catch {
    return NextResponse.json(
      { error: "History is unavailable." },
      { status: 503 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id } = z
      .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
      .parse(await request.json());
    await (
      await db()
    )
      .collection("history")
      .deleteOne({ _id: new ObjectId(id), userId: user._id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete item." },
      { status: 400 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id, material } = z
      .object({
        id: z.string().regex(/^[a-f\d]{24}$/i),
        material: identificationSchema.shape.material,
      })
      .parse(await request.json());
    await (await db()).collection("history").updateOne(
      { _id: new ObjectId(id), userId: user._id },
      {
        $set: {
          correction: { material, createdAt: new Date() },
          recommendation: {
            status: "unsupported",
            category: null,
            steps: [],
            rule: null,
            message:
              "Identification corrected. Run a new identification to reassess the guide.",
          },
        },
      },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to save correction." },
      { status: 400 },
    );
  }
}
