import { NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { currentUser, checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { identificationSchema, recommend, type Guide } from "@/lib/rules";
import { changeAccount, claimScanReward } from "@/lib/service";
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
        selectedItems: z
          .array(z.number().int().min(0).max(29))
          .min(1)
          .max(30)
          .optional(),
      })
      .parse(await req.json());
    const database = await db();
    const record = await database
      .collection("history")
      .findOne({ _id: new ObjectId(data.id), userId: u._id });
    if (!record) throw new Error("Scan not found.");
    const detected = record.identification.detected_items;
    if (
      data.selectedItems &&
      (!detected ||
        data.selectedItems.some((i) => i >= detected.length) ||
        new Set(data.selectedItems).size !== data.selectedItems.length)
    )
      throw new Error("Invalid item selection.");
    const identification = identificationSchema.parse({
      ...record.identification,
      ...(data.selectedItems
        ? {
            detected_items: data.selectedItems.map((i) => detected[i]),
            object_name: data.selectedItems
              .map((i) => detected[i].name)
              .join(", ")
              .slice(0, 200),
          }
        : {}),
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
          rewardEligibleAt:
            record.rewardEligibleAt ||
            (!record.confirmed && identification.material !== "unknown"
              ? new Date()
              : null),
          confirmed: true,
          preview: false,
          confirmedAt: record.confirmedAt || new Date(),
        },
        $unset: { expiresAt: "" },
      },
    );
    const awarded =
      (!record.confirmed || record.rewardEligibleAt) &&
      identification.material !== "unknown" &&
      (await changeAccount(u._id, (a) =>
        claimScanReward(a, String(record._id)),
      ));
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
