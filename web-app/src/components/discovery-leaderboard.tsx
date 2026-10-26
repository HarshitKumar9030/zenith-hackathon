"use client";
import {useCallback, useEffect, useState} from 'react';
import {Trophy, ScanLine, RotateCcw, ArrowUpRight, LockKeyhole, Check, Compass} from 'lucide-react';
import {serviceApi} from '@/lib/client-api';
import styles from './discovery-leaderboard.module.css';
type Scores={points:number;earned?:number;spent?:number;penalties?:number;activity?:{id:string;kind:string;delta:number;reason:string;at:string;prize?:string}[];entries:{rank:number;alias:string;points:number;earned?:number;isYou:boolean}[]};
const milestones=[{name:'First find',points:1},{name:'Explorer',points:10},{name:'Trailblazer',points:25},{name:'Pathfinder',points:50}];
function Badge({level=0,locked=false}:{level?:number;locked?:boolean}) {
  return <svg className={styles.badge} viewBox="0 0 72 80" fill="none" aria-hidden="true" data-locked={locked}>
    <path d="M36 3 66 19v35L36 76 6 54V19Z" fill={['#e4ebd9','#e7e1f3','#dce9e7','#eee4cf'][level]}/>
    <path d="m36 11 23 13v26L36 67 13 50V24Z" stroke="currentColor" strokeOpacity=".2"/>
    <path d="m36 22 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9 12-2Z" fill="currentColor" opacity={locked?'.25':'.8'}/>
  </svg>;
}
export default function DiscoveryLeaderboard() {
  const [scores,setScores]=useState<Scores|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const load=useCallback(async(signal?:AbortSignal)=>{
    setLoading(true);setError('');
    try {const result=await serviceApi('discovery-leaderboard');if(!signal?.aborted)setScores(result);}
    catch(e){if(!signal?.aborted)setError((e as Error).message);}
    finally{if(!signal?.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  const points=scores?.points??0;
  const lifetime=scores?.earned??points;
  const earned=milestones.filter(m=>lifetime>=m.points);
  const next=milestones.find(m=>lifetime<m.points);
  const previous=earned.at(-1)?.points??0;
  const progress=next?Math.min(100,((lifetime-previous)/(next.points-previous))*100):100;
  const rank=scores?.entries.find(e=>e.isYou)?.rank;
  return <div className={styles.root}>
    <div className={styles.summary}>
      <section className={styles.scoreCard} aria-label="Your Discovery Points">
        <div className={styles.kicker}><Compass size={15}/> YOUR DISCOVERY JOURNEY</div>
        <div className={styles.scoreLine}><strong aria-live="polite">{scores?points:loading?'…':'—'}</strong><span>Discovery<br/>Points</span><div className={styles.heroBadge}><Badge level={Math.max(0,earned.length-1)} locked={!earned.length}/></div></div>
        <div className={styles.levelLine}><span>{scores?(earned.at(-1)?.name??'Your first find awaits'):'Loading your level…'}</span><small>{scores?(rank?`#${rank} in the top 20`:points?'Outside the top 20':'Start with one scan'):'—'}</small></div>
        <div className={styles.progress} role="progressbar" aria-label="Progress to next milestone" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scores?Math.round(progress):0}><span style={{width:scores?`${progress}%`:'0%'}}/></div>
        <p>{scores?(next?`${next.points-lifetime} more ${next.points-lifetime===1?'scan':'scans'} to ${next.name}`:'All four badges unlocked. Keep exploring.'):'Your progress will appear here.'}</p>
        <a className={styles.scanButton} href="/app?view=Identify%20waste">Make a discovery <ArrowUpRight size={17}/></a>
      </section>
      <section className={styles.milestoneCard} aria-labelledby="badge-title"><div className={styles.kicker}>COLLECT YOUR MILESTONES</div><h2 id="badge-title">Small scans. New levels.</h2><p>Earn points from original waste photos. Badges stay when you redeem a prize.</p><div className={styles.badges}>{milestones.map((m,i)=><div key={m.name} className={styles.milestone} data-earned={Boolean(scores&&lifetime>=m.points)}><Badge level={i} locked={!scores||lifetime<m.points}/><strong>{m.name}</strong><small>{m.points} {m.points===1?'scan':'scans'}</small><span>{scores&&lifetime>=m.points?<><Check size={11}/> Earned</>:<><LockKeyhole size={10}/> Locked</>}</span></div>)}</div></section>
    </div>
    <section className={styles.board} aria-labelledby="discovery-title"><header><div><h2 id="discovery-title"><Trophy size={19}/> The explorers’ board</h2><p>Top 20 · All time · One scan, one point</p></div><button disabled={loading} onClick={()=>void load()} aria-label="Refresh Discovery leaderboard"><RotateCcw size={15} className={loading?styles.spinning:undefined}/> Refresh</button></header>
      <div className={styles.columns} aria-hidden="true"><span>RANK</span><span>EXPLORER</span><span>POINTS</span></div>
      {error&&<p className={styles.notice} role="alert">{error}{scores?' Showing the last loaded scores.':''}</p>}
      {loading&&!scores?<p className={styles.notice} role="status">Loading the board…</p>:scores?.entries.length?<ol className={styles.ranking}>{scores.entries.map(entry=><li key={entry.rank} data-rank={entry.rank} data-you={entry.isYou}><span className={styles.rank}>{String(entry.rank).padStart(2,'0')}</span><div><strong>{entry.isYou?'You':entry.alias}</strong><small>{milestones.filter(m=>(entry.earned??entry.points)>=m.points).at(-1)?.name??'New explorer'}{entry.isYou?' · Your position':''}</small></div><strong className={styles.rowScore}>{entry.points}</strong></li>)}</ol>:!error&&<div className={styles.empty}><div><ScanLine size={24}/></div><h3>The first spot is waiting.</h3><p>Complete a scan and put your name on the board.</p><a href="/app?view=Identify%20waste">Start your first discovery <ArrowUpRight size={14}/></a></div>}
      <footer>Ranking uses available points after redemptions and penalties. Explorer aliases keep account details private.</footer></section>
    <details style={{marginTop:18,background:'#f6f7f2',padding:20,borderRadius:18}}><summary style={{fontSize:13,cursor:'pointer'}}>Your points activity</summary><p style={{fontSize:11}}>Earned {scores?.earned??points} · Redeemed / deducted {scores?.spent??0} · Repeat-scan penalties {scores?.penalties??0}</p>{scores?.activity?.length?<ul style={{padding:0,listStyle:'none'}}>{scores.activity.map(event=><li key={event.id} style={{display:'flex',justifyContent:'space-between',gap:16,padding:'10px 0',fontSize:11}}><span>{event.prize??event.reason.replaceAll('_',' ')}<small style={{display:'block',color:'#9aa38e',marginTop:4}}>{new Date(event.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</small></span><strong>{event.delta>0?'+':''}{event.delta}</strong></li>)}</ul>:<p style={{fontSize:11}}>New points movements will appear here. Earlier points are preserved.</p>}</details>
    <p className={styles.terms}>Original waste photos earn up to 30 points per day. Repeated photos earn nothing; a third identical submission within 24 hours deducts 35% once, rounded down. Similar photos are held for review without automatic penalties. Quiz scores and pickup rewards are separate. Prizes are redeemed through an administrator.</p>
  </div>;
}
