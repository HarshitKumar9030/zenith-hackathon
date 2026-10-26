"use client";
import { helperCompensation, type HelperPayJob } from "@/lib/helper-pay";
import OperationsWorkspace from "./operations-workspace";
import RewardsDashboard from "./rewards-dashboard";
import PaymentReceipts from "./payment-receipts";
import recordStyles from "./collection-records.module.css";
import TierBadge from "./tier-badge";
import { pickupTimeLabel } from "@/lib/pickup-time";
import WorkflowArt from "./workflow-art";
import QuickPickup from "./quick-pickup";
import {PickupTracking} from "./pickup-tracking";
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
import {openWasteCheckout} from "@/lib/checkout-client";
import { serviceApi } from "@/lib/client-api";
export { serviceApi } from "@/lib/client-api";
export default function ServiceHub({
  page,
  signedIn,
  onSignIn,
  notify,
  onRefresh,
  onNavigate,
  initialScanId,
  onReviewScan,
}: {
  page: string;
  signedIn: boolean;
  onSignIn: () => void;
  notify: (v: string) => void;
  onRefresh: () => void;
  onNavigate?: (page: string) => void;
  initialScanId?: string;
  onReviewScan?: (id:string)=>void;
}) {
  const [a, setAccount] = useState<Account | null>(null),
    [role, setRole] = useState("resident"),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false),
    [jobs, setJobs] = useState<Record<string, unknown>[]>([]),
    [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [rewardMoment, setRewardMoment] = useState(0);
  const [loading,setLoading] = useState(true),[loadError,setLoadError] = useState("");
  const [ranking, setRanking] = useState<
    { alias: string; days: number; rank: number; isYou: boolean }[]
  >([]);
  const refresh = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true);setLoadError("");
    try {
      const data = await serviceApi("service");
      setAccount(data.account);
      setRole(data.role);
      setAvailable(data.checkoutAvailable);
      if (page === "Rewards") {
        const leaders = await serviceApi("leaderboard");
        setRanking(leaders.entries);
      }
      if (
        ["collector", "admin"].includes(data.role) &&
        ["Operations", "Collection route"].includes(page)
      ) {
        const op = await serviceApi("operations");
        setJobs(op.jobs);
        setUsers(op.users);
      }
    } catch (e) {
      setLoadError((e as Error).message);
      notify((e as Error).message);
    } finally { setLoading(false); }
  }, [signedIn, notify, page]);
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
  async function checkout(plan:string,bookingId?:string){
    if(busy)return;setBusy(true);
    try{
      const result=await openWasteCheckout(plan,bookingId);
      await refresh();onRefresh();
      notify(result.paid?(result.outcome==='review_needed'?"Payment received. Operations will review it.":"Payment confirmed."):"Payment not completed. You can try again from this screen.");
    }catch(e){notify((e as Error).message)}finally{setBusy(false)}
  }

  const bookings = a?.bookings || [];
  const titles: Record<string, [string, string]> = {
    Plans: [
      "Collection that fits your routine.",
      "Choose a one-month pass or pay for a small pickup. No automatic renewal.",
    ],
    Pickups: [
      "Book a pickup.",
      "Choose your items and time. Your price is calculated automatically.",
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
          {a?.membership && <section id="current-plan" aria-label="Current plan details" className="current-plan-summary">
            <h2>Your {String(a.membership.plan).replace(/^./, c => c.toUpperCase())} pass</h2>
            <p>{String(a.membership.remainingPickups)} pickups and {String(a.membership.remainingKg)} kg remaining. Valid until {new Date(a.membership.expiresAt).toLocaleDateString()}.</p>
            <p>Renews manually. No automatic charges. Choose your next pass after this one expires.</p>
            <button type="button" className="text-button" onClick={() => onNavigate?.("My history")}>View collection receipts and disputes</button>
          </section>}
          <div className="plan-grid">
            {Object.entries(PLANS).map(([key, p]) => (
              <section
                className={`plan-option ${key === "gold" ? "featured" : ""}`}
                key={key}
              >
                <span className="micro">
                  {key === "basic" ? "PAY PER PICKUP" : "ONE-MONTH PASS"}
                </span>
                <h2 className="plan-heading">{key !== "basic" && <TierBadge tier={key as "gold" | "platinum"} size={46}/>} {p.name}</h2>
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
                    {a?.membership?.plan === key ? "Current plan" : a?.membership ? "Available after current pass" : `Choose ${p.name}`} {!a?.membership && <ArrowRight size={16} />}
                  </button>
                )}
              </section>
            ))}
          </div>
          {!available && (
            <div className="service-notice">
              Online payments are not available yet. Paid plans activate only
              after payment is verified.
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
          {bookings.filter(b=>b.status === "assigned").map(b=><PickupTracking key={b.id} bookingId={b.id}/>)}
          <QuickPickup
            notify={notify}
            onReview={onReviewScan}
            initialScanId={initialScanId}
            onScan={() => onNavigate?.("Identify waste")}
            onRecords={() => onNavigate?.("My history")}
            onBooked={() => {
              void refresh();
              onRefresh();
            }}
            onPlans={() => onNavigate?.("Plans")}
          />
        </>
      )}
      {page === "My history" && (
        <>
          <h2 id="collection-records" className="section-spaced">
            Receipts &amp; disputes
          </h2>
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
                {b.date} · {(b.asap ? "Next available helper" : pickupTimeLabel(b.window))} ·{" "}
                {b.receipt
                  ? `${b.receipt.netKg} kg measured`
                  : "Helper weighs at collection"}{" "}
                · {b.source}
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
                  {b.status === "assigned" && <PickupTracking bookingId={b.id}/>}
                  <p>
                    Gross {b.receipt.grossKg} kg − tare {b.receipt.tareKg} kg ={" "}
                    {b.receipt.netKg} kg net
                  </p>
                  <p>
                    {b.receipt.material} · {b.receipt.notes}
                  </p>
                  {b.receipt.additionalDuePaise > 0 && (
                    <p>
                      Sorting ₹{(b.receipt.sortingFeePaise / 100).toFixed(2)}
                      {b.receipt.excessFeePaise > 0 ? ` + extra weight ₹${(b.receipt.excessFeePaise / 100).toFixed(2)} (${b.receipt.excessKg} kg × ₹3)` : ""}
                      {b.receipt.surgeAdjustmentPaise > 0
                        ? ` + evening adjustment ₹${b.receipt.surgeAdjustmentPaise / 100}`
                        : ""}{" "}
                      · Additional amount ₹
                      {(b.receipt.additionalDuePaise / 100).toFixed(2)}. Review
                      and accept before payment.
                    </p>
                  )}
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
                {[
                  "payment_due",
                  "quote_ready",
                  "payment_due_after_collection",
                ].includes(b.status) && (
                  <button
                    className="primary"
                    disabled={busy || !available}
                    onClick={() => checkout("basic", b.id)}
                  >
                    {b.status === "quote_ready" ? "Accept quote & pay" : "Pay"}{" "}
                    ₹
                    {(
                      (b.status === "payment_due_after_collection"
                        ? b.balanceDuePaise
                        : b.feePaise) / 100
                    ).toFixed(2)}{" "}
                    securely
                  </button>
                )}
                {[
                  "payment_due",
                  "scheduled",
                  "assigned",
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
              {[
                "receipt_pending",
                "payment_due_after_collection",
                "completed",
              ].includes(b.status) && (
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
        loading ? <div className="empty" role="status"><Loader2 className="spin" size={24}/><h2>Opening Operations…</h2></div> : loadError ? <div className="empty" role="alert"><h2>Operations could not load.</h2><p>{loadError}</p><button className="primary" onClick={()=>void refresh()}>Try again</button></div> : !(page === "Operations" ? role === "admin" : ["collector", "admin"].includes(role)) ? <div className="empty"><ShieldCheck size={35}/><h2>{page === "Operations" ? "Administrator access required." : "Approved partner access required."}</h2><p>{page === "Operations" ? "Sign in with a verified email included in the server’s admin allowlist." : "Operations must approve your helper account before you can see collection jobs."}</p></div> : <OperationsWorkspace jobs={jobs} users={users} role={role as "admin" | "collector"} busy={busy} onAction={(data) => action("operations", data)}/>
      )}
    </>
  );
}
