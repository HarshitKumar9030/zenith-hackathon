"use client";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Download, ReceiptText, Search } from "lucide-react";
import styles from "./payment-receipts.module.css";

type Payment = { orderId?: string; paymentId?: string; plan?: string; amountPaise?: number; status?: string; createdAt?: string; refundAmountPaise?: number };
const money = (value = 0) => `₹${(value / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "Date unavailable";
const labels: Record<string, string> = { captured: "Paid", created: "Awaiting payment", pending: "Processing", authorized: "Authorised", failed: "Failed", refunded: "Refunded", partially_refunded: "Partially refunded", review_needed: "Under review" };
const planName: Record<string, string> = { basic: "Basic pickup", gold: "Gold membership", platinum: "Platinum membership", reward: "Reward pickup" };

export default function PaymentReceipts({ payments, loading = false }: { payments: readonly Payment[]; loading?: boolean }) {
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => [...payments].sort((a,b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0)), [payments]);
  const visible = sorted.filter((p) => `${planName[p.plan || ""] || p.plan || "Pickup payment"} ${labels[p.status || ""] || "Status unavailable"} ${p.orderId || ""} ${p.paymentId || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className={styles.panel} aria-label="Payment receipts" aria-busy={loading}>
    <header className={styles.heading}><div><span className={styles.eyebrow}>BILLING HISTORY</span><h2>Payment receipts<span>{payments.length}</span></h2><p>Your payments, refunds and transaction details in one place.</p></div><ReceiptText size={28} strokeWidth={1.4} aria-hidden="true" /></header>
    {loading ? <p className={styles.empty} role="status">Loading payment records…</p> : !payments.length ? <div className={styles.empty}><ReceiptText size={30} strokeWidth={1.3} /><h3>No payments yet.</h3><p>Your verified payments will appear here. A plan activates after payment verification.</p></div> : <>
      {payments.length > 4 ? <label className={styles.search}><Search size={17} /><input type="search" placeholder="Search payments or transaction IDs" aria-label="Search payments" value={query} onChange={(e) => setQuery(e.target.value)} /></label> : null}
      <div className={styles.list}>{visible.map((p, index) => {
        const refunded = ["refunded", "partially_refunded"].includes(p.status || "");
        const paid = p.status === "captured";
        return <details className={styles.row} key={p.orderId || `${p.createdAt}-${index}`}>
          <summary><span className={`${styles.icon} ${refunded ? styles.refundIcon : ""}`} aria-hidden="true">{refunded ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span><span className={styles.title}><strong>{planName[p.plan || ""] || "Pickup payment"}</strong><small>{date(p.createdAt)}</small></span><span className={styles.amount}>{money(p.amountPaise)}<span className={`${styles.status} ${paid ? styles.paid : refunded ? styles.refunded : ""}`}>{labels[p.status || ""] || "Status unavailable"}</span></span><ChevronDown className={styles.chevron} size={17} aria-hidden="true" /></summary>
          <div className={styles.body}><dl><div><dt>Order ID</dt><dd>{p.orderId || "Unavailable"}</dd></div><div><dt>Payment ID</dt><dd>{p.paymentId || "Not received yet"}</dd></div><div><dt>Recorded amount</dt><dd>{money(p.amountPaise)}</dd></div>{refunded || (p.refundAmountPaise || 0) > 0 ? <div><dt>Refunded amount</dt><dd>{money(p.refundAmountPaise)}</dd></div> : null}</dl><div className={styles.footer}><span>Waste Right payment record · INR<br />Not a tax invoice.</span>{p.orderId ? <a href={`/api/payments/receipt?orderId=${encodeURIComponent(p.orderId)}`}><Download size={15} />Download record</a> : null}</div></div>
        </details>;
      })}</div>
      {!visible.length ? <p className={styles.empty} role="status">No payments match your search.</p> : null}
      <p className={styles.note}>Pickup weights, collection receipts and disputes are available in My history.</p>
    </>}
  </section>;
}
