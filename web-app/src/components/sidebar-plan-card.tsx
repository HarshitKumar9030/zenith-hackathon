"use client";
import {useEffect,useState} from 'react';
import {Crown,Gem,ArrowRight} from 'lucide-react';
import {PLANS} from '@/lib/catalog';
import styles from './sidebar-plan.module.css';
type Membership={plan:string;remainingPickups:number;remainingKg:number};
export default function SidebarPlanCard({helper,signedIn,membership,onNavigate}:{helper:boolean;signedIn?:boolean;membership?:Membership|null;onNavigate:(page:string)=>void}){
 const [loaded,setLoaded]=useState<Membership|null|undefined>(undefined),[error,setError]=useState(false);
 useEffect(()=>{if(helper||!signedIn||membership!==undefined)return;const control=new AbortController();setError(false);setLoaded(undefined);fetch('/api/service',{signal:control.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(!control.signal.aborted)setLoaded(d.account.membership||null)}).catch(()=>{if(!control.signal.aborted)setError(true)});return()=>control.abort()},[helper,signedIn,membership]);
 const active=membership!==undefined?membership:loaded;
 const loading=signedIn&&active===undefined&&!error;
 return <div className={`sidebar-plan ${styles.card}`} aria-label={helper?'Helper workspace':'Current collection plan'}>{helper?<><span>Helper workspace</span><strong>Collection partner</strong><small>Collections, receipts and earnings</small><button type="button" onClick={()=>onNavigate('Helper collections')}>View collections <ArrowRight size={14}/></button></>:<><span>{signedIn?'Your current plan':'Collection plans'}</span><strong>{active?.plan==='gold'?<Crown size={23}/>:active?.plan==='platinum'?<Gem size={23}/>:null}{loading?'Loading plan…':error?'Plan unavailable':active?active.plan.charAt(0).toUpperCase()+active.plan.slice(1):'Basic'}</strong><small>{loading?'Checking your membership':error?'Open Plans to try again':active?`${active.remainingPickups} pickups · ${active.remainingKg} kg left`:`Pay as you go · ₹${PLANS.basic.price}/pickup`}</small><a href="/app?view=Plans" className={styles.planLink}>{active?'Manage plan':'View plans'} <ArrowRight size={14}/></a></>}</div>
}
