"use client";
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
}: {
  page: string;
  signedIn: boolean;
  onSignIn: () => void;
  notify: (v: string) => void;
  onRefresh: () => void;
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
  async function action(path: string, data: unknown) {
    setBusy(true);
    try {
      const response = await serviceApi(path, data);
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
    Rewards: [
      "A good habit earns a useful reward.",
      "One confirmed scan day earns one point. Redeem throughout the month.",
    ],
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
      <div className="page-heading heading-actions">
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
      </div>
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
                  <li>
                    Separate quote for assisted sorting or specialist waste
                  </li>
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
          <section className="service-block section-spaced">
            <h2>Payment receipts</h2>
            {a?.payments.length ? (
              a.payments.map((p) => (
                <p key={p.orderId}>
                  {new Date(p.createdAt).toLocaleDateString()} · {p.plan} · ₹
                  {(p.amountPaise / 100).toFixed(2)} · {p.status} ·{" "}
                  {p.paymentId}
                </p>
              ))
            ) : (
              <p>
                No captured payments. Your pass activates only after gateway
                verification.
              </p>
            )}
          </section>
          <p className="service-footnote">
            Dry recyclables only. Metal counts toward limits. Organic collection
            and hazardous waste need separate arrangements. Recovery rates are
            pilot defaults and use actual accepted proceeds after agreed direct
            costs.
          </p>
        </>
      )}
      {page === "Rewards" && (
        <>
          <section className="rewards-summary">
            <div>
              <img src="/assets/fire.svg" width="46" height="52" alt="" />
              <h2>{a?.points || 0} scan points</h2>
              <p>Earned points remain when a streak breaks.</p>
            </div>
            <div>
              <Gift size={35} />
              <h2>{a?.credits || 0} pickup credits</h2>
              <p>Each credit covers one Basic pickup up to 2 kg.</p>
            </div>
          </section>
          <section className="service-block">
            <h2>10 points. One pickup credit.</h2>
            <p>
              Redeem any time during the month, up to two credits per calendar
              month. Credit pickups use the same route windows and handling
              limits as Basic.
            </p>
            <button
              className="primary"
              disabled={busy || (a?.points || 0) < 10}
              onClick={() => action("service", { action: "redeem" })}
            >
              <Gift size={17} />
              Redeem 10 points
            </button>
          </section>
          <div className="service-block">
            <h2>Your locality leaderboard</h2>
            <p>
              {a?.profile.locality ||
                "Save your locality under Pickups to see your community."}{" "}
              · opt-in aliases only · ranked by distinct confirmed scan days,
              not waste generated
            </p>
            {ranking.length ? (
              ranking.map((r) => (
                <p key={r.rank}>
                  {r.rank}. {r.alias}
                  {r.isYou ? " (you)" : ""} · {r.days} confirmed scan days
                </p>
              ))
            ) : (
              <p>
                No participating aliases yet. Join under your collection
                profile.
              </p>
            )}
          </div>
          <div className="service-block">
            <h3>Your redemption history</h3>
            {a?.redemptions.length ? (
              a.redemptions.map((r) => (
                <p key={r.id}>
                  {new Date(r.createdAt).toLocaleDateString()} · 10 points
                  exchanged for one pickup credit
                </p>
              ))
            ) : (
              <p>No redemptions yet. Confirm a scan to start earning.</p>
            )}
          </div>
        </>
      )}
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
          <h2 className="section-spaced">Your collection records</h2>
          {!bookings.length && (
            <div className="empty">
              <Truck size={30} />
              <p>No pickups yet. Confirm a scan to book your first.</p>
            </div>
          )}
          {[...bookings].reverse().map((b) => (
            <section className="booking-entry" key={b.id}>
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
              {b.surgeFeePaise > 0 && (
                <p>
                  Evening surcharge: ₹{b.surgeFeePaise / 100} · Included in
                  total collection fee
                </p>
              )}
              {b.receipt && (
                <div className="receipt">
                  <h3>Measured receipt</h3>
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
                    placeholder="Explain a weighing or material dispute…"
                    required
                    minLength={5}
                    maxLength={500}
                  />
                  <button className="secondary" disabled={busy}>
                    Raise dispute
                  </button>
                </form>
              )}
            </section>
          ))}
        </>
      )}
      {["Collection route", "Operations"].includes(page) &&
        (!["collector", "admin"].includes(role) ? (
          <div className="empty">
            <ShieldCheck size={35} />
            <h2>Approved partner access required.</h2>
            <p>
              Operations must approve your existing account before you can see
              collection jobs.
            </p>
          </div>
        ) : (
          <>
            <section className="rewards-summary">
              <div>
                <h3>Recorded collector work pay</h3>
                <h2>
                  ₹
                  {(
                    jobs.reduce(
                      (sum, b) =>
                        sum +
                        Number(
                          (b.workPay as { amountPaise?: number } | undefined)
                            ?.amountPaise || 0,
                        ),
                      0,
                    ) / 100
                  ).toFixed(2)}
                </h2>
                <p>
                  Actual payments recorded by Operations for these loaded jobs.
                </p>
              </div>
              <div>
                <h3>Accepted net recovery pool</h3>
                <h2>
                  ₹
                  {(
                    jobs.reduce(
                      (sum, b) =>
                        sum +
                        Number(
                          (b.settlement as { netPaise?: number } | undefined)
                            ?.netPaise || 0,
                        ),
                      0,
                    ) / 100
                  ).toFixed(2)}
                </h2>
                <p>
                  After recorded direct recovery costs, before resident shares
                  and other business expenses. Not net profit.
                </p>
              </div>
            </section>
            {role === "admin" && (
              <section className="service-block">
                <h2>Approve a collection partner</h2>
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action("operations", {
                      action: "approve_collector",
                      email: new FormData(e.currentTarget).get("email"),
                    });
                  }}
                >
                  <input
                    name="email"
                    type="email"
                    placeholder="Existing account email"
                    required
                  />
                  <button className="primary">Approve collector</button>
                </form>
                <p>
                  {users.length} registered accounts visible to Operations.
                  Helpers choose their account type during signup. Operations
                  approval is required before collecting.
                </p>
              </section>
            )}
            {jobs.length === 0 && (
              <div className="empty">
                <Truck size={30} />
                <p>No assigned or scheduled pickups.</p>
              </div>
            )}
            {jobs.map((b) => (
              <section className="booking-entry" key={String(b.id)}>
                <div className="section-heading">
                  <h3>{String(b.item)}</h3>
                  <span className="status">
                    {String(b.status).replaceAll("_", " ")}
                  </span>
                </div>
                <p>
                  {String(b.locality)} · {String(b.date)} · {String(b.window)}
                </p>
                {Boolean(b.address) && <p>{String(b.address)}</p>}
                {b.status === "scheduled" && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      action("operations", {
                        action: "claim",
                        id: b.id,
                        residentId: b.residentId,
                      })
                    }
                  >
                    Claim collection
                  </button>
                )}
                {role === "admin" && b.status === "quote_requested" && (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action("operations", {
                        action: "quote",
                        id: b.id,
                        residentId: b.residentId,
                        feePaise: Math.round(Number(f.get("fee")) * 100),
                        terms: f.get("terms"),
                      });
                    }}
                  >
                    <input
                      name="fee"
                      type="number"
                      min=".01"
                      step=".01"
                      placeholder="Total quoted fee ₹"
                      required
                    />
                    <input
                      name="terms"
                      minLength={10}
                      maxLength={1000}
                      placeholder="Accepted materials, handling and limits"
                      required
                    />
                    <button className="secondary">Send quote</button>
                  </form>
                )}
                {role === "admin" && Boolean(b.collectorId) && !b.workPay && (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action("operations", {
                        action: "record_workpay",
                        id: b.id,
                        residentId: b.residentId,
                        amountPaise: Math.round(Number(f.get("amount")) * 100),
                        reference: f.get("reference"),
                      });
                    }}
                  >
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step=".01"
                      placeholder="Actual collector pay ₹"
                      required
                    />
                    <input
                      name="reference"
                      minLength={5}
                      placeholder="Bank / UPI reference"
                      required
                    />
                    <button className="secondary">
                      Record collector payment
                    </button>
                  </form>
                )}
                {Boolean(b.workPay) && (
                  <p>
                    Collector work pay: ₹
                    {(
                      Number(
                        (b.workPay as { amountPaise: number }).amountPaise,
                      ) / 100
                    ).toFixed(2)}{" "}
                    · recorded by Operations
                  </p>
                )}
                {b.status === "assigned" && (
                  <form
                    className="weigh-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action("operations", {
                        action: "weigh",
                        id: b.id,
                        residentId: b.residentId,
                        grossKg: Number(f.get("grossKg")),
                        tareKg: Number(f.get("tareKg")),
                        material: f.get("material"),
                        notes: f.get("notes"),
                      });
                    }}
                  >
                    <label className="field">
                      Gross kg
                      <input
                        name="grossKg"
                        type="number"
                        min="0.001"
                        max="100"
                        step="0.001"
                        required
                      />
                    </label>
                    <label className="field">
                      Container tare kg
                      <input
                        name="tareKg"
                        type="number"
                        min="0"
                        max="100"
                        step="0.001"
                        required
                      />
                    </label>
                    <label className="field">
                      Verified material
                      <input
                        name="material"
                        defaultValue={String(b.material)}
                        required
                      />
                    </label>
                    <label className="field">
                      Notes
                      <input name="notes" maxLength={500} />
                    </label>
                    <button className="primary" disabled={busy}>
                      Send receipt for resident approval
                    </button>
                  </form>
                )}
                {role === "admin" &&
                  b.status === "completed" &&
                  !b.settlement && (
                    <form
                      className="weigh-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void action("operations", {
                          action: "settle",
                          id: b.id,
                          residentId: b.residentId,
                          buyerProceedsPaise: Math.round(
                            Number(f.get("proceeds")) * 100,
                          ),
                          directCostsPaise: Math.round(
                            Number(f.get("costs")) * 100,
                          ),
                          reference: f.get("reference"),
                        });
                      }}
                    >
                      <label className="field">
                        Actual buyer proceeds ₹
                        <input
                          name="proceeds"
                          type="number"
                          min="0"
                          step=".01"
                          required
                        />
                      </label>
                      <label className="field">
                        Agreed direct costs ₹
                        <input
                          name="costs"
                          type="number"
                          min="0"
                          step=".01"
                          required
                        />
                      </label>
                      <label className="field">
                        Buyer receipt reference
                        <input name="reference" minLength={5} required />
                      </label>
                      <button className="secondary">Record settlement</button>
                    </form>
                  )}
                {role === "admin" && Boolean(b.settlement) && (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action("operations", {
                        action: "record_payout",
                        id: b.id,
                        residentId: b.residentId,
                        reference: new FormData(e.currentTarget).get(
                          "reference",
                        ),
                      });
                    }}
                  >
                    <input
                      name="reference"
                      minLength={5}
                      placeholder="Actual bank/UPI payout reference"
                      required
                    />
                    <button className="secondary">
                      Record completed payout
                    </button>
                  </form>
                )}
                {role === "admin" && b.status === "disputed" && (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action("operations", {
                        action: "resolve_dispute",
                        id: b.id,
                        residentId: b.residentId,
                        reason: new FormData(e.currentTarget).get("reason"),
                      });
                    }}
                  >
                    <input
                      name="reason"
                      minLength={5}
                      placeholder="Resolution agreed with resident"
                      required
                    />
                    <button className="secondary">
                      Return receipt for approval
                    </button>
                  </form>
                )}
              </section>
            ))}
          </>
        ))}
    </>
  );
}
