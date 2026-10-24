"use client";
import HelperCollections from "./helper-collections";
import HelperInsights from "./helper-insights";
import helperStyles from "./helper-insights.module.css";
import { helperCompensation } from "@/lib/helper-pay";
import ActionMoment from "./action-moment";
import { pickupTimeLabel } from "@/lib/pickup-time";
import LocationPicker from "./location-picker";
import { useCallback, useEffect, useState } from "react";
import {
  Truck,
  Wallet,
  MapPin,
  Check,
  Scale,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { serviceApi } from "./service-hub";
const copy = {
  en: {
    title: "Your work. Clearly recorded.",
    intro:
      "Collection jobs, measured handovers and payment records in one place.",
    language: "हिन्दी",
    refresh: "Refresh jobs",
    signin: "Sign in to your helper account",
    pending: "Helper access needs approval",
    pendingText:
      "Request access below. Operations will approve your account before you can collect.",
    apply: "Request helper access",
    jobs: "Available and assigned jobs",
    empty: "No collection jobs available yet.",
    claim: "Accept this collection",
    assigned: "Assigned",
    scheduled: "Available",
    receipt_pending: "Waiting for resident",
    completed: "Completed",
    disputed: "Under review",
    cancelled: "Cancelled",
    gross: "Gross weight (kg)",
    tare: "Container weight (kg)",
    material: "Verified material",
    notes: "Collection notes",
    send: "Send receipt to resident",
    net: "Net weight",
    pay: "Recorded work payments",
    payNote:
      "Actual payments recorded by Operations. This is not a live bank balance.",
    done: "Completed handovers",
    waiting: "Receipts awaiting approval",
    address: "Collection address",
    locality: "Locality",
    estimated: "Estimated weight",
    workPay: "Work payment recorded",
    noPay: "Work payment not recorded yet",
    reference: "Payment reference",
    requestSent: "Access requested. Please wait for Operations approval.",
    saved: "Updated.",
    role: "Approved collection partner",
    receipts:
      "Measured handovers stay pending until the resident accepts them.",
    grossHint: "Enter the scale reading including the container.",
    tareHint:
      "Enter the empty container weight. The server calculates net weight.",
    kg: "kg",
    materials: {
      plastic: "Plastic",
      paper: "Paper",
      cardboard: "Cardboard",
      glass: "Glass",
      metal: "Metal",
      food_waste: "Food waste",
      garden_waste: "Garden waste",
      textile: "Textile",
      composite_or_other: "Mixed / other",
      unknown: "Unknown",
    },
  },
  hi: {
    title: "आपका काम। पूरा हिसाब।",
    intro: "कचरा संग्रह, तौल की रसीद और भुगतान का रिकॉर्ड एक जगह।",
    language: "English",
    refresh: "काम फिर देखें",
    signin: "अपने सहायक खाते में साइन इन करें",
    pending: "सहायक की अनुमति चाहिए",
    pendingText:
      "नीचे आवेदन करें। काम शुरू करने से पहले संचालन टीम आपके खाते को अनुमति देगी।",
    apply: "सहायक बनने का आवेदन",
    jobs: "उपलब्ध और आपके संग्रह कार्य",
    empty: "अभी कोई संग्रह कार्य उपलब्ध नहीं है।",
    claim: "यह संग्रह कार्य स्वीकार करें",
    assigned: "आपको सौंपा गया",
    scheduled: "उपलब्ध",
    receipt_pending: "ग्राहक की मंज़ूरी बाकी",
    completed: "पूरा हुआ",
    disputed: "समीक्षा जारी",
    cancelled: "रद्द",
    gross: "कुल वजन (किलो)",
    tare: "खाली डिब्बे का वजन (किलो)",
    material: "जाँची गई सामग्री",
    notes: "संग्रह के बारे में जानकारी",
    send: "रसीद ग्राहक को भेजें",
    net: "कचरे का शुद्ध वजन",
    pay: "दर्ज किए गए काम के भुगतान",
    payNote:
      "संचालन टीम ने ये भुगतान दर्ज किए हैं। यह बैंक का लाइव बैलेंस नहीं है।",
    done: "पूरे किए गए संग्रह",
    waiting: "मंज़ूरी के लिए बाकी रसीदें",
    address: "संग्रह का पता",
    locality: "इलाका",
    estimated: "अनुमानित वजन",
    workPay: "काम का भुगतान दर्ज है",
    noPay: "काम का भुगतान अभी दर्ज नहीं है",
    reference: "भुगतान का संदर्भ",
    requestSent:
      "आवेदन भेज दिया गया है। संचालन टीम की मंज़ूरी का इंतज़ार करें।",
    saved: "जानकारी सहेज दी गई।",
    role: "अनुमति प्राप्त संग्रह सहायक",
    receipts: "ग्राहक की मंज़ूरी तक तौल की रसीद लंबित रहती है।",
    grossHint: "डिब्बे समेत तराज़ू पर दिख रहा वजन लिखें।",
    tareHint: "खाली डिब्बे का वजन लिखें। सिस्टम शुद्ध वजन निकालेगा।",
    kg: "किलो",
    materials: {
      plastic: "प्लास्टिक",
      paper: "कागज़",
      cardboard: "गत्ता",
      glass: "काँच",
      metal: "धातु",
      food_waste: "खाने का कचरा",
      garden_waste: "बगीचे का कचरा",
      textile: "कपड़ा",
      composite_or_other: "मिश्रित / अन्य",
      unknown: "पता नहीं",
    },
  },
};
type Job = {
  id: string;
  residentId: string;
  item: string;
  material: string;
  status: string;
  locality: string;
  date: string;
  window: string;
  address?: string;
  location?: { latitude: number; longitude: number };
  estimatedKg: number;
  collectorId?: string;
  receipt?: { netKg: number; material: string; notes: string; sortingIncluded?: boolean; sortingReferencePaise?: number; sortingFeePaise?: number };
  settlement?: { netPaise?: number };
  workPayments?: { amountPaise:number;at?:string }[];
  workPay?: { amountPaise: number; reference: string; at?: string };
};
export default function HelperDashboard({
  signedIn,
  view = "Helper dashboard",
  onSignIn,
  notify,
}: {
  signedIn: boolean;
  view?: string;
  onSignIn: () => void;
  notify: (s: string) => void;
}) {
  const [lang, setLang] = useState<"en" | "hi">("en"),
    [jobs, setJobs] = useState<Job[]>([]),
    [approved, setApproved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [profile, setProfile] = useState({
    address: "",
    locality: "",
    alias: "",
    leaderboard: false,
  });
  const [receiptMoment, setReceiptMoment] = useState<{ id: string; revision: number } | null>(null);
  const t = copy[lang];
  useEffect(() => {
    if (localStorage.getItem("waste-right-helper-language") === "hi")
      setLang("hi");
  }, []);
  const refresh = useCallback(async () => {
    if (!signedIn) return;
    serviceApi("service")
      .then((d) => setProfile(d.account.profile))
      .catch(() => {});
    try {
      const result = await serviceApi("operations");
      setJobs(result.jobs);
      setApproved(true);
      setError("");
    } catch (e) {
      const message=e instanceof Error?e.message:"";
      if (/approved collector|access required|sign in/i.test(message)) setApproved(false);
      else setError("Could not refresh collections. Your last loaded records are still shown. Try again.");
    }
  }, [signedIn]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function act(data: { action: string; [key: string]: unknown }) {
    setBusy(true);
    setError("");
    try {
      await serviceApi("operations", data);
      if (data.action === "weigh") setReceiptMoment((previous) => ({ id: String(data.id), revision: (previous?.revision || 0) + 1 }));
      await refresh();
      notify(t.saved);
    } catch {
      setError(
        lang === "hi"
          ? "जानकारी सहेजी नहीं जा सकी। वजन, अनुमति और कार्य की स्थिति जाँचें।"
          : "Unable to save. Check weight, assignment and current job status.",
      );
    } finally {
      setBusy(false);
    }
  }
  const material = (v: string) =>
    t.materials[v as keyof typeof t.materials] || v;
  return (
    <section lang={lang} className={`helper-dashboard ${helperStyles.dashboard}`}>
      <div className="page-heading heading-actions">
        <div>
          <span className="micro">
            {lang === "hi" ? "संग्रह सहायक" : "COLLECTION PARTNER"}
          </span>
          <h1>
            {view === "Service area"
              ? lang === "hi"
                ? "आपका सेवा क्षेत्र"
                : "Your collection area"
              : view === "Helper earnings"
                ? lang === "hi"
                  ? "आपकी कमाई का रिकॉर्ड"
                  : "Your earnings ledger"
                : view === "Helper collections" ? (lang === "hi" ? "आपके संग्रह।" : "Your collections.") : t.title}
          </h1>
          <p>{t.intro}</p>
          <p>{lang === "hi" ? "बेसिक संग्रह: सभी सामग्रियों के लिए 2 किलो तक।" : "Basic pickups: up to 2 kg for all materials, verified at weighing."}</p>
        </div>
        <div className="inline-actions">
          <button
            className="secondary"
            onClick={() => {
              const next = lang === "en" ? "hi" : "en";
              setLang(next);
              localStorage.setItem("waste-right-helper-language", next);
            }}
          >
            {t.language}
          </button>
          <button className="secondary" onClick={() => void refresh()}>
            <RotateCcw size={16} />
            {t.refresh}
          </button>
        </div>
      </div>
      {signedIn && view === "Service area" ? (
        <section className="service-block helper-area">
          <h2>
            {lang === "hi"
              ? "स्थान और सेवा क्षेत्र"
              : "Location and service area"}
          </h2>
          <LocationPicker lang={lang} />
          <form
            key={profile.locality + profile.address}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await serviceApi("service", {
                  action: "profile",
                  address: f.get("address"),
                  locality: f.get("locality"),
                  alias: profile.alias,
                  leaderboard: false,
                });
                notify(t.saved);
                await refresh();
              } catch {
                setError(
                  lang === "hi"
                    ? "क्षेत्र सहेजा नहीं गया।"
                    : "Could not save your service area.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              {lang === "hi" ? "आधार पता" : "Base address"}
              <textarea
                name="address"
                required
                minLength={8}
                maxLength={500}
                defaultValue={profile.address}
              />
            </label>
            <label className="field">
              {t.locality}
              <input
                name="locality"
                required
                minLength={2}
                maxLength={100}
                defaultValue={profile.locality}
              />
            </label>
            <button className="primary" disabled={busy}>
              {lang === "hi" ? "सेवा क्षेत्र सहेजें" : "Save service area"}
            </button>
          </form>
          <p>
            {lang === "hi"
              ? "यह आपका आधार स्थान है। यह लाइव ट्रैकिंग नहीं है। उपलब्ध काम में संग्रह का इलाका अलग से दिखता है।"
              : "This is your collection base, not live tracking. Each available job shows its collection locality."}
          </p>
        </section>
      ) : !signedIn ? (
        <div className="empty spacious">
          <Truck size={42} />
          <button className="primary" onClick={onSignIn}>
            {t.signin}
          </button>
        </div>
      ) : !approved ? (
        <section className="service-block">
          <ShieldCheck size={35} />
          <h2>{t.pending}</h2>
          <p>{t.pendingText}</p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await serviceApi("helper", { action: "apply" });
                notify(t.requestSent);
              } catch {
                setError(
                  lang === "hi"
                    ? "आवेदन भेजा नहीं जा सका। फिर कोशिश करें।"
                    : "Could not submit the request. Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {t.apply}
          </button>
        </section>
      ) : (
        <>
          {view !== "Helper collections" && <>
          <HelperInsights jobs={jobs} hindi={lang === "hi"} />
          <div className="helper-metrics">
            <div>
              <Wallet size={25} />
              <p>{t.pay}</p>
              <strong>
                {new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(
                  jobs.reduce(
                    (sum, b) => sum + (b.workPay?.amountPaise || 0),
                    0,
                  ) / 100,
                )}
              </strong>
              <small>{t.payNote}</small>
            </div>
            <div>
              <Check size={25} />
              <p>{t.done}</p>
              <strong>
                {jobs.filter((b) => b.status === "completed").length}
              </strong>
              <small>{t.role}</small>
            </div>
            <div>
              <Scale size={25} />
              <p>{t.waiting}</p>
              <strong>
                {jobs.filter((b) => b.status === "receipt_pending").length}
              </strong>
              <small>{t.receipts}</small>
            </div>
          </div>
          </>}
          {view === "Helper collections" && <HelperCollections jobs={jobs} hindi={lang === "hi"}>{(b) => (
            <article className="booking-entry helper-job" key={b.id}>
              {b.status === "completed" && <p>{lang === "hi" ? "अर्जित" : "Earned"}: ₹{(helperCompensation(b).earnedPaise / 100).toFixed(2)} · {lang === "hi" ? "बाकी" : "Outstanding"}: ₹{(helperCompensation(b).duePaise / 100).toFixed(2)}</p>}
              <div className="section-heading">
                <h2>{material(b.material)}</h2>
                <span className="status">
                  {t[b.status as "assigned"] || b.status}
                </span>
              </div>
              <p>
                <MapPin size={15} /> {t.locality}: {b.locality}
              </p>
              <p>
                {new Date(b.date + "T12:00:00").toLocaleDateString(
                  lang === "hi" ? "hi-IN" : "en-IN",
                  { weekday: "long", day: "numeric", month: "long" },
                )}{" "}
                · {pickupTimeLabel(b.window)}
              </p>
              {b.address && (
                <p>
                  {t.address}: {b.address}
                </p>
              )}
              {b.location && (
                <a
                  className="text-button"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.openstreetmap.org/?mlat=${b.location.latitude}&mlon=${b.location.longitude}#map=17/${b.location.latitude}/${b.location.longitude}`}
                >
                  {lang === "hi"
                    ? "संग्रह का स्थान देखें"
                    : "View collection location"}
                </a>
              )}
              <p>
                {t.estimated}: {b.estimatedKg} {t.kg}
              </p>
              {view === "Helper collections" && b.status === "scheduled" && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    act({ action: "claim", residentId: b.residentId, id: b.id })
                  }
                >
                  <Truck size={18} />
                  {t.claim}
                </button>
              )}
              {view === "Helper collections" && b.status === "assigned" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void act({
                      action: "weigh",
                      residentId: b.residentId,
                      id: b.id,
                      grossKg: Number(f.get("gross")),
                      tareKg: Number(f.get("tare")),
                      material: f.get("material"),
                      notes: f.get("notes"),
                    });
                  }}
                >
                  <div className="service-columns">
                    <label className="field">
                      {t.gross}
                      <input
                        name="gross"
                        type="number"
                        inputMode="decimal"
                        min=".001"
                        max="100"
                        step=".001"
                        required
                      />
                      <small>{t.grossHint}</small>
                    </label>
                    <label className="field">
                      {t.tare}
                      <input
                        name="tare"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step=".001"
                        required
                      />
                      <small>{t.tareHint}</small>
                    </label>
                  </div>
                  <label className="field">
                    {t.material}
                    <input
                      name="material"
                      defaultValue={b.material}
                      required
                      maxLength={80}
                    />
                  </label>
                  <label className="field">
                    {t.notes}
                    <textarea name="notes" maxLength={500} rows={2} />
                  </label>
                  <button className="primary" disabled={busy}>
                    <Scale size={18} />
                    {t.send}
                  </button>
                </form>
              )}
              {receiptMoment?.id === b.id && <ActionMoment key={receiptMoment.revision} kind="receipt" label={lang === "hi" ? "रसीद भेज दी गई। ग्राहक की मंज़ूरी बाकी है।" : "Receipt sent. Waiting for resident approval."} />}
              {b.receipt && (
                <div className="receipt">
                  <h3>
                    {t.net}: {b.receipt.netKg} {t.kg}
                  </h3>
                  <p>{material(b.receipt.material)}</p>
                  <p>{b.receipt.notes}</p>
                </div>
              )}
              <p>
                {b.workPay
                  ? `${t.workPay}: ₹${(b.workPay.amountPaise / 100).toFixed(2)} · ${t.reference}: ${b.workPay.reference}`
                  : t.noPay}
              </p>
            </article>
          )}</HelperCollections>}
        </>
      )}
      {error && (
        <p role="alert" className="service-notice">
          {error}
        </p>
      )}
    </section>
  );
}
