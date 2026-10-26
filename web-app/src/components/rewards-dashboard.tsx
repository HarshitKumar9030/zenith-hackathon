"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MapPin, ReceiptText } from "lucide-react";
import type { Account } from "@/lib/service";
import { activityDay } from "@/lib/streak";
import DiscoveryLeaderboard from "./discovery-leaderboard";
import BenefitsPanel from "./benefits-panel";
import ActionMoment from "./action-moment";
import styles from "./rewards-dashboard.module.css";

function RewardScene({ scene }: { scene: "plant" | "truck" }) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = true;
    const sync = () => element.style.setProperty("--reward-play", visible && !document.hidden ? "running" : "paused");
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return <svg ref={root} className={styles.art} viewBox="0 0 200 160" fill="none" aria-hidden="true">
    {scene === "plant" ? <>
      <path d="m28 114 72-32 72 32-72 35Z" fill="#bbcca3" />
      <path d="m28 114 72 35v8l-72-35Z" fill="#a7bf8b" /><path d="m100 149 72-35v8l-72 35Z" fill="#c9d8b3" />
      <path d="m69 115 31-15 31 15-31 15Z" fill="#8b7054" />
      <path d="M100 115V67" stroke="#638341" strokeWidth="6" strokeLinecap="round" />
      <g className={styles.leaves}>
        <path d="M100 78C64 78 46 58 40 38c31-5 58 7 60 40Z" fill="#81a752" />
        <path d="M100 78c1-41 23-63 62-65-3 37-28 59-62 65Z" fill="#65953f" />
        <path d="m57 49 43 29 46-47" stroke="#517c34" strokeWidth="2" strokeLinecap="round" />
      </g>
    </> : <>
      <g className={styles.truck}>
        <path d="m74 44 84-21 26 18-84 21Z" fill="#faf8ff" />
        <path d="m74 44 26 18v71l-26-18Z" fill="#e2daef" />
        <path d="m100 62 84-21v71l-84 21Z" fill="#c7bce6" />
        <path d="m34 90 26-32 19-5 21 15-22 7-17 26Z" fill="#f5f2fc" />
        <path d="m61 101 17-26 22-7v59l-39 13Z" fill="#e8e2f4" />
        <path d="m34 90 27 11v39l-27-14Z" fill="#d4cbe6" />
        <path d="m39 94 18 8v17l-18-9Z" fill="#60617e" />
        <path d="m67 100 14-21 13-5v28l-27 9Z" fill="#68657f" />
        <path d="m66 116 29-9m-8 7 7-2" stroke="#b4a7ce" strokeWidth="2" strokeLinecap="round" />
        <path d="m39 121 10 5m-15 5 27 13m106-31 10-3" stroke="#faf8ff" strokeWidth="4" strokeLinecap="round" />
        <path d="M133 94c-1-17 9-29 28-32 0 19-10 30-28 32Z" fill="#8bab74" />
        <path d="m134 96 17-22" stroke="#658853" strokeWidth="2" strokeLinecap="round" />
        {[{ x: 78, y: 135 }, { x: 159, y: 122 }].map((wheel) => <g key={wheel.x}>
          <ellipse cx={wheel.x} cy={wheel.y} rx="10" ry="13" fill="#4e4c65" />
          <ellipse cx={wheel.x-1} cy={wheel.y} rx="5" ry="7" fill="#a79cbe" />
          <g className={styles.wheel} style={{ transformOrigin: `${wheel.x-1}px ${wheel.y}px` }}><path d={`M${wheel.x-1} ${wheel.y-4}v8m-3-4h6`} stroke="#dfd9eb" strokeWidth="1.5" /></g>
        </g>)}
      </g>
    </>}
  </svg>;
}

