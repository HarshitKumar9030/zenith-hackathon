import { demoHelper, assignDemoHelper } from "./demo-assignment";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { changeAccount, PLANS, type Plan } from "./service";
export function gateway() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new Error(
      "Razorpay is not configured. Add test credentials to .env.local.",
    );
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}
export function signatureValid(
  body: string,
  signature: string,
  secret: string,
) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return (
    /^[a-f0-9]{64}$/i.test(signature) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature.toLowerCase()))
  );
}
export async function applyCapture(
  orderId: string,
  paymentId: string,
  amount: number,
  currency: string,
) {
  const database = await db();
  const order = await database
    .collection("payment_orders")
    .findOne({ orderId });
  if (!order || order.amount !== amount || currency !== "INR")
    throw new Error("Payment does not match a recorded order.");
  const helper = order.plan === "basic" && order.stage !== "final" ? await demoHelper(new ObjectId(order.userId)) : null;
  const outcome = await changeAccount(new ObjectId(order.userId), (a) => {
    if (a.payments.some((p) => p.orderId === orderId)) return "duplicate";
    const receipt = {
      orderId,
      paymentId,
      amountPaise: amount,
      plan: order.plan,
      bookingId: order.bookingId,
      status: "captured",
      createdAt: new Date().toISOString(),
    };
    if (order.plan === "basic") {
      const b = a.bookings.find((b) => b.id === order.bookingId);
      const final = order.stage === "final";
      if (
        !b ||
        (final
          ? b.status !== "payment_due_after_collection" ||
            amount !== b.balanceDuePaise
          : !["payment_due", "quote_ready"].includes(b.status) ||
            amount !== b.feePaise)
      )
        receipt.status = "review_needed";
      else if (final) {
        b.status = "completed";
        b.finalPaymentId = paymentId;
        b.finalPaidPaise = (b.finalPaidPaise || 0) + amount;
        b.balanceDuePaise = 0;
        b.events.push({
          status: "final_payment_received",
          at: new Date().toISOString(),
        });
      } else {
        b.status = "scheduled";
        b.paymentId = paymentId;
        b.events.push({ status: "paid", at: new Date().toISOString() });
        assignDemoHelper(b, helper);
      }
    } else {
      if (a.membership && new Date(a.membership.expiresAt) > new Date())
        receipt.status = "review_needed";
      else {
        const p = PLANS[order.plan as Plan];
        if (!p) throw new Error("Unknown plan.");
        const expiry = new Date();
        const day = expiry.getUTCDate();
        expiry.setUTCDate(1);
        expiry.setUTCMonth(expiry.getUTCMonth() + 1);
        const last = new Date(
          Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0),
        ).getUTCDate();
        expiry.setUTCDate(Math.min(day, last));
        a.membership = {
          plan: order.plan,
          orderId,
          startedAt: new Date().toISOString(),
          expiresAt: expiry.toISOString(),
          remainingPickups: p.pickups,
          remainingKg: p.monthlyKg,
        };
      }
    }
    a.payments.push(receipt);
    return receipt.status;
  });
  if (outcome !== "duplicate")
    await database.collection("payment_orders").updateOne(
      { _id: order._id },
      {
        $set: {
          status: outcome === "review_needed" ? "review_needed" : "captured",
          paymentId,
          capturedAt: new Date(),
        },
      },
    );
  return outcome;
}
