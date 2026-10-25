import { helperCompensation } from "@/lib/helper-pay";
import { pickupPrice } from "@/lib/pickup-pricing";
import { NextResponse } from "next/server";
import { SORTING_PER_KG_PAISE } from "@/lib/pickup-pricing";
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
          location:
            admin || b.collectorId === String(u._id) ? b.location : undefined,
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
              projection: {
                name: 1,
                email: 1,
                role: 1,
                collectorApproved: 1,
                specialPickupApproved: 1,
                accountType: 1,
                collectorRequested: 1,
              },
            },
          )
          .limit(100)
          .toArray()
      : [];
    return NextResponse.json({ jobs, users, role: roleFor(u), specialPickupApproved: u.specialPickupApproved === true });
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
  z.object({action:z.literal("set_special_pickup"),email:z.email(),enabled:z.boolean()}),
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
    if(data.action === "set_special_pickup") {
      if(!admin) throw new Error("Administrator access required.");
      const result = await (await db()).collection("users").updateOne({email:data.email.toLowerCase(),role:"collector",collectorApproved:true},{$set:{specialPickupApproved:data.enabled}});
      if(!result.matchedCount)throw new Error("Approve this helper before changing special-pickup access.");
      return NextResponse.json({ok:true});
    }
    if (data.action === "approve_collector") {
      if (!admin) throw new Error("Administrator access required.");
      const result = await (await db()).collection("users").updateOne(
        {
          email: data.email.toLowerCase(),
          $or: [{ accountType: "helper" }, { role: "collector" }],
        },
        { $set: { role: "collector", collectorApproved: true } },
      );
      if (!result.matchedCount)
        throw new Error("The helper must sign up with a Helper account first.");
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
        if (net <= 0) throw new Error("Net weight must be at least 0.001 kg.");
        const cap =
          b.source === "membership"
            ? b.recoveryPercent === 15
              ? 10
              : 8
            : b.source === "quote"
              ? 100
              : 2;
        if (b.source === "quote" && net > cap) throw new Error("Measured weight exceeds the agreed specialist collection limit.");
        if (
          b.source === "membership" &&
          a.membership &&
          a.membership.orderId === b.membershipOrderId
        ) {
          const difference = Math.min(net, cap) - Math.min(b.estimatedKg || 0, cap);
          if (difference > a.membership.remainingKg)
            throw new Error(
              "Measured weight exceeds remaining monthly allowance.",
            );
          a.membership.remainingKg -= difference;
        }
        const excessPrice = pickupPrice({ source: b.source, weightKg: net, includedKg: cap, segregated: b.segregated, time: b.window });
        const excessKg = b.source === "quote" ? 0 : excessPrice.excessKg;
        const excessFeePaise = b.source === "quote" ? 0 : excessPrice.excessPaise;
        const measuredPrice =
          b.pricingVersion === "helper-weighed-v1"
            ? pickupPrice({
                source: b.source,
                weightKg: net,
                includedKg: cap,
                segregated: b.segregated,
                time: b.window,
              })
            : null;
        const additionalDuePaise = excessFeePaise + (measuredPrice
          ? measuredPrice.sortingPaise +
            Math.max(0, measuredPrice.surgePaise - (b.surgeFeePaise || 0))
          : 0);
        b.weightPending = false;
        b.totalFeePaise = (b.feePaise || 0) + additionalDuePaise;
        b.receipt = {
          sortingIncluded: b.source === "membership",
          sortingReferencePaise: b.source === "membership" && !b.segregated ? Math.ceil(net * SORTING_PER_KG_PAISE) : 0,
          excessKg,
          excessFeePaise,
          includedKg: cap,
          sortingFeePaise: measuredPrice?.sortingPaise || 0,
          surgeAdjustmentPaise: measuredPrice
            ? Math.max(0, measuredPrice.surgePaise - (b.surgeFeePaise || 0))
            : 0,
          additionalDuePaise,
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
          if (data.feePaise < (b.surgeFeePaise || 0))
            throw new Error(
              "The total quote must include the evening surcharge.",
            );
          if (b.status !== "quote_requested")
            throw new Error("This request is not waiting for a quote.");
          b.feePaise = data.feePaise;
          b.quoteTerms = data.terms;
          b.status = "quote_ready";
        }
        if (data.action === "record_workpay") {
          if (!b.collectorId) throw new Error("Assign a collector first.");
          if (b.status !== "completed") throw new Error("Complete and accept the pickup before recording helper pay.");
          const due = helperCompensation(b as {status:string}).duePaise;
          if (data.amountPaise < due) throw new Error("Record at least the outstanding helper entitlement: ₹" + (due / 100).toFixed(2));
          if (due === 0) throw new Error("No outstanding helper entitlement.");
          if (a.bookings.some(job => job.workPay?.reference === data.reference || job.workPayments?.some((p: {reference:string}) => p.reference === data.reference))) throw new Error("Payment reference already recorded.");
          const previousPaid = b.workPay?.amountPaise || 0;
          b.workPayments = [...(b.workPayments || (b.workPay ? [b.workPay] : [])), { amountPaise: data.amountPaise, reference: data.reference, at: new Date().toISOString(), actor: String(u._id) }];
          b.workPay = {
            amountPaise: previousPaid + data.amountPaise,
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