export default function RewardsDashboard({ account, ranking, busy, onRedeem, onNavigate, celebration }: {
  account: Account | null;
  ranking: { alias: string; days: number; rank: number; isYou: boolean }[];
  busy: boolean;
  onRedeem: () => void;
  onNavigate: (page: string) => void;
  celebration: number;
}) {
  const [showReward, setShowReward] = useState(false);
  useEffect(() => {
    if (!celebration) return;
    setShowReward(true);
    const timer = setTimeout(() => setShowReward(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 2500);
    return () => clearTimeout(timer);
  }, [celebration]);
  if (!account) return <p role="status">Loading your rewards…</p>;
  const month = activityDay(new Date()).slice(0, 7);
  const used = account.redemptions.filter((r) => r.month === month).length;
  const ready = account.points >= 10 && used < 2;
  const events = [
    ...account.rewardDays.map((day) => ({ id: `day-${day}`, date: `${day}T12:00:00+05:30`, label: "Scan day confirmed", value: "+1 point" })),
    ...account.redemptions.map((r) => ({ id: r.id, date: r.createdAt, label: "Pickup credit redeemed", value: "−10 points" })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 4);
  return <div className={styles.dashboard}>
    <header className={styles.heading}><h1>Good habits. Useful rewards.</h1><p>Scan, confirm, and turn your points into a pickup.</p></header>
    <div className={styles.hero}>
      <section className={styles.points} aria-label="Scan points">
        {showReward ? <div className={styles.celebration}><ActionMoment key={celebration} kind="reward" /><span className="screen-reader-only" role="status">One pickup credit added.</span></div> : <RewardScene scene="plant" />}<h2>Scan points</h2><strong className={styles.amount}>{account.points}</strong><p>1 point per confirmed scan day.</p>
        <div className={styles.progress} role="progressbar" aria-label="Progress to a pickup credit" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.min(account.points, 10)}><span style={{ width: `${Math.min(account.points, 10) * 10}%` }} /></div>
        <div className={styles.progressLabels}><span>0</span><span>10</span></div>
        <p className={styles.progressCopy}>{used >= 2 ? "Your two monthly redemptions are used. Keep earning for next month." : ready ? "You’re ready to redeem one pickup credit." : "10 points unlock one pickup credit."}</p>
        <button className="primary" disabled={busy || !ready} onClick={onRedeem}>Redeem 10 points</button>
      </section>
      <section className={styles.credits} aria-label="Pickup credits"><RewardScene scene="truck" /><h2>Pickup credits</h2><strong className={styles.amount}>{account.credits}</strong><p>One credit covers the Basic pickup fee, up to 2 kg.</p><button className="primary" onClick={() => onNavigate("Pickups")}>Book a pickup <ArrowRight size={16} /></button></section>
    </div>
    <ol className={styles.steps}>{[
      ["Scan", "Show your items in the camera or describe them."],
      ["Confirm", "Review your items. Earn one point on your first confirmed scan each day."],
      ["Redeem", "Use 10 points for a pickup credit. Up to two per calendar month."],
    ].map(([title, text], i) => <li key={title}><span>{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
    <DiscoveryLeaderboard />
    <div className={styles.secondaryGrid}>
      <section className={styles.secondary}><h2>Recent activity</h2>{events.length ? <ul className={styles.events}>{events.map((event) => <li key={event.id}><div><strong>{event.label}</strong><time dateTime={event.date}>{new Date(event.date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</time></div><span>{event.value}</span></li>)}</ul> : <div className={styles.empty}><ReceiptText size={30} /><p>Your first confirmed scan starts the story.</p><button className="text-button" onClick={() => onNavigate("Identify waste")}>Start a scan <ArrowRight size={14} /></button></div>}</section>
      <section className={styles.secondary}><h2>Your locality</h2>{ranking.length ? <ol className={styles.ranking}>{ranking.slice(0, 4).map((r) => <li key={r.rank}><span>{r.rank}</span><strong>{r.alias}{r.isYou ? " · you" : ""}</strong><small>{r.days} scan days</small></li>)}</ol> : <div className={styles.empty}><MapPin size={30} /><p>{account.profile.locality ? "Your community leaderboard starts with a confirmed scan and an opt-in alias." : "Add your locality to join the leaderboard."}</p><button className="text-button" onClick={() => onNavigate("Pickups")}>Set locality <ArrowRight size={14} /></button></div>}</section>
    </div>
    <details className={styles.benefits}><summary>Your savings &amp; participation record <ChevronDown size={20} /></summary><BenefitsPanel key={account.rev} /></details>
    <p className={styles.terms}>Points stay when a streak breaks. Reward credits cover the base pickup fee; Basic sorting and evening charges can apply. Rankings use confirmed scan days, never the amount of waste generated.</p>
  </div>;
}
