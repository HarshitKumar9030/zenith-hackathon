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
        .find({
          userId: user._id,
          preview: { $ne: true },
          deletedAt: { $exists: false },
        })
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
      .updateOne(
        { _id: new ObjectId(id), userId: user._id },
        { $set: { deletedAt: new Date() } },
      );
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
    const body = await request.json();
    if (body.restore === true) {
      const { id } = z
        .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
        .parse(body);
      await (
        await db()
      )
        .collection("history")
        .updateOne(
          { _id: new ObjectId(id), userId: user._id },
          { $unset: { deletedAt: "" } },
        );
      return NextResponse.json({ ok: true });
    }
    if (body.action === "remove_item") {
      const { id, index } = z
        .object({
          id: z.string().regex(/^[a-f\d]{24}$/i),
          index: z.number().int().nonnegative(),
        })
        .parse(body);
      const collection = (await db()).collection("history");
      const record = await collection.findOne({
        _id: new ObjectId(id),
        userId: user._id,
        deletedAt: { $exists: false },
      });
      const items = record?.identification.detected_items;
      if (!record || !Array.isArray(items) || index >= items.length)
        throw new Error("Item not found.");
      const remaining = items.filter((_: unknown, i: number) => i !== index);
      if (!remaining.length) {
        await collection.updateOne(
          { _id: record._id, userId: user._id },
          { $set: { deletedAt: new Date() } },
        );
        return NextResponse.json({ removed: true });
      }
      const materialSet = new Set(
        remaining.map((i: { material: string }) => i.material),
      );
      const identification = {
        ...record.identification,
        detected_items: remaining,
        object_name: remaining
          .map((i: { name: string }) => i.name)
          .join(", ")
          .slice(0, 200),
        material:
          materialSet.size === 1 ? remaining[0].material : "composite_or_other",
        mixed_material: materialSet.size > 1,
        special_handling: remaining.some(
          (i: { special_handling: string }) => i.special_handling === "yes",
        )
          ? "yes"
          : remaining.some(
                (i: { special_handling: string }) =>
                  i.special_handling === "unknown",
              )
            ? "unknown"
            : "no",
      };
      const result = await collection.updateOne(
        {
          _id: record._id,
          userId: user._id,
          identification: record.identification,
        },
        {
          $set: {
            identification,
            updatedAt: new Date(),
            recommendation: {
              status: "unsupported",
              category: null,
              steps: [],
              rule: null,
              message: "Items updated.",
            },
          },
          $unset: { correction: "" },
        },
      );
      if (!result.modifiedCount)
        throw new Error("The scan changed. Refresh and try again.");
      return NextResponse.json({ item: { ...record, identification } });
    }
    const { id, material } = z
      .object({
        id: z.string().regex(/^[a-f\d]{24}$/i),
        material: identificationSchema.shape.material,
      })
      .parse(body);
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
