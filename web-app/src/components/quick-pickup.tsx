"use client";
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
import { pickupTimeLabel, validPickupTime } from "@/lib/pickup-time";
import { pickupPrice } from "@/lib/pickup-pricing";
import { serviceApi } from "@/lib/client-api";
import { PLANS } from "@/lib/catalog";
import type { Account } from "@/lib/service";
import PickupTimeInput from "./pickup-time-input";
import WorkflowArt from "./workflow-art";
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
}: {
  scanId?: string;
  initialScanId?: string;
  onRecords: () => void;
  notify: (text: string) => void;
  onPlans?: () => void;
  onScan?: () => void;
  onBooked?: () => void;
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
    const next = new Date(Date.now() + 15 * 60000);
    setTime(next.toLocaleTimeString("en-GB", {timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"}));
    setPickupDate(next.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}));
    Promise.all([serviceApi("service"), serviceApi("history")])
      .then(([d, h]) => {
        if (!active) return;
        setAccount(d.account);
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
  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    const f = new FormData(e.currentTarget);
    const submittedTime = String(f.get("pickupTime") || time);
    if (submittedTime !== time) {
      setTime(submittedTime);
      setError("Review the price for your updated time, then confirm.");
      return;
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
        scanId: selectedScan,
        date: f.get("date"),
        window: time,
        segregated,
      });
      setBooking(d.result);
      setBookingMotion(true);
      if (d.account) setAccount(d.account);
      onBooked?.();
      notify(
        d.result.status === "scheduled"
          ? "Pickup requested."
          : "Pickup saved. Payment is required to schedule it.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const money = (v: number) =>
    `₹${(v / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  return (
    <section className="booking-composer" aria-label="Schedule this scan">
      <div
        className={
          scanId ? "booking-heading" : "booking-heading screen-reader-only"
        }
      >
        <h2 ref={heading} tabIndex={-1}>
          Schedule this pickup
        </h2>
        <p>Your items, your time. See the full price before you book.</p>
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
              Your pickup is saved. Continue to your pickup record to pay and
              schedule the collection.
            </p>
          ) : (
            <p>Track your pickup and collection receipt in one place.</p>
          )}
          <button className="primary" type="button" onClick={onRecords}>
            View in My history <ArrowRight size={16} />
          </button>
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
      ) : account ? (
        <form className="booking-workspace" onSubmit={book}>
          <div className="booking-fields">
            <div className="booking-section">
              <div className="collection-section-heading">
                <h3>What are we collecting?</h3>
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
                  <span>How is it packed?</span>
                  <div
                    className="choice-tabs"
                    role="radiogroup"
                    aria-label="Waste separation"
                  >
                    {[
                      { value: true, label: "Separated" },
                      { value: false, label: "Unsegregated" },
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
                  : "Your helper weighs it. Sorting is ₹5/kg, billed after you approve the receipt."}
              </small></>}
              <p className="weight-note">
                No weighing needed at home. Your helper records the weight at
                collection. This pickup includes {cap} kg; extra weight costs ₹3/kg after weighing.
              </p>
            </div>
            <div className="booking-section">
              <h3>When should we come?</h3>
              <div className="choice-tabs" role="group" aria-label="Pickup timing">
                <button type="button" aria-pressed={automatic} onClick={()=>setAutomatic(true)}>Next available helper</button>
                <button type="button" aria-pressed={!automatic} onClick={()=>setAutomatic(false)}>Choose a time</button>
              </div>
              {automatic ? <><input type="hidden" name="date" value={pickupDate}/><input type="hidden" name="pickupTime" value={time}/><p>Arrival estimate pending assignment. Your helper’s live location will provide an approximate arrival range. Available 24 hours for the hackathon, with no surge.</p></> : <div className="service-columns">
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
                <p className="muted">Your helper’s live location will provide an arrival estimate after assignment. You can choose your preferred time below.</p>
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
                  {account.profile.address || "Add your collection address"}
                  <small>
                    {account.profile.locality ||
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
                  defaultValue={account.profile.address}
                />
              </label>
              <label className="field">
                Locality / campus
                <input
                  name="locality"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={account.profile.locality}
                />
              </label>
            </details>
          </div>
          <aside className="booking-price">
            <WorkflowArt scene="pickup" className="booking-art" />
            <div className="plan-at-booking">
              <span>Your plan</span>
              <strong>
                {planName}
                {!plan && " · Pay as you go"}
              </strong>
              <p>
                {plan
                  ? `${plan.remainingPickups} pickups · ${plan.remainingKg} kg left`
                  : `₹${PLANS.basic.price} per pickup · Up to ${PLANS.basic.perPickupKg} kg`}
              </p>
              <button type="button" className="text-button" onClick={onPlans}>
                {plan ? "View plan" : "Explore Gold & Platinum"}
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="field">
              <label>Use for this pickup</label>
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
            <div className="automatic-price" aria-live="polite">
              <h3>Your price</h3>
              <p>Extra weight above the included allowance: ₹3/kg, measured by your helper.</p>
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
                    ? "Sorting is added at ₹5/kg after the helper weighs your waste and you approve the receipt."
                    : price.sortingIncluded ? "Segregation is included. Your helper confirms the weight at collection." : "Your helper confirms the weight at collection."
                  : "Choose an available pickup time."}
              </small>
            </div>
            {special && selectedScan && (
              <p role="status">
                This scan needs a special-handling check. Review the item or
                open Help before booking.
              </p>
            )}
            <button
              className="primary booking-submit"
              aria-label="Request this pickup"
              disabled={busy || !selectedScan || !price.valid || special}
            >
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <CalendarDays size={18} />
              )}{" "}
              {busy
                ? "Saving…"
                : !price.valid
                  ? "Choose a pickup time"
                  : price.totalPaise > 0
                    ? `Confirm pickup · ${money(price.totalPaise)}`
                    : "Confirm included pickup"}
            </button>
            <small>
              Subject to helper availability. Payment is required for any amount
              due.
            </small>
          </aside>
        </form>
      ) : !error ? (
        <p>Loading your pickup options…</p>
      ) : null}
      {error && (
        <p role="alert" className="service-notice">
          {error}
        </p>
      )}
    </section>
  );
}
