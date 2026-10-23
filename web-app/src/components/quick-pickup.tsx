"use client";
import ActionMoment from "./action-moment";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, Loader2, MapPin } from "lucide-react";
import { pickupTimeLabel } from "@/lib/pickup-time";
import PickupTimeInput from "./pickup-time-input";
import Dropdown from "./dropdown";
import LocationPicker from "./location-picker";
import { serviceApi } from "./service-hub";
import { PLANS } from "@/lib/catalog";
import type { Account } from "@/lib/service";
export default function QuickPickup({
  scanId,
  onRecords,
  notify,
}: {
  scanId: string;
  onRecords: () => void;
  notify: (text: string) => void;
}) {
  const [estimatedWeight, setEstimatedWeight] = useState(0),
    [segregated, setSegregated] = useState(false);
  const [account, setAccount] = useState<Account | null>(null),
    [funding, setFunding] = useState("basic"),
    [window, setWindow] = useState("09:00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [booking, setBooking] = useState<Account["bookings"][number] | null>(null);
  const [bookingMotion, setBookingMotion] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    requestId = useRef("");
  const day = (offset: number) =>
    new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  useEffect(() => {
    let active = true;
    requestId.current = crypto.randomUUID();
    serviceApi("service")
      .then((d) => {
        if (!active) return;
        setAccount(d.account);
        setFunding(
          d.account.membership?.remainingPickups > 0
            ? "membership"
            : d.account.credits > 0
              ? "reward"
              : "basic",
        );
        const existing = d.account.bookings.find(
          (b: Account["bookings"][number]) =>
            b.scanId === scanId && b.status !== "cancelled",
        );
        if (existing) setBooking(existing);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    return () => {
      active = false;
    };
  }, [scanId]);
  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    const f = new FormData(e.currentTarget);
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
      const response = await serviceApi("service", {
        action: "book",
        requestId: requestId.current,
        source: funding,
        scanId,
        weightKg: Number(f.get("weightKg")),
        date: f.get("date"),
        window,
        segregated: f.get("segregated") === "on",
      });
      setBooking(response.result);
      setBookingMotion(true);
      notify(
        response.result.status === "scheduled"
          ? "Pickup requested for your chosen time."
          : response.result.status === "quote_requested"
            ? "Collection quote requested."
            : "Pickup saved. Payment is required before scheduling.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cap =
    funding === "membership" && account?.membership
      ? PLANS[account.membership.plan as keyof typeof PLANS].perPickupKg
      : 2;
  return (
    <section className="quick-pickup" aria-label="Schedule this scan">
      <span className="micro">NEXT · COLLECTION</span>
      <h2 ref={heading} tabIndex={-1}>
        Schedule this pickup
      </h2>
      {booking ? (
        <div className="quick-booking-result">
          {bookingMotion ? <ActionMoment kind="pickup" /> : <Check size={24} />}
          <h3>
            {booking.status === "scheduled"
              ? "Pickup requested"
              : booking.status === "quote_requested"
                ? "Quote requested"
                : booking.status === "payment_due"
                  ? "Saved · payment required"
                  : "Your collection record"}
          </h3>
          <p>
            {booking.date} · {pickupTimeLabel(booking.window)} ·{" "}
            {booking.estimatedKg} kg
          </p>
          {booking.surgeFeePaise > 0 && (
            <p>
              Evening surcharge: ₹{booking.surgeFeePaise / 100} · Total payable:
              ₹{booking.feePaise / 100}
            </p>
          )}
          <p>
            {booking.status === "payment_due"
              ? "Checkout is currently unavailable. This pickup will be scheduled only after verified payment."
              : booking.status === "quote_requested"
                ? "Operations will review the sorting or special-handling requirements and provide a quote."
                : "Collection is subject to helper availability. You can review its status under Pickups."}
          </p>
          <button type="button" className="secondary" onClick={onRecords}>
            View pickup <ArrowRight size={16} />
          </button>
        </div>
      ) : account ? (
        <form onSubmit={book}>
          <p>
            Your confirmed scan is already attached. Choose the handover details
            below.
          </p>
          <details open={!account.profile.address} className="quick-address">
            <summary>
              <MapPin size={16} />
              {account.profile.address
                ? `${account.profile.address} · ${account.profile.locality} · Edit`
                : "Add collection address"}
            </summary>
            <LocationPicker />
            <label className="field">
              Street address
              <textarea
                name="address"
                required
                minLength={8}
                maxLength={500}
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
          <div className="service-columns">
            <label className="field">
              Collection date
              <input
                name="date"
                type="date"
                required
                defaultValue={day(1)}
                min={day(1)}
                max={day(30)}
              />
            </label>
            <PickupTimeInput
              value={window}
              onChange={setWindow}
              weightKg={estimatedWeight}
              segregated={segregated}
            />
          </div>
          <div className="service-columns">
            <div className="field">
              <label>Pay with</label>
              <Dropdown
                label="Quick pickup funding"
                value={funding}
                onChange={setFunding}
                options={[
                  { value: "basic", label: "Basic · ₹20" },
                  ...(account.credits > 0
                    ? [
                        {
                          value: "reward",
                          label: `Free pickup credit · ${account.credits} available`,
                        },
                      ]
                    : []),
                  ...(account.membership &&
                  account.membership.remainingPickups > 0
                    ? [
                        {
                          value: "membership",
                          label: `${account.membership.plan} allowance`,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            <label className="field">
              Estimated weight (kg)
              <input
                name="weightKg"
                onChange={(e) => setEstimatedWeight(Number(e.target.value))}
                type="number"
                inputMode="decimal"
                min="0.1"
                max={cap}
                step="0.1"
                placeholder={`Up to ${cap} kg`}
                required
              />
            </label>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              name="segregated"
              onChange={(e) => setSegregated(e.target.checked)}
            />
            I have separated the materials for collection
          </label>
          <small>
            Unsegregated or special-handling waste requires a quote. Basic
            pickups need payment before scheduling; checkout is currently
            unconfigured.
          </small>
          <button className="primary" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <CalendarDays size={17} />
            )}{" "}
            {busy ? "Saving…" : "Request this pickup"}
          </button>
        </form>
      ) : !error ? (
        <p>Loading your address and pickup options…</p>
      ) : null}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
