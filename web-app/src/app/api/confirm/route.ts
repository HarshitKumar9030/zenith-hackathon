import { NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { currentUser, checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { identificationSchema, recommend, type Guide } from "@/lib/rules";
import { changeAccount, reward } from "@/lib/service";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await currentUser();
    if (!u)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const data = z
      .object({
        id: z.string().regex(/^[a-f\d]{24}$/i),
        material: identificationSchema.shape.material,
        contaminated: identificationSchema.shape.contaminated,
        mixed_material: z.boolean(),
        special_handling: identificationSchema.shape.special_handling,
        reviewed: z.literal(true),
      })
      .parse(await req.json());
    const database = await db();
    const record = await database
      .collection("history")
      .findOne({ _id: new ObjectId(data.id), userId: u._id });
    if (!record) throw new Error("Scan not found.");
    const identification = identificationSchema.parse({
      ...record.identification,
      material: data.material,
      contaminated: data.contaminated,
      mixed_material: data.mixed_material,
      special_handling: data.special_handling,
      clarification_question: null,
    });
    const guide = record.guideId
      ? await database
          .collection("guides")
          .findOne({ _id: record.guideId, userId: u._id })
      : null;
    const recommendation = recommend(
      identification,
      guide as unknown as Guide | null,
    );
    await database.collection("history").updateOne(
      { _id: record._id, userId: u._id },
      {
        $set: {
          originalIdentification:
            record.originalIdentification || record.identification,
          identification,
          recommendation,
          confirmed: true,
          preview: false,
          confirmedAt: record.confirmedAt || new Date(),
        },
        $unset: { expiresAt: "" },
      },
    );
    const awarded =
      !record.confirmed &&
      identification.material !== "unknown" &&
      (await changeAccount(u._id, (a) => reward(a)));
    return NextResponse.json({
      item: { ...record, identification, recommendation, confirmed: true },
      awarded: Boolean(awarded),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError ? e.issues[0].message : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
