"use client";
import { useEffect, useState } from "react";
import { Copy, Download, Leaf, RotateCcw } from "lucide-react";
import type { BenefitSummary, ParticipationRecord } from "@/lib/benefits";
import styles from "./benefits-panel.module.css";

type RecordData = { participation: ParticipationRecord; benefits: BenefitSummary; calculatedAt: string };
const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function BenefitsPanel() {
  const [data, setData] = useState<RecordData | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [copied, setCopied] = useState(false);
  useEffect(() => {
    const control = new AbortController();
    setBusy(true);
    setError("");
    fetch("/api/participation", { cache: "no-store", signal: control.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load your benefits.");
        return body as RecordData;
      })
      .then((body) => { if (!control.signal.aborted) setData(body); })
      .catch((e: Error) => { if (!control.signal.aborted) setError(e.message); })
      .finally(() => { if (!control.signal.aborted) setBusy(false); });
    return () => control.abort();
  }, [revision]);
  return <section className={styles.panel} aria-label="Your savings and participation" aria-busy={busy}>
    <div className={styles.heading}>
      <div><span className="micro">YOUR PARTICIPATION</span><h2>Every collection, accounted for.</h2></div>
      <button type="button" className="text-button" onClick={() => setRevision((n) => n + 1)} disabled={busy} aria-label="Refresh benefits"><RotateCcw size={16} /></button>
    </div>
    {error ? <p role="alert">{error}</p> : null}
    {!data ? <p role="status">{busy ? "Loading your verified records…" : "Your record is unavailable. Try refreshing."}</p> : <div className={styles.grid}>
      <div>
        <dl className={styles.values}>
          <div><dt>Waste Right fee reductions</dt><dd>{money(data.benefits.feeReductionPaise)}</dd><small>Completed Basic pickups compared with the previous ₹15 base fee.</small></div>
          <div><dt>Included segregation value</dt><dd>{money(data.benefits.includedSortingPaise)}</dd><small>Measured mixed waste handled under Gold/Platinum, compared with ₹5/kg sorting.</small></div>
          <div className={styles.government}><dt>Government-funded savings</dt><dd>{money(data.benefits.governmentSavingsPaise)}</dd><small>Application stage. No government subsidy has been awarded or credited.</small></div>
        </dl>
        <p className={styles.note}>These comparisons are service benefits, not cash payouts or net subscription savings. Only completed, measured collections count.</p>
      </div>
      <div className={styles.record}>
        <div className={styles.issuer}><Leaf size={24} /><strong>Waste Right</strong><span>Independent record</span></div>
        <h3>Your participation ID</h3>
        <code>{data.participation.id}</code>
        <p>{data.benefits.completedPickups} completed pickups · {data.benefits.verifiedKg.toLocaleString("en-IN")} kg measured</p>
        <p className={styles.note}>Issued {new Date(data.participation.issuedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}. Government issuance and Aadhaar linking are unavailable.</p>
        <div className={styles.actions}>
          <button type="button" className="secondary" onClick={async () => {
            try { await navigator.clipboard.writeText(data.participation.id); setCopied(true); }
            catch { setError("Could not copy. You can select the participation ID above."); }
          }}><Copy size={15} />{copied ? "ID copied" : "Copy ID"}</button>
          <a className="text-button" href="/api/participation?download=1"><Download size={15} />Download record</a>
        </div>
        {copied ? <span className={styles.note} role="status">Participation ID copied.</span> : null}
      </div>
    </div>}
  </section>;
}
