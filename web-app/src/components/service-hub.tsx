"use client";
import { helperCompensation, type HelperPayJob } from "@/lib/helper-pay";
import OperationsWorkspace from "./operations-workspace";
import RewardsDashboard from "./rewards-dashboard";
import PaymentReceipts from "./payment-receipts";
import recordStyles from "./collection-records.module.css";
import { pickupTimeLabel } from "@/lib/pickup-time";
import PickupTimeInput from "./pickup-time-input";
import LocationPicker from "./location-picker";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowRight,
  Check,
  CalendarDays,
  Gift,
  MapPin,
  ShieldCheck,
  Loader2,
  Truck,
  Wallet,
  RotateCcw,
} from "lucide-react";
import Dropdown from "./dropdown";
import { PLANS } from "@/lib/catalog";
import type { Account } from "@/lib/service";
export async function serviceApi(path: string, body?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "Request failed.");
  return value;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}
async function loadCheckout() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Checkout could not load. Check your connection."));
    document.head.appendChild(script);
  });
}
export default function ServiceHub({
  page,
  signedIn,
  onSignIn,
  notify,
  onRefresh,
  onNavigate,
}: {
  page: string;
  signedIn: boolean;
  onSignIn: () => void;
  notify: (v: string) => void;
  onRefresh: () => void;
  onNavigate?: (page: string) => void;
}) {
  const [estimatedWeight, setEstimatedWeight] = useState(0),
    [segregated, setSegregated] = useState(false);
  const [a, setAccount] = useState<Account | null>(null),
    [role, setRole] = useState("resident"),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false),
    [jobs, setJobs] = useState<Record<string, unknown>[]>([]),
    [users, setUsers] = useState<Record<string, unknown>[]>([]),
    [scanId, setScanId] = useState(""),
    [scans, setScans] = useState<
      {
        _id: string;
        identification: { object_name: string };
        confirmed?: boolean;
      }[]
    >([]);
  const [funding, setFunding] = useState("basic"),
    [timeWindow, setTimeWindow] = useState("09:00");
  const [rewardMoment, setRewardMoment] = useState(0);
  const [ranking, setRanking] = useState<
    { alias: string; days: number; rank: number; isYou: boolean }[]
  >([]);
  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const data = await serviceApi("service");
      setAccount(data.account);
      setRole(data.role);
      setAvailable(data.checkoutAvailable);
      const leaders = await serviceApi("leaderboard");
      setRanking(leaders.entries);
      const h = await serviceApi("history");
      setScans(h.items.filter((s: { confirmed?: boolean }) => s.confirmed));
      if (["collector", "admin"].includes(data.role)) {
        const op = await serviceApi("operations");
        setJobs(op.jobs);
        setUsers(op.users);
      }
    } catch (e) {
      notify((e as Error).message);
    }
  }, [signedIn, notify]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function action(path: string, data: unknown, celebrate = false) {
    setBusy(true);
    try {
      const response = await serviceApi(path, data);
      if (celebrate) setRewardMoment((n) => n + 1);
      if (response.account) setAccount(response.account);
      await refresh();
      onRefresh();
      notify("Saved.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout(plan: string, bookingId?: string) {
    setBusy(true);
    try {
      const order = await serviceApi("payments/order", { plan, bookingId });
      await loadCheckout();
      new window.Razorpay!({
        key: order.key,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: "Waste Right",
        description:
          plan === "basic" ? "Basic waste pickup" : `${plan} one-month pass`,
        prefill: { name: order.name, email: order.email },
        theme: { color: "#5658A5" },
        handler: async (data: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verified = await serviceApi("payments/verify", {
              orderId: data.razorpay_order_id,
              paymentId: data.razorpay_payment_id,
              signature: data.razorpay_signature,
            });
            await refresh();
            onRefresh();
            notify(
              verified.outcome === "review_needed"
                ? "Payment captured but needs Operations review before fulfillment."
                : "Payment verified. Your service allowance has been updated.",
            );
          } catch (e) {
            notify((e as Error).message);
          }
        },
      }).open();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const bookings = a?.bookings || [];
  const titles: Record<string, [string, string]> = {
    Plans: [
      "Collection that fits your routine.",
      "Choose a one-month pass or pay for a small pickup. No automatic renewal.",
    ],
    Pickups: [
      "Your next handover.",
      "Confirm a scan, save your address, and choose a collection window.",
    ],
    Rewards: ["Good habits. Useful rewards.", "Scan, confirm, and turn your points into a pickup."],
    "My history": ["My history.", "Your scans, collection receipts and disputes in one place."],
    "Collection route": [
      "Your collection route.",
      "Claim a scheduled handover, verify the materials, and record scale weight.",
    ],
    Operations: [
      "Clear records. Accountable service.",
      "Approve collectors, review disputes, and record accepted recovery proceeds.",
    ],
  };
  const heading = titles[page] || titles.Pickups;
  if (!signedIn)
    return (
      <>
        <div className="page-heading">
          <h1>{heading[0]}</h1>
          <p>{heading[1]}</p>
        </div>
        <div className="empty spacious">
          <ShieldCheck size={35} />
          <h2>Your account keeps everything together.</h2>
          <p>
            Sign in to manage collection, plans, receipts and reward credits.
          </p>
          <button className="primary" onClick={onSignIn}>
            Sign in <ArrowRight size={16} />
          </button>
        </div>
      </>
    );
  return (
    <>
      {!["Rewards", "My history", "Operations", "Collection route"].includes(page) && <div className="page-heading heading-actions">
        <div>
          <h1>{heading[0]}</h1>
          <p>{heading[1]}</p>
        </div>
        <button
          className="secondary"
          onClick={() => void refresh()}
          aria-label="Refresh service data"
        >
          <RotateCcw size={16} />
          Refresh
        </button>
      </div>}
      {page === "Plans" && (
        <>
          <div className="plan-grid">
            {Object.entries(PLANS).map(([key, p]) => (
              <section
                className={`plan-option ${key === "gold" ? "featured" : ""}`}
                key={key}
              >
                <span className="micro">
                  {key === "basic" ? "PAY PER PICKUP" : "ONE-MONTH PASS"}
                </span>
                <h2>{p.name}</h2>
                <div className="plan-price">
                  ₹{p.price}
                  <small> / {key === "basic" ? "pickup" : "month"}</small>
                </div>
                <p>
                  {key === "basic"
                    ? "Book a confirmed small-load collection."
                    : `${p.pickups} pickups · ${p.monthlyKg} kg monthly allowance`}
                </p>
                <ul>
                  <li>Up to {p.perPickupKg} kg per pickup</li>
                  <li>Available locality route windows</li>
                  <li>
                    {p.recoveryPercent
                      ? `${p.recoveryPercent}% of positive net accepted recovery proceeds`
                      : "No recovery payout"}
                  </li>
                  <li>{key === "basic" ? "Unsegregated waste: ₹5/kg after helper weighing" : "Segregation included · no sorting charge"}</li>
                </ul>
                {key === "basic" ? (
                  <p className="micro">BOOK AND PAY UNDER PICKUPS</p>
                ) : (
                  <button
                    className="primary"
                    disabled={busy || !available || Boolean(a?.membership)}
                    onClick={() => checkout(key)}
                  >
                    Choose {p.name} <ArrowRight size={16} />
                  </button>
                )}
              </section>
            ))}
          </div>
          {!available && (
            <div className="service-notice">
              Checkout is awaiting Razorpay configuration. No payment is
              simulated and no pass activates without verified payment.
            </div>
          )}
          {a?.membership && (
            <div className="service-notice">
              Active {String(a.membership.plan)} pass ·{" "}
              {String(a.membership.remainingPickups)} pickups and{" "}
              {String(a.membership.remainingKg)} kg remaining · expires{" "}
              {new Date(a.membership.expiresAt).toLocaleDateString()}
            </div>
          )}
          <PaymentReceipts payments={a?.payments ?? []} loading={!a} />
          <p className="service-footnote">
            Metal counts toward plan limits. Special-handling waste cannot use ordinary instant booking. Recovery shares use actual accepted proceeds after agreed direct costs.
          </p>
        </>
      )}
      {page === "Rewards" && <RewardsDashboard account={a} ranking={ranking} busy={busy} onRedeem={() => void action("service", { action: "redeem" }, true)} onNavigate={(next) => onNavigate?.(next)} celebration={rewardMoment} />}
      {page === "Pickups" && (
        <>
          <div className="service-columns">
            <section className="service-block">
              <h2>Collection address</h2>
              <LocationPicker />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action("service", {
                    action: "profile",
                    address: f.get("address"),
                    locality: f.get("locality"),
                    alias: f.get("alias"),
                    leaderboard: f.get("leaderboard") === "on",
                  });
                }}
                key={a?.rev}
              >
                <label className="field">
                  Address
                  <textarea
                    name="address"
                    required
                    minLength={8}
                    maxLength={500}
                    defaultValue={a?.profile.address}
                    rows={3}
                  />
                </label>
                <label className="field">
                  Locality / campus
                  <input
                    name="locality"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={a?.profile.locality}
                  />
                </label>
                <label className="field">
                  Public alias (optional)
                  <input
                    name="alias"
                    maxLength={40}
                    defaultValue={a?.profile.alias}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    name="leaderboard"
                    defaultChecked={a?.profile.leaderboard}
                  />
                  Join the locality leaderboard with my alias
                </label>
                <button className="secondary" disabled={busy}>
                  <MapPin size={16} />
                  Save address
                </button>
              </form>
            </section>
            <section className="service-block">
              <h2>Schedule a pickup</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action("service", {
                    action: "book",
                    requestId: crypto.randomUUID(),
                    source: funding,
                    scanId,
                    weightKg: Number(f.get("weightKg")),
                    date: f.get("date"),
                    window: timeWindow,
                    segregated: f.get("segregated") === "on",
                  });
                }}
              >
                <label className="field">Confirmed item</label>
                <Dropdown
                  label="Choose a confirmed scan"
                  value={scanId}
                  onChange={setScanId}
                  options={scans.map((s) => ({
                    value: s._id,
                    label: s.identification.object_name,
                  }))}
                />
                <label className="field">
                  Use
                  <Dropdown
                    label="Pickup funding"
                    value={funding}
                    onChange={setFunding}
                    options={[
                      { value: "basic", label: "Basic · ₹20, up to 2 kg" },
                      { value: "reward", label: "Reward pickup credit" },
                      { value: "membership", label: "Paid plan allowance" },
                    ]}
                  />
                </label>
                <label className="field">
                  Estimated weight in kg
                  <input
                    name="weightKg"
                    onChange={(e) => setEstimatedWeight(Number(e.target.value))}
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    required
                  />
                </label>
                <label className="field">
                  Collection date
                  <input
                    name="date"
                    type="date"
                    required
                    min={new Date(Date.now() + 86400000).toLocaleDateString(
                      "en-CA",
                    )}
                    max={new Date(
                      Date.now() + 30 * 86400000,
                    ).toLocaleDateString("en-CA")}
                  />
                </label>
                <PickupTimeInput
                  value={timeWindow}
                  onChange={setTimeWindow}
                  weightKg={estimatedWeight}
                  segregated={segregated}
                />
                <label className="check-row">
                  <input
                    type="checkbox"
                    name="segregated"
                    onChange={(e) => setSegregated(e.target.checked)}
                  />
                  I have separated the accepted materials
                </label>
                <button className="primary" disabled={busy || !scanId}>
                  <CalendarDays size={16} />
                  Request pickup
                </button>
                <small>
                  Unsegregated or specialist waste requires an Operations quote.
                  A request is subject to collector availability.
                </small>
              </form>
            </section>
          </div>
        </>
      )}
      {page === "My history" && (
        <>
          <h2 className="section-spaced">Receipts &amp; disputes</h2>
          {!bookings.length && (
            <div className="empty">
              <Truck size={30} />
              <p>No pickups yet. Confirm a scan to book your first.</p>
            </div>
          )}
          {[...bookings].reverse().map((b) => (
            <details className={recordStyles.record} key={b.id} open={["receipt_pending", "payment_due", "payment_due_after_collection", "disputed"].includes(b.status)}>
              <summary>
              <div className="section-heading">
                <h3>{b.item}</h3>
                <span className="status">
                  {String(b.status).replaceAll("_", " ")}
                </span>
              </div>
              <p>
                {b.date} · {pickupTimeLabel(b.window)} · estimated{" "}
                {b.estimatedKg} kg · {b.source}
              </p>
              </summary>
              {b.surgeFeePaise > 0 && (
                <p>
                  Evening surcharge: ₹{b.surgeFeePaise / 100} · Included in
                  total collection fee
                </p>
              )}
              {b.receipt && (
                <div className="receipt">
                  <h3>Measured receipt</h3>
                  {b.receipt.excessFeePaise > 0 && <p>Extra weight: {b.receipt.excessKg} kg × ₹3 = ₹{(b.receipt.excessFeePaise / 100).toFixed(2)}</p>}
                  <p>
                    Gross {b.receipt.grossKg} kg − tare {b.receipt.tareKg} kg ={" "}
                    {b.receipt.netKg} kg net
                  </p>
                  <p>
                    {b.receipt.material} · {b.receipt.notes}
                  </p>
                </div>
              )}
              {b.settlement && (
                <p>
                  Recovery share ₹
                  {(b.settlement.residentPaise / 100).toFixed(2)} ·{" "}
                  {b.settlement.status === "paid"
                    ? "Payout recorded by Operations"
                    : "Pending payout"}
                </p>
              )}
              {b.dispute && <p className={recordStyles.review}>Issue reported: {b.dispute.reason}{b.status === "disputed" ? " · Operations review pending." : ""}</p>}
              <div className="inline-actions">
                {["payment_due", "quote_ready"].includes(b.status) && (
                  <button
                    className="primary"
                    disabled={busy || !available}
                    onClick={() => checkout("basic", b.id)}
                  >
                    {b.status === "quote_ready" ? "Accept quote & pay" : "Pay"}{" "}
                    ₹{(b.feePaise / 100).toFixed(2)} securely
                  </button>
                )}
                {[
                  "payment_due",
                  "scheduled",
                  "quote_requested",
                  "quote_ready",
                ].includes(b.status) && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      action("service", { action: "cancel", id: b.id })
                    }
                  >
                    Cancel request
                  </button>
                )}
                {b.status === "receipt_pending" && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      action("service", { action: "accept_receipt", id: b.id })
                    }
                  >
                    <Check size={16} />
                    Accept measured receipt
                  </button>
                )}
              </div>
              {["receipt_pending", "completed"].includes(b.status) && (
                <details className={recordStyles.dispute}><summary>Report a weighing or material issue</summary>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action("service", {
                      action: "dispute",
                      id: b.id,
                      reason: new FormData(e.currentTarget).get("reason"),
                    });
                  }}
                >
                  <input
                    name="reason"
                    aria-label="Reason for dispute"
                    placeholder="Explain a weighing or material dispute…"
                    required
                    minLength={5}
                    maxLength={500}
                  />
                  <button className="secondary" disabled={busy}>
                    Raise dispute
                  </button>
                </form></details>
              )}
            </details>
          ))}
        </>
      )}
      {["Collection route", "Operations"].includes(page) && (
        !["collector", "admin"].includes(role) ? <div className="empty"><ShieldCheck size={35}/><h2>Approved partner access required.</h2><p>Operations must approve your helper account before you can see collection jobs.</p></div> : <OperationsWorkspace jobs={jobs} users={users} role={role as "admin" | "collector"} busy={busy} onAction={(data) => action("operations", data)}/>
      )}
    </>
  );
}
