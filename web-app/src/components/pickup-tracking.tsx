"use client";
import {useEffect,useRef,useState} from 'react';
import {Copy,MapPin,ShieldCheck,Smartphone,Square} from 'lucide-react';
import {startBrowserTracking,TrackingEnded} from "@/lib/browser-tracking";
import LivePickupMap, {type Destination} from "./live-pickup-map";
import {type TrackingPoint} from '@/lib/tracking';
import styles from './pickup-tracking.module.css';
async function api(bookingId:string,body?:unknown,token?:string){
 const r=await fetch(`/api/tracking${body?'':`?bookingId=${encodeURIComponent(bookingId)}`}`,{method:body?'POST':'GET',keepalive:!!body&&(body as {action?:string}).action==='stop',cache:'no-store',headers:body?{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok){if(token&&[401,403,409].includes(r.status))throw new TrackingEnded(data.error||'Tracking ended.');throw new Error(data.error||'Tracking is unavailable.');}return data;
}
export function PickupTracking({bookingId}:{bookingId:string}){
 const [showMap,setShowMap]=useState(false);
 const [data,setData]=useState<{state:string;destination?:Destination|null;eta?:{minMinutes:number;maxMinutes:number}|null;point?:TrackingPoint|null}|null>(null),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{let cancelled=false;let timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{const value=await api(bookingId);if(!cancelled){setData(value);setError('');setNow(Date.now())}}catch(e){if(!cancelled){setError((e as Error).message);setNow(Date.now())}}finally{if(!cancelled)timer=setTimeout(()=>void poll(),5000)}};
  void poll();return()=>{cancelled=true;clearTimeout(timer)};
 },[bookingId]);
 const point=data?.point,age=point?Math.max(0,Math.floor((now-point.timestamp)/1000)):0;
 const status=error?'Connection interrupted':!data?'Checking tracking…':data.state==='ended'?'Tracking ended':!point?'Waiting for helper location':age>30?'Last known location':point.accuracy>100?'Approximate location':'Live location';
 return <section className={styles.card} aria-label="Pickup tracking"><header><div className={styles.icon}><MapPin size={22}/></div><div><h3>Your helper’s location</h3><p role="status">{status}</p></div></header>
  {data?.eta && point && age<=30 && !error ? <p><strong>Estimated arrival: {data.eta.minMinutes}–{data.eta.maxMinutes} minutes</strong><br/><small>Based on your helper’s current distance. Approximate; road routes and traffic are not included.</small></p> : <p className={styles.note}>Arrival estimate pending a fresh, precise helper location and saved collection coordinates.</p>}
  {point?<><div className={styles.metrics}><div><strong>±{Math.ceil(point.accuracy)} m</strong><span>Device-reported accuracy</span></div><div><strong>{age<5?'Just now':`${age}s ago`}</strong><span>Last GPS fix</span></div></div>
   {age<=120 && (showMap ? <><LivePickupMap point={point} destination={data?.destination} stale={age>30||Boolean(error)}/><button type="button" className={styles.link} onClick={()=>setShowMap(false)}>Hide map</button></> : <button type="button" className={styles.button} onClick={()=>setShowMap(true)}><MapPin size={16}/>View live map</button>)}
   <p className={styles.note}>The circle shows your helper’s reported GPS accuracy. Map tiles load from OpenStreetMap when you open the map.</p>
  </>:<p className={styles.note}>{data?.state==='ended'?'Sharing is available only while your pickup is assigned.':'Your helper can share their location using the Android app. It appears here after sharing starts.'}</p>}
  {error&&<p className={styles.note} role="alert">{error} Last known positions are not a live fix.</p>}
 </section>;
}
export function HelperTracking({bookingId,hindi=false}:{bookingId:string;hindi?:boolean}){
 const [sharing,setSharing]=useState(false),[locating,setLocating]=useState(false),[locationMessage,setLocationMessage]=useState('');
 const control=useRef<AbortController|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;control.current?.abort()}},[bookingId]);
 const startSharing=async()=>{
  if(!navigator.geolocation){setLocationMessage('Location sharing is unavailable in this browser.');return;}
  control.current?.abort();const controller=new AbortController();control.current=controller;setLocating(true);setLocationMessage('');
  try{
   await startBrowserTracking({geolocation:navigator.geolocation,signal:controller.signal,start:()=>api(bookingId,{action:'start',bookingId}),send:(point,token)=>api(bookingId,{action:'update',...point},token),heartbeat:token=>api(bookingId,{action:'heartbeat'},token),stop:token=>api(bookingId,{action:'stop'},token),onStatus:message=>{if(mounted.current)setLocationMessage(message)},onEnd:()=>{controller.abort();if(mounted.current)setSharing(false)}});
   if(mounted.current&&!controller.signal.aborted)setSharing(true);
  }catch(e){if(mounted.current&&!controller.signal.aborted)setLocationMessage((e as Error).message)}
  finally{if(mounted.current)setLocating(false)}
 };
 const [code,setCode]=useState(''),[server,setServer]=useState(''),[expires,setExpires]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const create=async()=>{setBusy(true);setMessage('');try{const data=await api(bookingId,{action:'create',bookingId});setCode(data.code);setServer(window.location.origin);setExpires(data.expiresAt)}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}};
 return <section className={styles.card}><header><div className={styles.icon}><Smartphone size={22}/></div><div><h3>{hindi?'लाइव संग्रह स्थान':'Share pickup location'}</h3><p>{hindi?'केवल इस संग्रह के निवासी के साथ':'Only with this pickup’s resident'}</p></div></header>
  <button type="button" className={styles.button} disabled={locating} onClick={()=>{if(sharing){control.current?.abort();setSharing(false);setLocationMessage('')}else void startSharing()}}>{locating?(hindi?'स्थान ढूँढ रहे हैं…':'Finding your location…'):sharing?(hindi?'स्थान साझा करना बंद करें':'Stop sharing'):(hindi?'स्थान साझा करें':'Share location')}</button>
  <p className={styles.note}>{hindi?'लाइव अपडेट के लिए यह स्क्रीन खुली रखें।':'Keep this screen open for live updates.'}</p>
  {locationMessage&&<p role="status" className={styles.note}>{locationMessage}</p>}
  <details className={styles.setup}><summary>{hindi?'Android ऐप से साझा करें':'Use the Android app instead'}</summary>
  <p className={styles.note}>{hindi?'Android ऐप जोड़ें और अपनी अनुमति से स्थान साझा करें। ऐप में या सूचना से कभी भी रोकें।':'Pair the Android helper app, then choose Start sharing on your phone. A visible notification lets you stop at any time.'}</p>
  {!code?<button type="button" className={styles.button} disabled={busy} onClick={()=>void create()}>{busy?'Please wait…':hindi?'Android ऐप जोड़ें':'Pair Android app'}</button>:<div className={styles.pairing}><label>{hindi?'सर्वर पता':'Server address'}<input readOnly value={server}/></label><label>{hindi?'एक बार उपयोग का कोड':'One-use pairing code'}<input readOnly value={code}/></label><button type="button" className={styles.link} onClick={()=>{void navigator.clipboard.writeText(code).then(()=>setMessage('Code copied.')).catch(()=>setMessage('Select and copy the code above.'))}}><Copy size={14}/>Copy code</button><small>Expires {new Date(expires).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}. On a phone, use your deployed HTTPS address or the computer’s LAN address for a local debug build.</small><button type="button" className={styles.link} disabled={busy} onClick={()=>void create()}>Generate a new code</button></div>}
  <button type="button" className={styles.link} disabled={busy} onClick={()=>{setBusy(true);void api(bookingId,{action:'stop',bookingId}).then(()=>{setCode('');setMessage(hindi?'स्थान साझा करना बंद है।':'Location sharing stopped.')}).catch(e=>setMessage(e.message)).finally(()=>setBusy(false))}}><Square size={13}/>{hindi?'साझा करना बंद करें':'Stop sharing for this pickup'}</button>
  </details><p className={styles.note}><ShieldCheck size={13}/> {hindi?'अधिकतम 2 घंटे। केवल सक्रिय संग्रह।':'Up to two hours. Active assigned pickup only.'}</p>{message&&<p className={styles.note} role="status">{message}</p>}
 </section>;
}
