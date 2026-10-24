"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, Download, Leaf, LockKeyhole, RotateCcw } from "lucide-react";
import type { BenefitSummary, ParticipationRecord } from "@/lib/benefits";
import styles from "./benefits-panel.module.css";

type RecordData = { participation: ParticipationRecord | null; benefits: BenefitSummary; calculatedAt: string };
const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function BenefitsPanel() {
  const [data, setData] = useState<RecordData | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [copied, setCopied] = useState(false);
  useEffect(() => {
    const control = new AbortController();
    setBusy(true); setError(""); setCopied(false);
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
  const record = data?.participation;
  return <section className={styles.panel} aria-label="Your savings and participation" aria-busy={busy}>
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}>YOUR IMPACT, RECORDED</span><h2>Your savings & participation.</h2><p>Benefits from completed, measured collections.</p></div>
      <button type="button" className={styles.refresh} onClick={() => setRevision((n) => n + 1)} disabled={busy} aria-label="Refresh benefits"><RotateCcw size={17} /></button>
    </header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {!data ? <p role="status">{busy ? "Loading your verified records…" : "Your record is unavailable. Try refreshing."}</p> : <>
      <dl className={styles.values}>
        <div><dt>Fee reductions</dt><dd>{money(data.benefits.feeReductionPaise)}</dd><span>Waste Right pricing benefit</span></div>
        <div><dt>Included segregation</dt><dd>{money(data.benefits.includedSortingPaise)}</dd><span>Gold & Platinum service value</span></div>
        <div><dt>Government benefits</dt><dd>{money(data.benefits.governmentSavingsPaise)}</dd><span>Funding application stage</span></div>
      </dl>
      <details className={styles.explanation}><summary>How these values are calculated</summary><p>Fee reductions compare recorded Basic collection fees with the previous ₹15 base fee. Included segregation compares measured mixed waste handled under a membership with ₹5/kg sorting. These are comparison values, not cash payouts or savings after subscription costs. Pending, disputed and refunded collections are excluded. No government subsidy has been credited.</p></details>
      <div className={`${styles.record} ${record ? styles.issued : ""}`}>
        <div className={styles.recordIcon} aria-hidden="true">{record ? <Leaf size={29} strokeWidth={1.5} /> : <LockKeyhole size={26} strokeWidth={1.5} />}</div>
        <div className={styles.recordBody}>
          <div className={styles.recordTitle}><span className={styles.eyebrow}>WASTE RIGHT · INDEPENDENT RECORD</span><span className={styles.status}>{record ? <><Check size={13} />Issued</> : "Not yet eligible"}</span></div>
          <h3>{record ? "Your participation record" : "One organic pickup. A lasting record."}</h3>
          <p>{record ? `${data.benefits.organicPickups} completed organic ${data.benefits.organicPickups === 1 ? "pickup" : "pickups"} · ${data.benefits.organicKg.toLocaleString("en-IN")} kg verified by a helper.` : "Your record unlocks after a helper weighs organic waste and you accept the receipt to complete the pickup. Scans and scheduled pickups alone do not qualify."}</p>
          {record ? <>
            <code className={styles.id}>{record.id}</code>
            <div className={styles.actions}>
              <button type="button" onClick={async () => {
                try { await navigator.clipboard.writeText(record.id); setCopied(true); }
                catch { setError("Could not copy. You can select the participation ID above."); }
              }}><Copy size={15} />{copied ? "ID copied" : "Copy ID"}</button>
              <a href="/api/participation?download=1"><Download size={15} />Download record</a>
              <span>Issued {new Date(record.issuedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            </div>
            {copied ? <span className={styles.srOnly} role="status">Participation ID copied.</span> : null}
          </> : <a className={styles.book} href="/app?view=Pickups">Schedule a pickup <ArrowRight size={16} /></a>}
        </div>
      </div>
      <p className={styles.disclosure}>Issued by Waste Right. Government collaboration is proposed; official government credentials and Aadhaar linking are not available.</p>
    </>}
  </section>;
}
