"use client";
import {useCallback, useEffect, useState} from 'react';
import {Trophy, ScanLine, RotateCcw} from 'lucide-react';
import {serviceApi} from '@/lib/client-api';
import styles from './rewards-dashboard.module.css';
type Scores={points:number;entries:{rank:number;alias:string;points:number;isYou:boolean}[]};
export default function DiscoveryLeaderboard() {
  const [scores,setScores]=useState<Scores|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const load=useCallback(async(signal?:AbortSignal)=>{
    setLoading(true);setError('');
    try {const result=await serviceApi('discovery-leaderboard');if(!signal?.aborted)setScores(result);}
    catch(e){if(!signal?.aborted)setError((e as Error).message);}
    finally{if(!signal?.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  return <section className={styles.secondary} style={{marginBottom:22}} aria-labelledby="discovery-title">
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
      <div><h2 id="discovery-title"><Trophy size={19} aria-hidden="true" /> Discovery Points</h2>
      <p>One successful scan. One point. A separate hackathon challenge.</p></div>
      <button className="text-button" disabled={loading} onClick={()=>void load()} aria-label="Refresh Discovery leaderboard"><RotateCcw size={16}/> Refresh</button>
    </header>
    <p style={{fontSize:36,letterSpacing:'-.04em',margin:'18px 0'}} aria-live="polite"><strong>{scores?.points ?? (loading?'…':'—')}</strong> <span style={{fontSize:14}}>your Discovery Points</span></p>
    <p>These points rank your scans only. They cannot be redeemed for pickups and do not change your reward balance.</p>
    {error?<p role="alert">{error}</p>:loading&&!scores?<p role="status">Loading the leaderboard…</p>:scores?.entries.length?<ol className={styles.ranking} aria-label="Discovery leaderboard, top 20">{scores.entries.map(entry=><li key={entry.rank}><span>{entry.rank}</span><strong>{entry.isYou?'You':entry.alias}</strong><small>{entry.points} {entry.points===1?'point':'points'}</small></li>)}</ol>:<div className={styles.empty}><ScanLine size={28}/><p>Complete a scan to start the leaderboard.</p></div>}
    <small>Top 20 explorers · All-time points since this challenge launched · Public explorer aliases keep account details private.</small>
  </section>;
}
