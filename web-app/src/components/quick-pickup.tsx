"use client";
import flow from "./simple-flow.module.css";
import {openWasteCheckout} from "@/lib/checkout-client";
import ActionMoment from "./action-moment";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Loader2,
  MapPin,
  Repeat2,
} from "lucide-react";
import { pickupTimeLabel, validPickupTime, nextPickupSlot } from "@/lib/pickup-time";
import { pickupPrice } from "@/lib/pickup-pricing";
import { serviceApi } from "@/lib/client-api";
import { PLANS } from "@/lib/catalog";
import type { Account } from "@/lib/service";
import PickupTimeInput from "./pickup-time-input";
import Dropdown from "./dropdown";
import LocationPicker from "./location-picker";
type Scan = {
  _id: string;
  identification: { object_name: string; special_handling: string };
};
export default function QuickPickup({
  scanId,
  initialScanId,
  onRecords,
  notify,
  onPlans,
  onScan,
  onBooked,
  onReview,
}: {
  scanId?: string;
  initialScanId?: string;
  onRecords: () => void;
  notify: (text: string) => void;
  onPlans?: () => void;
  onScan?: () => void;
  onBooked?: () => void;
  onReview?: (id:string)=>void;
}) {
  const [account, setAccount] = useState<Account | null>(null),
    [scans, setScans] = useState<Scan[]>([]),
    [selectedScan, setSelectedScan] = useState(scanId || ""),
    [funding, setFunding] = useState("basic"),
    [automatic, setAutomatic] = useState(true),
    [time, setTime] = useState(""),
    [pickupDate, setPickupDate] = useState(""),
    [segregated, setSegregated] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [booking, setBooking] = useState<Account["bookings"][number] | null>(null);
  const [bookingMotion, setBookingMotion] = useState(false);
  const [checkoutAvailable,setCheckoutAvailable]=useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [address,setAddress]=useState(""),[locality,setLocality]=useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    requestId = useRef("");
  const reduce = useReducedMotion();
  const day = (n: number) =>
    new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  useEffect(() => {
    let active = true;
    requestId.current = crypto.randomUUID();
    const next = nextPickupSlot();
    setTime(next.time);
    setPickupDate(next.date);
    Promise.all([serviceApi("service"), serviceApi("history")])
      .then(([d, h]) => {
        if (!active) return;
        setAccount(d.account);
        setCheckoutAvailable(d.checkoutAvailable===true);
        setAddress(d.account.profile.address);setLocality(d.account.profile.locality);
        const items = h.items.filter(
          (s: { confirmed?: boolean }) => s.confirmed,
        );
        setScans(items);
        setSelectedScan(scanId || initialScanId || items[0]?._id || "");
        setFunding(
          d.account.membership?.remainingPickups > 0
            ? "membership"
            : d.account.credits > 0
              ? "reward"
              : "basic",
        );
        if (scanId)
          setBooking(
            d.account.bookings.find(
              (b: Account["bookings"][number]) =>
                b.scanId === scanId && b.status !== "cancelled",
            ) || null,
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (scanId) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({
        behavior: reduce ? "instant" : "smooth",
        block: "start",
      });
    }
    return () => {
      active = false;
    };
  }, [scanId, initialScanId, reduce]);
  const plan = account?.membership;
  const planName = plan
    ? PLANS[plan.plan as keyof typeof PLANS]?.name || "Basic"
    : "Basic";
  const cap =
    funding === "membership" && plan
      ? Math.min(
          PLANS[plan.plan as keyof typeof PLANS].perPickupKg,
          plan.remainingKg,
        )
      : 2;
  const price = pickupPrice({
    source: funding,
    includedKg: cap,
    weightKg: null,
    segregated,
    time,
  });
  const previous = [...(account?.bookings || [])]
    .reverse()
    .find((b) => b.status !== "cancelled");
  function reusePrevious() {
    if (!previous) return;
    if (!scans.some((s) => s._id === previous.scanId)) {
      setError(
        "The previous scan was removed. Confirm your items again before booking.",
      );
      return;
    }
    setSelectedScan(previous.scanId);
    setSegregated(Boolean(previous.segregated));
    setAutomatic(false);
    setTime(validPickupTime(previous.window) ? previous.window : "09:00");
    setFunding(
      previous.source === "membership" && plan?.remainingPickups > 0
        ? "membership"
        : previous.source === "reward" && (account?.credits || 0) > 0
          ? "reward"
          : "basic",
    );
    setError("");
    notify(
      "Last pickup details loaded. Review the items and choose your new date.",
    );
  }
  const special =
    scans.find((s) => s._id === selectedScan)?.identification
      .special_handling !== "no";
  async function pay(id:string){
    const result=await openWasteCheckout("basic",id);
    const fresh=await serviceApi("service");setAccount(fresh.account);setBooking(fresh.account.bookings.find((b:Account["bookings"][number])=>b.id===id)||null);onBooked?.();
    notify(result.paid?(result.outcome==="review_needed"?"Payment received. Operations will review it.":"Payment confirmed. Your pickup is requested."):"Payment not completed. Your pickup is saved.");
  }
  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account || busy) return;
    if(!selectedScan){onScan?.();return;}
    if(special){if(onReview)onReview(selectedScan);else onRecords();return;}
    if(!price.valid){setAutomatic(false);setError("Choose a collection time within our service hours.");return;}
    const f = new FormData(e.currentTarget);
    const submittedTime = String(f.get("pickupTime") || time);
    if (submittedTime !== time) {
      setTime(submittedTime);
      setError("Review the price for your updated time, then confirm.");
      return;
    }
    const street=String(f.get("address")||"").trim(),area=String(f.get("locality")||"").trim();
    if(street.length<8||area.length<2){
      const field=form.current?.elements.namedItem(street.length<8?"address":"locality") as HTMLElement|null;
      const details=field?.closest("details");if(details)details.open=true;
      field?.focus();setError("Add your full street address and locality so your helper can find you.");return;
    }
    setBusy(true);
    setError("");
    try {
      const address = String(f.get("address")),
        locality = String(f.get("locality"));
      if (
        address !== account.profile.address ||
        locality !== account.profile.locality
      )
        await serviceApi("service", {
          action: "profile",
          address,
          locality,
          alias: account.profile.alias,
          leaderboard: account.profile.leaderboard,
        });
      const d = await serviceApi("service", {
        action: "book",
        requestId: requestId.current,
        source: funding,
        asap: automatic,
        quotedFeePaise: price.totalPaise,
        scanId: selectedScan,
        date: f.get("date"),
        window: time,
        segregated,
      });
      setBooking(d.result);
      setBookingMotion(true);
      if (d.account) setAccount(d.account);
      onBooked?.();
      if(d.result.status === "payment_due" && checkoutAvailable){await pay(d.result.id);return;}
      notify(
        ["scheduled", "assigned"].includes(d.result.status)
          ? "Pickup requested."
          : "Pickup saved. Payment is required to schedule it.",
      );
    } catch (e) {
      if((e as Error).message.includes("Pickup pricing changed")){
        const next=nextPickupSlot();setTime(next.time);setPickupDate(next.date);
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const money = (v: number) =>
    `₹${(v / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  return (
    <section className={`booking-composer ${flow.booking}`} aria-label="Schedule this scan">
      <div
        className={
          scanId ? "booking-heading" : "booking-heading screen-reader-only"
        }
      >
        <h2 ref={heading} tabIndex={-1}>
          Book a pickup
        </h2>
        <p>Choose when and where. We’ll handle the weighing.</p>
      </div>
      {booking ? (
        <div className="booking-complete">
          {bookingMotion ? <ActionMoment kind="pickup" /> : (
            <span className="completion-icon"><Check size={26} /></span>
          )}
          <h3>
            {(
              {
                scheduled: "Pickup requested",
                payment_due: "Pickup saved · payment pending",
                assigned: "A helper is assigned",
                receipt_pending: "Your receipt is ready",
                completed: "Collection completed",
                disputed: "Receipt under review",
                quote_requested: "Previous quote request",
                quote_ready: "Previous quote ready",
              } as Record<string, string>
            )[booking.status] || "Pickup details"}
          </h3>
          <p>
            {new Date(booking.date + "T12:00:00+05:30").toLocaleDateString(
              "en-IN",
              { day: "numeric", month: "long", timeZone: "Asia/Kolkata" },
            )}{" "}
            · {booking.asap ? "Next available helper · arrival estimate pending live location" : pickupTimeLabel(booking.window)} · Weight checked at collection
          </p>
          <p>
            {booking.source === "membership"
              ? "Plan allowance"
              : booking.source === "reward"
                ? "Reward credit"
                : "Basic pickup"}{" "}
            · {money(booking.feePaise || 0)} collection fee
          </p>
          {booking.status === "payment_due" ? (
            <p>
              {checkoutAvailable?"Complete payment to request collection.":"Your pickup is saved. Payments are currently unavailable; it has not been scheduled."}
            </p>
          ) : (
            <p>Track your pickup and collection receipt in one place.</p>
          )}
          {booking.status==="payment_due" && checkoutAvailable ? <button className="primary" type="button" disabled={busy} onClick={()=>{setBusy(true);void pay(booking.id).catch(e=>setError(e.message)).finally(()=>setBusy(false))}}>{busy?"Opening payment…":`Pay ${money(booking.feePaise||0)}`} <ArrowRight size={16}/></button> : <button className="primary" type="button" onClick={onRecords}>View pickup <ArrowRight size={16}/></button>}
          {!scanId && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setBooking(null);
                setBookingMotion(false);
                requestId.current = crypto.randomUUID();
              }}
            >
              Book another pickup
            </button>
          )}
        </div>
      ) : account && !scans.length ? (
        <div className={flow.empty}><h3>Start with a quick scan.</h3><p>Show us your waste, confirm the items, then choose a pickup.</p><button type="button" className="primary" onClick={onScan}>Scan waste <ArrowRight size={17}/></button></div>
      ) : account ? (
        <form ref={form} className="booking-workspace" onSubmit={book} noValidate aria-busy={busy}>
          <fieldset disabled={busy} style={{display:"contents",border:0,padding:0,margin:0}}>

          <div className="booking-fields">
            <div className="booking-section">
              <div className="collection-section-heading">
                <h3>Your items</h3>
                {!scanId && previous && (
                  <button
                    type="button"
                    className="reuse-pickup-button"
                    onClick={reusePrevious}
                    title="Reuse your regular items, packing and time"
                  >
                    <Repeat2 size={15} />
                    <span>Use last pickup</span>
                  </button>
                )}
              </div>
              {scanId ? (
                <p className="attached-item">
                  <Check size={16} />
                  {scans.find((s) => s._id === selectedScan)?.identification
                    .object_name || "Your confirmed items"}
                </p>
              ) : (
                <>
                  <Dropdown
                    label="Choose a confirmed scan"
                    value={selectedScan}
                    onChange={setSelectedScan}
                    options={scans.map((s) => ({
                      value: s._id,
                      label: s.identification.object_name,
                    }))}
                  />
                  {!scans.length && (
                    <p>
                      Scan and confirm your items first.{" "}
                      <button
                        className="text-button"
                        type="button"
                        onClick={onScan}
                      >
                        Start a scan <ArrowRight size={14} />
                      </button>
                    </p>
                  )}
                </>
              )}
              {funding === "membership" ? <p className="weight-note">We segregate your waste. Sorting is included in your {planName} plan.</p> : <>
              <div className="packing-choice">
                <div className="field">
                  <span>Is your waste separated?</span>
                  <div
                    className="choice-tabs"
                    role="radiogroup"
                    aria-label="Waste separation"
                  >
                    {[
                      { value: true, label: "Separated" },
                      { value: false, label: "Mixed together" },
                    ].map((o) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={segregated === o.value}
                        key={o.label}
                        onClick={() => setSegregated(o.value)}
                      >
                        {segregated === o.value && (
                          <motion.span
                            layoutId={`sorting-${scanId || "booking"}`}
                            className="choice-highlight"
                            transition={{ duration: reduce ? 0 : 0.2 }}
                          />
                        )}
                        <span>{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <small>
                {segregated
                  ? "Keep food waste and dry materials in separate bags."
                  : "Mixed waste is sorted at our hub for ₹5/kg after weighing."}
              </small></>}
              <p className="weight-note">
                {cap} kg included. Your helper weighs it; extra weight costs ₹3/kg.
              </p>
            </div>
            <div className="booking-section">
              <h3>Pickup time</h3>
              <div className="choice-tabs" role="group" aria-label="Pickup timing">
                <button type="button" aria-pressed={automatic} onClick={()=>{const next=nextPickupSlot();setTime(next.time);setPickupDate(next.date);setAutomatic(true)}}>Next available</button>
                <button type="button" aria-pressed={!automatic} onClick={()=>setAutomatic(false)}>Choose a time</button>
              </div>
              {automatic ? <><input type="hidden" name="date" value={pickupDate}/><input type="hidden" name="pickupTime" value={time}/><p>{new Date(pickupDate+"T12:00:00+05:30").toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"})} · {pickupTimeLabel(time)} IST. Your helper confirms arrival.</p></> : <div className="service-columns">
                <label className="field">
                  Collection date
                  <input
                    name="date"
                    type="date"
                    required
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={day(0)}
                    max={day(30)}
                  />
                </label>
                <PickupTimeInput
                  value={time}
                  onChange={setTime}
                  weightKg={0}
                  segregated={segregated || funding === "membership"}
                />
              </div>}
            </div>
            <details
              className="booking-section address-disclosure"
              open={account.profile.address ? undefined : true}
            >
              <summary>
                <MapPin size={18} />
                <span>
                  {address || "Where should we collect?"}
                  <small>
                    {locality ||
                      "Use your location or enter an address"}
                  </small>
                </span>
                <span className="address-edit">Edit address</span>
              </summary>
              <LocationPicker />
              <label className="field">
                Street address
                <textarea
                  name="address"
                  required
                  minLength={8}
                  maxLength={500}
                  rows={2}
                  value={address}
                  onChange={e=>{setAddress(e.target.value);setError("")}}
                  autoComplete="street-address"
                />
              </label>
              <label className="field">
                Locality / campus
                <input
                  name="locality"
                  required
                  minLength={2}
                  maxLength={100}
                  value={locality}
                  onChange={e=>{setLocality(e.target.value);setError("")}}
                  autoComplete="address-level2"
                />
              </label>
            </details>
          </div>
          <aside className="booking-price">
            <div className="plan-at-booking">
              <span>Your plan</span>
              <strong>
                {planName}
              </strong>
              <p>
                {plan
                  ? `${plan.remainingPickups} pickups · ${plan.remainingKg} kg left`
                  : `₹${PLANS.basic.price} per pickup · Up to ${PLANS.basic.perPickupKg} kg`}
              </p>

            </div>
            {(account.credits>0 || plan?.remainingPickups>0) && <details className={flow.details}><summary>{funding==="membership"?"Using your plan":funding==="reward"?"Using a free pickup":"Pay per pickup"} · Change</summary>
            <div className="field">
              <label>Payment option</label>
              <Dropdown
                label="Quick pickup funding"
                value={funding}
                onChange={setFunding}
                options={[
                  { value: "basic", label: "Pay per pickup" },
                  ...(account.credits > 0
                    ? [
                        {
                          value: "reward",
                          label: `Reward credit · ${account.credits} left`,
                        },
                      ]
                    : []),
                  ...(plan?.remainingPickups > 0
                    ? [
                        {
                          value: "membership",
                          label: `${planName} · Plan pickup`,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            </details>}
            <div className="automatic-price" aria-live="polite">
              <h3>Pickup summary</h3>
              <dl>
                <div>
                  <dt>
                    {funding === "membership"
                      ? "Included in your plan"
                      : funding === "reward"
                        ? "Using a reward credit"
                        : "Pickup"}
                  </dt>
                  <dd>{money(price.collectionPaise)}</dd>
                </div>
                <div>
                  <dt>Sorting{!price.sortingIncluded && !segregated && " · ₹5/kg"}</dt>
                  <dd>
                    {price.sortingIncluded ? "Included" : price.sortingPending
                      ? "After weighing"
                      : money(price.sortingPaise)}
                  </dd>
                </div>
                {price.surgePaise > 0 && (
                  <div>
                    <dt>Evening surcharge</dt>
                    <dd>{money(price.surgePaise)}</dd>
                  </div>
                )}
              </dl>
              <div className="price-total">
                <span>Due before pickup</span>
                <strong>{price.valid ? money(price.totalPaise) : "—"}</strong>
              </div>
              <small>
                {price.valid
                  ? price.sortingPending
                    ? "You approve any weight-based charges after collection."
                    : price.sortingIncluded ? "Sorting is included. Extra weight is ₹3/kg after your approval." : "Extra weight is ₹3/kg after your approval."
                  : "Choose an available pickup time."}
              </small>
            </div>
            {special && selectedScan && (
              <p role="status" className={flow.notice}>
                This scan is marked as needing special or uncertain handling. In Review item details, choose Ordinary only for everyday household waste. For batteries, electronics or hazardous items, keep Special and contact Help.
              </p>
            )}
            <button
              className="primary booking-submit"
              aria-label={!selectedScan?"Scan waste":special?"Review item details":!price.valid?"Choose pickup time":"Request this pickup"}
              disabled={busy}
              aria-describedby={error?"booking-error":undefined}
            >
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <CalendarDays size={18} />
              )}{" "}
              {busy
                ? "Saving…"
                : !selectedScan ? "Scan waste" : special ? "Review item details" : !price.valid
                  ? "Choose a time"
                  : price.totalPaise > 0
                    ? checkoutAvailable ? `Continue to payment · ${money(price.totalPaise)}` : `Save pickup · ${money(price.totalPaise)}`
                    : "Book included pickup"}
            </button>
            <small>
              A helper accepts your request before collection.
            </small>
          </aside>
          </fieldset>
        </form>
      ) : !error ? (
        <p>Loading your pickup options…</p>
      ) : null}
      {error && (
        <p role="alert" className={flow.error} id="booking-error">
          {error}
        </p>
      )}
    </section>
  );
}
