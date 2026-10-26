import { NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { currentUser, checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, PLANS } from "@/lib/service";
import { gateway, signatureValid, applyCapture, reconcileBookingPayment } from "@/lib/payments";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await ctx.params;
    if (action === "webhook") {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret)
        return NextResponse.json(
          { error: "Webhook not configured." },
          { status: 503 },
        );
      const raw = await req.text();
      if (
        !signatureValid(
          raw,
          req.headers.get("x-razorpay-signature") || "",
          secret,
        )
      )
        return NextResponse.json(
          { error: "Invalid signature." },
          { status: 400 },
        );
      const event = JSON.parse(raw);
      if (event.event === "payment.captured") {
        const p = event.payload?.payment?.entity;
        if (!p?.id || !p.order_id) throw new Error("Invalid captured payment.");
        await applyCapture(p.order_id, p.id, p.amount, p.currency);
      }
      if (event.event === "refund.processed") {
        const refund = event.payload?.refund?.entity;
        if (refund?.payment_id) {
          const order = await (
            await db()
          )
            .collection("payment_orders")
            .findOne({ paymentId: refund.payment_id });
          if (order)
            await changeForRefund(order.userId, order.orderId, refund.amount);
        }
      }
      return NextResponse.json({ received: true });
    }
    checkOrigin(req);
    const u = await currentUser();
    if (!u)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (action === "status") {
      const {bookingId} = z.object({bookingId:z.string().min(1).max(100)}).parse(await req.json());
      return NextResponse.json({state:await reconcileBookingPayment(u._id,bookingId)});
    }
    const client = gateway();
    if (action === "order") {
      const data = z
        .object({
          plan: z.enum(["basic", "gold", "platinum"]),
          bookingId: z.string().optional(),
        })
        .parse(await req.json());
      if (data.plan === "basic" && data.bookingId) {
        const state = await reconcileBookingPayment(u._id, data.bookingId);
        if (state === "paid") return NextResponse.json({alreadyPaid:true,outcome:"captured"});
        if (state !== "unpaid") return NextResponse.json({pending:true,outcome:state});
      }
      const a = await account(u._id);
      if (data.plan === "basic") {
        const b = a.bookings.find((b) => b.id === data.bookingId);
        if (
          !b ||
          ![
            "payment_due",
            "quote_ready",
            "payment_due_after_collection",
          ].includes(b.status)
        )
          throw new Error("Choose an unpaid Basic booking.");
      } else if (a.membership && new Date(a.membership.expiresAt) > new Date())
        throw new Error("Your current pass is still active.");
      const database = await db();
      const recent = await database
        .collection("payment_orders")
        .countDocuments({
          userId: String(u._id),
          createdAt: { $gt: new Date(Date.now() - 3600000) },
        });
      if (recent >= 10)
        throw new Error("Too many checkout attempts. Try again later.");
      const amount =
        data.plan === "basic"
          ? (() => {
              const b = a.bookings.find((b) => b.id === data.bookingId)!;
              return b.status === "payment_due_after_collection"
                ? b.balanceDuePaise
                : b.feePaise;
            })()
          : PLANS[data.plan].price * 100;
      const stage=data.plan === "basic" && a.bookings.find(b=>b.id===data.bookingId)?.status === "payment_due_after_collection" ? "final" : "initial";
      // Reuse an unpaid attempt for this exact booking/stage/amount instead of making duplicate orders.
      const existing=data.plan === "basic" ? await database.collection("payment_orders").findOne({userId:String(u._id),bookingId:data.bookingId,stage,amount,currency:"INR",status:"created"},{sort:{createdAt:-1}}) : null;
      if(existing)return NextResponse.json({orderId:existing.orderId,key:process.env.RAZORPAY_KEY_ID,amount,currency:"INR",name:u.name,email:u.email});
      const id = new ObjectId();
      const order = await client.orders.create({
        amount,
        currency: "INR",
        receipt: id.toString(),
        notes: { userId: String(u._id), plan: data.plan },
      });
      await database.collection("payment_orders").insertOne({
        _id: id,
        orderId: order.id,
        userId: String(u._id),
        plan: data.plan,
        bookingId: data.bookingId,
        stage:
          data.plan === "basic" &&
          a.bookings.find((b) => b.id === data.bookingId)?.status ===
            "payment_due_after_collection"
            ? "final"
            : "initial",
        amount,
        currency: "INR",
        status: "created",
        createdAt: new Date(),
      });
      return NextResponse.json({
        orderId: order.id,
        key: process.env.RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: u.name,
        email: u.email,
      });
    }
    if (action === "verify") {
      const data = z
        .object({
          orderId: z.string().max(100),
          paymentId: z.string().max(100),
          signature: z.string().max(200),
        })
        .parse(await req.json());
      const order = await (
        await db()
      )
        .collection("payment_orders")
        .findOne({ orderId: data.orderId, userId: String(u._id) });
      if (!order) throw new Error("Order not found.");
      if (
        !signatureValid(
          `${data.orderId}|${data.paymentId}`,
          data.signature,
          process.env.RAZORPAY_KEY_SECRET!,
        )
      )
        throw new Error("Payment signature mismatch.");
      const payment = await client.payments.fetch(data.paymentId);
      if (payment.status !== "captured" || payment.order_id !== data.orderId)
        throw new Error(
          "Payment capture is pending. Your plan will update after confirmation.",
        );
      const outcome = await applyCapture(
        data.orderId,
        data.paymentId,
        Number(payment.amount),
        payment.currency,
      );
      return NextResponse.json({ ok: true, outcome });
    }
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues[0].message
            : (e as Error).message || "Payment processing failed.",
      },
      { status: 400 },
    );
  }
}
import { changeAccount } from "@/lib/service";
async function changeForRefund(
  userId: string,
  orderId: string,
  amount: number,
) {
  await changeAccount(new ObjectId(userId), (a) => {
    const p = a.payments.find((p) => p.orderId === orderId);
    if (!p) return;
    p.refundAmountPaise = amount;
    p.status = amount >= p.amountPaise ? "refunded" : "partially_refunded";
    if (amount >= p.amountPaise && a.membership?.orderId === orderId)
      a.membership = null;
    const b = a.bookings.find((b) => b.paymentId === p.paymentId);
    if (
      amount >= p.amountPaise &&
      b &&
      ["scheduled", "assigned", "payment_due"].includes(b.status)
    ) {
      if (b.source === "reward") a.credits++;
      if (
        b.source === "membership" &&
        a.membership?.orderId === b.membershipOrderId
      ) {
        a.membership!.remainingPickups++;
        a.membership!.remainingKg += b.estimatedKg;
      }
      b.status = "cancelled";
    }
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
  try {
    if ((await ctx.params).action !== "receipt") return NextResponse.json({ error: "Not found." }, { status: 404, headers });
    const u = await currentUser();
    if (!u) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers });
    const orderId = new URL(req.url).searchParams.get("orderId");
    if (!orderId || orderId.length > 100) return NextResponse.json({ error: "Choose a payment receipt." }, { status: 400, headers });
    const payment = (await account(u._id)).payments.find((p) => p.orderId === orderId);
    if (!payment) return NextResponse.json({ error: "Receipt not found." }, { status: 404, headers });
    return NextResponse.json({
      issuer: "Waste Right", document: "Payment record", currency: "INR",
      orderId: payment.orderId, paymentId: payment.paymentId, plan: payment.plan,
      amountPaise: payment.amountPaise, status: payment.status, recordedAt: payment.createdAt,
      refundAmountPaise: payment.refundAmountPaise || 0,
      statement: "This is a Waste Right payment record, not a tax invoice or government credential.",
    }, { headers: { ...headers, "Content-Disposition": 'attachment; filename="waste-right-payment-receipt.json"' } });
  } catch {
    return NextResponse.json({ error: "Receipt unavailable. Try again." }, { status: 503, headers });
  }
}
