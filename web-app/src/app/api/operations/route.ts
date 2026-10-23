import { NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { currentUser, checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { roleFor, changeAccount } from "@/lib/service";
export async function GET() {
  try {
    const u = await currentUser();
    if (!u || roleFor(u) === "resident")
      return NextResponse.json(
        { error: "Approved collector access required." },
        { status: 403 },
      );
    const database = await db();
    const admin = roleFor(u) === "admin";
    const accounts = await database
      .collection("service_accounts")
      .find({
        bookings: {
          $elemMatch: admin
            ? { status: { $ne: "cancelled" } }
            : {
                $or: [{ status: "scheduled" }, { collectorId: String(u._id) }],
              },
        },
      })
      .limit(100)
      .toArray();
    const jobs = accounts.flatMap((a) =>
      a.bookings
        .filter(
          (b: Record<string, unknown>) =>
            admin ||
            b.status === "scheduled" ||
            b.collectorId === String(u._id),
        )
        .map((b: Record<string, unknown>) => ({
          ...b,
          residentId: String(a._id),
          address:
            admin || b.collectorId === String(u._id) ? b.address : undefined,
        })),
    );
    const users = admin
      ? await database
          .collection("users")
          .find(
            {},
            {
              projection: { name: 1, email: 1, role: 1, collectorApproved: 1 },
            },
          )
          .limit(100)
          .toArray()
      : [];
    return NextResponse.json({ jobs, users, role: roleFor(u) });
  } catch {
    return NextResponse.json(
      { error: "Operations unavailable." },
      { status: 503 },
    );
  }
}
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("quote"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
    feePaise: z.number().int().positive().max(1000000),
    terms: z.string().min(10).max(1000),
  }),
  z.object({
    action: z.literal("record_workpay"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
    amountPaise: z.number().int().nonnegative().max(10000000),
    reference: z.string().min(5).max(150),
  }),
  z.object({ action: z.literal("approve_collector"), email: z.email() }),
  z.object({
    action: z.literal("claim"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
  }),
  z.object({
    action: z.literal("weigh"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
    grossKg: z.number().positive().max(100),
    tareKg: z.number().nonnegative().max(100),
    material: z.string().min(2).max(80),
    notes: z.string().max(500),
  }),
  z.object({
    action: z.literal("settle"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
    buyerProceedsPaise: z.number().int().nonnegative().max(10000000),
    directCostsPaise: z.number().int().nonnegative().max(10000000),
    reference: z.string().min(5).max(150),
  }),
  z.object({
    action: z.literal("record_payout"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
    reference: z.string().min(5).max(150),
  }),
  z.object({
    action: z.literal("resolve_dispute"),
    residentId: z.string().regex(/^[a-f\d]{24}$/i),
    id: z.string(),
    reason: z.string().min(5).max(500),
  }),
]);
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await currentUser();
    if (!u || roleFor(u) === "resident")
      return NextResponse.json(
        { error: "Approved collector access required." },
        { status: 403 },
      );
    const data = schema.parse(await req.json());
    const admin = roleFor(u) === "admin";
    if (data.action === "approve_collector") {
      if (!admin) throw new Error("Administrator access required.");
      const result = await (
        await db()
      )
        .collection("users")
        .updateOne(
          { email: data.email.toLowerCase() },
          { $set: { role: "collector", collectorApproved: true } },
        );
      if (!result.matchedCount)
        throw new Error("The collector must create an account first.");
      return NextResponse.json({ ok: true });
    }
    await changeAccount(new ObjectId(data.residentId), (a) => {
      const b = a.bookings.find((b) => b.id === data.id);
      if (!b) throw new Error("Pickup not found.");
      if (data.action === "claim") {
        if (b.status !== "scheduled")
          throw new Error("Another collector has claimed this pickup.");
        b.collectorId = String(u._id);
        b.status = "assigned";
      } else if (data.action === "weigh") {
        if (
          b.status !== "assigned" ||
          (!admin && b.collectorId !== String(u._id))
        )
          throw new Error("Only the assigned collector can weigh this pickup.");
        if (data.grossKg <= data.tareKg)
          throw new Error("Gross weight must exceed tare.");
        const net = Math.round((data.grossKg - data.tareKg) * 1000) / 1000;
        const cap =
          b.source === "membership"
            ? b.recoveryPercent === 15
              ? 10
              : 8
            : b.source === "quote"
              ? 100
              : 2;
        if (net > cap)
          throw new Error(
            "Measured weight exceeds this service limit. Obtain a new agreed quote.",
          );
        if (
          b.source === "membership" &&
          a.membership &&
          a.membership.orderId === b.membershipOrderId
        ) {
          const difference = net - b.estimatedKg;
          if (difference > a.membership.remainingKg)
            throw new Error(
              "Measured weight exceeds remaining monthly allowance.",
            );
          a.membership.remainingKg -= difference;
        }
        b.receipt = {
          grossKg: data.grossKg,
          tareKg: data.tareKg,
          netKg: Math.round((data.grossKg - data.tareKg) * 1000) / 1000,
          material: data.material,
          notes: data.notes,
          collectorId: String(u._id),
          createdAt: new Date().toISOString(),
        };
        b.status = "receipt_pending";
      } else {
        if (!admin) throw new Error("Administrator access required.");
        if (data.action === "quote") {
          if (b.status !== "quote_requested")
            throw new Error("This request is not waiting for a quote.");
          b.feePaise = data.feePaise;
          b.quoteTerms = data.terms;
          b.status = "quote_ready";
        }
        if (data.action === "record_workpay") {
          if (!b.collectorId) throw new Error("Assign a collector first.");
          if (b.workPay) throw new Error("Work pay already recorded.");
          b.workPay = {
            amountPaise: data.amountPaise,
            reference: data.reference,
            actor: String(u._id),
            at: new Date().toISOString(),
          };
        }
        if (data.action === "resolve_dispute") {
          if (b.status !== "disputed") throw new Error("No open dispute.");
          b.resolution = {
            reason: data.reason,
            actor: String(u._id),
            at: new Date().toISOString(),
          };
          b.status = "receipt_pending";
        }
        if (data.action === "settle") {
          if (b.status !== "completed" || !b.receipt)
            throw new Error("Resident must accept the measured receipt first.");
          if (b.settlement) throw new Error("Settlement already recorded.");
          const net = Math.max(
            0,
            data.buyerProceedsPaise - data.directCostsPaise,
          );
          const percent = b.recoveryPercent || 0;
          b.settlement = {
            buyerProceedsPaise: data.buyerProceedsPaise,
            directCostsPaise: data.directCostsPaise,
            netPaise: net,
            residentPaise: Math.floor((net * percent) / 100),
            reference: data.reference,
            status: "pending_payout",
            actor: String(u._id),
            at: new Date().toISOString(),
          };
        }
        if (data.action === "record_payout") {
          if (!b.settlement || b.settlement.status !== "pending_payout")
            throw new Error("No pending settlement.");
          b.settlement.status = "paid";
          b.settlement.payoutReference = data.reference;
          b.settlement.paidAt = new Date().toISOString();
        }
      }
      b.events.push({
        status: b.status,
        action: data.action,
        actor: String(u._id),
        at: new Date().toISOString(),
      });
    });
    return NextResponse.json({ ok: true });
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
