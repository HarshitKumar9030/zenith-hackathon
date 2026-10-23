import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, checkOrigin } from "@/lib/auth";
import {
  account,
  changeAccount,
  summarize,
  redeem,
  reserve,
  roleFor,
} from "@/lib/service";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("profile"),
    address: z.string().trim().min(8).max(500),
    locality: z.string().trim().min(2).max(100),
    alias: z.string().trim().max(40),
    leaderboard: z.boolean(),
  }),
  z.object({
    action: z.literal("location"),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().nonnegative().max(100000),
      })
      .nullable(),
  }),
  z.object({ action: z.literal("redeem") }),
  z.object({
    action: z.literal("book"),
    requestId: z.uuid(),
    source: z.enum(["reward", "membership", "basic"]),
    scanId: z.string().regex(/^[a-f\d]{24}$/i),
    weightKg: z.number().positive().max(10),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    window: z.enum(["09:00–12:00", "14:00–17:00"]),
    segregated: z.boolean(),
  }),
  z.object({ action: z.literal("cancel"), id: z.string() }),
  z.object({ action: z.literal("accept_receipt"), id: z.string() }),
  z.object({
    action: z.literal("dispute"),
    id: z.string(),
    reason: z.string().trim().min(5).max(500),
  }),
]);
export async function GET() {
  try {
    const u = await currentUser();
    if (!u)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return NextResponse.json({
      account: summarize(await account(u._id)),
      role: roleFor(u),
      checkoutAvailable: Boolean(
        process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Service data unavailable." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await currentUser();
    if (!u)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const data = input.parse(await req.json());
    let scan = null;
    if (data.action === "book") {
      const day = new Date(data.date + "T12:00:00+05:30");
      const delta = day.getTime() - Date.now();
      if (delta < 0 || delta > 30 * 86400000)
        throw new Error(
          "Choose a date from tomorrow through the next 30 days.",
        );
      scan = await (await db()).collection("history").findOne({
        _id: new ObjectId(data.scanId),
        userId: u._id,
        confirmed: true,
      });
      if (!scan) throw new Error("Confirm a scan before booking.");
    }
    const result = await changeAccount(u._id, (a) => {
      if (data.action === "location") {
        a.profile.location = data.location
          ? { ...data.location, updatedAt: new Date().toISOString() }
          : null;
        return { ok: true };
      }
      if (data.action === "profile") {
        a.profile = {
          ...a.profile,
          address: data.address,
          locality: data.locality,
          alias: data.alias,
          leaderboard: data.leaderboard,
        };
        return { ok: true };
      }
      if (data.action === "redeem") return redeem(a);
      if (data.action === "book") {
        const prior = a.bookings.find((b) => b.requestId === data.requestId);
        if (prior) return prior;
        if (a.bookings.length >= 150)
          throw new Error("Booking history limit reached. Contact support.");
        if (!a.profile.address || !a.profile.locality)
          throw new Error("Save your collection address first.");
        const needsQuote =
          !data.segregated || scan!.identification.special_handling !== "no";
        if (
          a.bookings.filter(
            (b) => !["cancelled", "completed"].includes(b.status),
          ).length >= 3
        )
          throw new Error("You can have up to three pending pickups.");
        if (!needsQuote) reserve(a, data);
        if (
          data.source === "membership" &&
          a.membership &&
          new Date(data.date + "T23:59:59+05:30") >
            new Date(a.membership.expiresAt)
        )
          throw new Error("Choose a collection date within your active pass.");
        const booking = {
          id: new ObjectId().toString(),
          requestId: data.requestId,
          source: needsQuote ? "quote" : data.source,
          membershipOrderId:
            data.source === "membership" ? a.membership?.orderId : null,
          segregated: data.segregated,
          specialHandling: scan!.identification.special_handling,
          scanId: data.scanId,
          recoveryPercent:
            data.source === "membership"
              ? a.membership?.plan === "platinum"
                ? 15
                : 10
              : 0,
          item: scan!.identification.object_name,
          material: scan!.identification.material,
          estimatedKg: data.weightKg,
          date: data.date,
          window: data.window,
          address: a.profile.address,
          location: a.profile.location,
          locality: a.profile.locality,
          status: needsQuote
            ? "quote_requested"
            : data.source === "basic"
              ? "payment_due"
              : "scheduled",
          feePaise: data.source === "basic" ? 2000 : 0,
          createdAt: new Date().toISOString(),
          events: [{ status: "created", at: new Date().toISOString() }],
        };
        a.bookings.push(booking);
        return booking;
      }
      const b = a.bookings.find((b) => b.id === data.id);
      if (!b) throw new Error("Pickup not found.");
      if (data.action === "cancel") {
        if (b.status === "cancelled") return { ok: true };
        if (
          ![
            "scheduled",
            "payment_due",
            "quote_requested",
            "quote_ready",
          ].includes(b.status)
        )
          throw new Error("This collection can no longer be cancelled here.");
        if (b.source === "reward") a.credits++;
        if (
          b.source === "membership" &&
          a.membership &&
          a.membership.orderId === b.membershipOrderId
        ) {
          a.membership.remainingPickups++;
          a.membership.remainingKg += b.estimatedKg;
        }
        b.status = "cancelled";
      }
      if (data.action === "accept_receipt") {
        if (b.status !== "receipt_pending")
          throw new Error("No receipt is waiting for approval.");
        b.status = "completed";
        b.acceptedAt = new Date().toISOString();
      }
      if (data.action === "dispute") {
        if (!["receipt_pending", "completed"].includes(b.status))
          throw new Error("A measured receipt is required first.");
        b.status = "disputed";
        b.dispute = { reason: data.reason, at: new Date().toISOString() };
      }
      b.events.push({ status: b.status, at: new Date().toISOString() });
      return { ok: true };
    });
    return NextResponse.json({
      result,
      account: summarize(await account(u._id)),
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
