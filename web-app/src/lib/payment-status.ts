export type PaymentState = "paid" | "unpaid" | "processing" | "review_needed" | "unknown";
export type RecordedOrder = { orderId: string; amount: number };
export type GatewayPayment = { id: string; order_id: string; amount: number | string; currency: string; status: string; amount_refunded?: number };
/** Read existing attempts only. Never creates/captures a charge or trusts browser success. */
export async function inspectPaymentAttempts(
  orders: RecordedOrder[],
  fetchPayments: (orderId: string) => Promise<GatewayPayment[]>,
  apply: (order: RecordedOrder, payment: GatewayPayment) => Promise<string>,
): Promise<PaymentState> {
  const attempts = await Promise.all(orders.map(async order => {
    try { return { order, payments: await fetchPayments(order.orderId) }; }
    catch { return { order, payments: null }; }
  }));
  let pending = false, unknown = false, review = false;
  for (const { order, payments } of attempts) {
    if (!payments) { unknown = true; continue; }
    for (const payment of payments) {
      if (!payment || typeof payment.status !== "string") { unknown=true; continue; }
      if (payment.status === "failed") continue;
      if (!["captured", "authorized", "refunded"].includes(payment.status)) { unknown=true; continue; }
      if (typeof payment.id !== "string" || !payment.id || payment.id.length>100 || payment.order_id !== order.orderId || Number(payment.amount) !== order.amount || payment.currency !== "INR" || (payment.amount_refunded || 0) > 0 || payment.status === "refunded") { review = true; continue; }
      if (payment.status === "captured") {
        const outcome = await apply(order, payment);
        return outcome === "review_needed" ? "review_needed" : "paid";
      }
      pending = true;
    }
  }
  return review ? "review_needed" : pending ? "processing" : unknown ? "unknown" : "unpaid";
}
export function latestScanBooking<T extends { scanId: string; status: string }>(bookings: T[], scanId: string): T | null {
  return [...bookings].reverse().find(booking => booking.scanId === scanId && booking.status !== "cancelled") || null;
}
