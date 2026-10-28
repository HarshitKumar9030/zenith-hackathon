"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Download, Expand, Leaf, Mail, Map, Orbit, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { ECO_TRAIL } from "@/lib/collection-game-landmarks";
import { SORTING_STATIONS } from "@/lib/collection-game-physics";
import { emptyCargo, TOTAL_TARGET, WASTE, WASTE_TYPES } from "@/lib/collection-game-rules";
import type { CityData, CollectionGame, GameState } from "./game-engine";
import Speedometer from "./speedometer";
import MobileControls from "./mobile-controls";
import type {TouchDrive} from "@/lib/collection-game-touch";
import "./game.css";
const INITIAL: GameState = { phase: "loading", seconds: 300, score: 0, cargo: emptyCargo(), collected: [], nearest: null, distance: 0, speed: 0, x: -360, z: 330, heading: 0, message: "Building your route…", district: "Circular City", camera: 0, sound: true };
const time = (s: number) => { const total = Math.max(0, Math.ceil(s)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; };
function CityMap({ state, data, large = false }: { state: GameState; data: CityData | null; large?: boolean }) {
 const clipId = useId();
 const cx = state.x + 400, cy = state.z + 400;
 const dx = (state.nearest?.position[0] ?? state.x) - state.x, dz = (state.nearest?.position[2] ?? state.z) - state.z;
 const distance = Math.hypot(dx,dz), edgeX = cx + dx / (distance || 1) * 107, edgeY = cy + dz / (distance || 1) * 107;
 return <svg viewBox={large ? "0 0 800 800" : `${cx-125} ${cy-125} 250 250`} role="img" aria-label="City map. Coloured dots show collection spots, the white arrow is your truck.">
  <defs><clipPath id={clipId}>{large ? <rect width="800" height="800" rx="28" /> : <circle cx={cx} cy={cy} r="124" />}</clipPath></defs>
  <g clipPath={`url(#${clipId})`}>
  <rect x={large?0:cx-125} y={large?0:cy-125} width={large?800:250} height={large?800:250} fill="#223e35" />
  {data?.districts.map(d => <g key={d.id}><rect x={d.center[0] + 290} y={d.center[2] + 290} width="220" height="220" rx="12" fill="#345347" /></g>)}
  {[-360, -240, -120, 0, 120, 240, 360].map(v => <g key={v} stroke="#819c86" strokeWidth={large ? 9 : 6}><path d={`M${v + 400} 30V770`} /><path d={`M30 ${v + 400}H770`} /></g>)}
  {large && data?.districts.map(d => <g key={d.id}><rect x={d.center[0] + 315} y={d.center[2] + 412} width="170" height="29" rx="8" fill="#19392e" /><text x={d.center[0] + 400} y={d.center[2] + 432} textAnchor="middle" fill="#e4f0d5" fontSize="16" fontWeight="600">{d.id.slice(3)}</text></g>)}
  {data?.collectibles.filter(p => !state.collected.includes(p.id) && state.cargo[p.wasteType] < WASTE[p.wasteType].target).map(p => <circle key={p.id} cx={p.position[0] + 400} cy={p.position[2] + 400} r={large ? 5 : 2.7} fill={WASTE[p.wasteType].color} opacity={state.nearest?.id === p.id ? 1 : .6} />)}
  {ECO_TRAIL.filter(p=>!state.landmarks?.includes(p.id)).map(p=><circle key={p.id} cx={p.x+400} cy={p.z+400} r={large?7:3.5} fill="none" stroke="#f6d396" strokeWidth="2"/>)}
  {SORTING_STATIONS.map(s=><rect key={s.id} x={s.x+396} y={s.z+396} width="8" height="8" rx="2" fill="#88f5d3" stroke="#152c24" strokeWidth="1"/>)}
  {state.nearest && <g><path d={`M${state.x + 400} ${state.z + 400}L${state.nearest.position[0] + 400} ${state.nearest.position[2] + 400}`} stroke="#f0f7cd" strokeDasharray="8 7" strokeWidth="2" opacity=".7" /><circle cx={state.nearest.position[0] + 400} cy={state.nearest.position[2] + 400} r="13" fill="none" stroke="white" strokeWidth="3" /></g>}
  <g transform={`translate(${state.x + 400} ${state.z + 400}) rotate(${-state.heading * 180 / Math.PI})`}><circle r={large?15:8} fill="#132d24" /><path d={large?"M18 0L-11 -10L-5 0L-11 10Z":"M9 0L-6 -5L-3 0L-6 5Z"} fill="#fffbe7" stroke="#142e23" strokeWidth="2" /></g>
  {!large && state.nearest && distance>109 && <g transform={`translate(${edgeX} ${edgeY}) rotate(${Math.atan2(dz,dx)*180/Math.PI})`}><circle r="9" fill="#183b2a"/><path d="M7 0L-4 -5L-4 5Z" fill={WASTE[state.nearest!.wasteType].color}/></g>}
  </g>
 </svg>;
}
export default function CollectionGamePage({accessSeconds,onAccessExpired,onSignOut}:{accessSeconds:number;onAccessExpired:()=>void;onSignOut:()=>void}) {
 const host = useRef<HTMLDivElement>(null), engine = useRef<CollectionGame | null>(null);
 const [state, setState] = useState<GameState>(INITIAL), [data, setData] = useState<CityData | null>(null);
 const [mapOpen, setMapOpen] = useState(false), [best, setBest] = useState(0), [saving, setSaving] = useState(false), [shareMessage, setShareMessage] = useState("");
 const [emailOpen,setEmailOpen]=useState(false),[email,setEmail]=useState(""),[emailStatus,setEmailStatus]=useState(""),[emailBusy,setEmailBusy]=useState(false);
 const mapRef = useRef(false), resumeAfterMap = useRef(false), stateRef = useRef(state);
 const [starting,setStarting]=useState(false),[accessError,setAccessError]=useState('');
 const startRequest=useRef<AbortController|null>(null);
 const startRound=useCallback(async()=>{
  if(startRequest.current)return;
  engine.current?.prepareAudio();
  const controller=new AbortController();startRequest.current=controller;setStarting(true);setAccessError('');
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch('/api/game-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start'}),signal:controller.signal}),data=await r.json();
   if(!r.ok){if(r.status===401||r.status===403)onAccessExpired();throw new Error(data.error||'Could not open your round.');}
   if(!controller.signal.aborted)engine.current?.start();
  }catch(e){if(startRequest.current===controller)setAccessError(controller.signal.aborted?'The access check took too long. Please try again.':(e as Error).message);}
  finally{clearTimeout(timeout);if(startRequest.current===controller){startRequest.current=null;setStarting(false);}}
 },[onAccessExpired]);

 stateRef.current = state;
 useEffect(() => {
  let cancelled = false;
  import("./game-engine").then(({ CollectionGame }) => {
   if (!cancelled && host.current) { try { engine.current = new CollectionGame(host.current, setState, setData,()=>void startRound()); } catch { setState(s => ({ ...s, phase: "error", message: "This browser cannot start 3D graphics. Enable hardware acceleration or try Chrome or Edge." })); } }
  }).catch(() => { if (!cancelled) setState(s => ({ ...s, phase: "error", message: "Game files could not load. Reload to try again." })); });
  try { setBest(Number(localStorage.getItem("ecomitra-city-best")) || 0); } catch { /* Private browsing still supports play. */ }
  return () => { cancelled = true;const request=startRequest.current;startRequest.current=null;request?.abort();engine.current?.dispose(); engine.current = null; };
 }, []);
 useEffect(() => { if (state.phase === "finished" && state.score > best) { setBest(state.score); try { localStorage.setItem("ecomitra-city-best", String(state.score)); } catch { /* Local best is optional. */ } } }, [state.phase, state.score, best]);
 const touchDrive=useCallback((input:TouchDrive)=>engine.current?.setTouchDrive(input),[]);
 const fullscreen = useCallback(() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen().catch(() => {}); }, []);
 const toggleMap = useCallback(() => {
  if (!["playing", "paused"].includes(stateRef.current.phase)) return;
  if (!mapRef.current) { resumeAfterMap.current = stateRef.current.phase === "playing"; if (resumeAfterMap.current) engine.current?.togglePause(); }
  else if (resumeAfterMap.current && stateRef.current.phase === "paused") engine.current?.togglePause();
  mapRef.current = !mapRef.current; setMapOpen(mapRef.current);
 }, []);
 useEffect(() => {
  const key = (e: KeyboardEvent) => {
   if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
   if (mapRef.current && ["p", "enter"].includes(e.key.toLowerCase()) && !(e.target as HTMLElement)?.closest("button")) { e.preventDefault(); e.stopImmediatePropagation(); return; }
   if (e.key.toLowerCase() === "m" || (e.key === "Escape" && mapRef.current)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) toggleMap(); }
   if (e.key.toLowerCase() === "f") { e.preventDefault(); if (!e.repeat) fullscreen(); }
  }; window.addEventListener("keydown", key, true); return () => window.removeEventListener("keydown", key, true);
 }, [fullscreen, toggleMap]);
 async function emailResult(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(emailBusy)return;setEmailBusy(true);setEmailStatus("");
  try{
   const response=await fetch("/api/game-result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim(),cargo:state.cargo,remainingSeconds:state.seconds}),signal:AbortSignal.timeout(30000)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not send your result.");
   setEmailStatus("Sent! Your score and story card are on their way.");
  }catch(error){setEmailStatus(error instanceof Error&&error.name!=="TimeoutError"?error.message:"Email took too long. Try again or download your card.");}
  finally{setEmailBusy(false);}
 }
 async function saveStory() {
  setSaving(true); setShareMessage("");
  try {
   const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
   const c = canvas.getContext("2d"); if (!c) throw new Error("Unable to make your card.");
   c.fillStyle = "#132e25"; c.fillRect(0, 0, 1080, 1920);
   const grad = c.createRadialGradient(800, 500, 0, 800, 500, 800); grad.addColorStop(0, "#416347"); grad.addColorStop(1, "#132e25"); c.fillStyle = grad; c.fillRect(0, 0, 1080, 1920);
   c.fillStyle = "#b9eb7c"; c.font = "600 34px Arial"; c.fillText("ECOMITRA  /  CIRCULAR CITY", 80, 120);
   c.fillStyle = "#f2f3dd"; c.font = "bold 86px Arial"; c.fillText(state.collected.length === TOTAL_TARGET ? "City. Cleaned." : "Every pickup", 80, 280); c.fillText(state.collected.length === TOTAL_TARGET ? "Mission. Complete." : "makes a difference.", 80, 380);
   const image = new Image(); image.src = "/game/truck-preview.png"; await image.decode();
   c.save(); c.beginPath(); c.roundRect(80, 450, 920, 650, 40); c.clip(); c.drawImage(image, 80, 430, 920, 690); c.restore();
   c.fillStyle = "#b9eb7c"; c.font = "bold 150px Arial"; c.fillText(state.score.toLocaleString(), 80, 1290);
   c.fillStyle = "#e8eadb"; c.font = "30px Arial"; c.fillText("COLLECTION SCORE", 84, 1340);
   const typesFound = WASTE_TYPES.filter(t => state.cargo[t] > 0).length;
   c.font = "bold 34px Arial"; c.fillText(`${state.collected.length} / ${TOTAL_TARGET} pickups   ·   ${typesFound} waste ${typesFound === 1 ? "type" : "types"}`, 80, 1440);
   WASTE_TYPES.forEach((t, i) => { const x = 80 + (i % 3) * 310, y = 1535 + Math.floor(i / 3) * 100; c.fillStyle = WASTE[t].color; c.font = "bold 30px Arial"; c.fillText(`${WASTE[t].label}  ${state.cargo[t]}`, x, y); });
   c.fillStyle = "#d6dfcc"; c.font = "28px Arial"; c.fillText("Drive. Discover. Collect.", 80, 1790); c.font = "22px Arial"; c.fillText("EcoMitra game result · simulated waste collection", 80, 1840);
   const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image export failed.")), "image/png"));
   const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "ecomitra-my-city-score.png"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
   setShareMessage("Your 1080 × 1920 story card is downloaded. Share it wherever you like.");
  } catch { setShareMessage("Could not save the image. Try again in Chrome or Edge."); } finally { setSaving(false); }
 }
 const active = state.phase === "playing" || state.phase === "paused", done = state.collected.length === TOTAL_TARGET;
 const nearPickup = Boolean(state.nearest && state.distance <= 20);
 const stationAction = !nearPickup && Boolean(state.interaction);
 const interactionReady=stationAction?state.speed<=10:nearPickup&&state.speed<=29;
 const notice = active && state.message && !["Follow the marker.", "Your round starts now.", "Find the coloured"].some(prefix => state.message.startsWith(prefix));
 return <main className={`eco-game${active ? " is-in-round" : ""}`} onClickCapture={event=>{if(active)(event.target as Element).closest<HTMLButtonElement>("button")?.blur();}}>
  <div className="eco-game-world" ref={host} aria-label="3D waste collection game" />
  <div className="eco-game-vignette" />
  {accessError&&<div className="eco-game-notice" role="alert">{accessError}</div>}
  <header className="eco-game-header">
   <a href="/" className="eco-game-brand"><Leaf size={28} /><span>EcoMitra{!active && <small>CIRCULAR CITY</small>}</span></a>
   <div className="eco-game-top-actions">{active ? <><button onClick={()=>state.sound&&!state.soundRunning?engine.current?.enableSound():engine.current?.toggleSound()} aria-label={state.sound&&!state.soundRunning?"Enable game sound":state.sound?"Mute game sound":"Enable game sound"} title={state.sound&&!state.soundRunning?"Click to enable sound":state.sound?"Mute sound":"Enable sound"}>{state.sound&&state.soundRunning?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button onClick={() => engine.current?.togglePause()} aria-label="Pause and controls" title="Pause and controls (P)"><Pause size={18} /><kbd>P</kbd></button><button onClick={()=>engine.current?.toggleCamera()} aria-label={state.camera===1?"Switch to third-person camera":"Switch to first-person camera"} title="Switch first / third person (C)"><Orbit size={17}/><small>{["TPP","FPP","360"][state.camera]}</small></button></> : <><button onClick={() => engine.current?.toggleSound()} aria-label={state.sound ? "Mute sound" : "Enable sound"}>{state.sound ? <Volume2 /> : <VolumeX />}</button><button onClick={fullscreen} aria-label="Toggle fullscreen"><Expand /></button></>}</div>
  </header>
  {(state.phase === "loading" || state.phase === "ready" || state.phase === "error") && <section className="eco-game-start">
   <div className="eco-game-eyebrow"><span /> ONE TRUCK. A WHOLE CITY OF POSSIBILITY.</div>
   <h1>A little drive.<br /><em>A big difference.</em></h1>
   <p>Take the wheel. Explore nine neighbourhoods. Find six types of waste. Explore golden trail gates, discover sorting stops and bring this little city to life.</p>
   <div className="eco-game-start-stats"><span><b>800 m</b>city to explore</span><span><b>12</b>target pickups</span><span><b>05:00</b>on the clock</span></div>
   {state.phase === "error" ? <div className="eco-game-error" role="alert"><p>{state.message}</p><button className="eco-game-primary" onClick={() => location.reload()}>Try again <RotateCcw size={18} /></button></div> : <button className="eco-game-primary" disabled={state.phase === "loading"||starting} onClick={()=>void startRound()}>{state.phase === "loading"||starting ? <><span className="eco-game-spinner" /> Loading your city…</> : <>Let’s clean this city <ArrowRight size={22} /></>}</button>}
   <div className="eco-game-keyguide"><span><kbd>W A S D</kbd> or arrows to drive</span><span><kbd>E</kbd> collect</span><span><kbd>Space</kbd> brake</span><span><kbd>F</kbd> full screen</span><span><kbd>Mouse</kbd> look around</span></div>
   <p className="eco-game-touch-guide">Steer with your left thumb. Hold GO to drive. Swipe the world to look around.</p>
   <small className="eco-game-local-note">Your pass: {time(accessSeconds)} remaining. Scores do not affect Discovery Points.</small>
  </section>}
  {active && <>
   <Speedometer speed={state.speed} reverse={state.reverse}/>
   {state.camera===1&&<div className="eco-game-windshield" aria-hidden="true"/>}
   <div className="eco-game-hud" aria-label="Round progress">
    <span className={state.seconds < 30 ? "eco-game-time-low" : ""}><Clock3 size={16} /><strong>{time(state.seconds)}</strong></span>
    <span><strong>{state.score.toLocaleString()}</strong><small>pts</small></span>
    <button onClick={toggleMap} aria-label={`Collection progress: ${state.collected.length} of ${TOTAL_TARGET}. Open map`} title="Collection list (M)"><Check size={16} /><strong>{state.collected.length}<small>/{TOTAL_TARGET}</small></strong></button>
   </div>
   {(state.nearest||stationAction) && <div className={`eco-game-pickup${nearPickup||stationAction ? " is-near" : ""}`}>
    {nearPickup||stationAction ? <button disabled={!interactionReady || state.phase !== "playing"} onClick={() => engine.current?.collect()}><kbd>E</kbd>{!interactionReady ? "Brake to interact" : stationAction ? "Check cargo · +10s" : `Collect ${WASTE[state.nearest!.wasteType].label.toLowerCase()}`}</button> : <span><i style={{ background: WASTE[state.nearest!.wasteType].color }} />{WASTE[state.nearest!.wasteType].label}<b>{Math.round(state.distance)} m</b></span>}
   </div>}
   {notice && <div className="eco-game-notice" role="status">{state.message}</div>}
   <aside className="eco-game-minimap"><button onClick={toggleMap} aria-label="Open city map"><CityMap state={state} data={data} /><span className="eco-game-compass" aria-hidden="true">N</span></button><span>{state.district} <kbd>M</kbd></span></aside>
   <MobileControls enabled={state.phase==="playing"&&!mapOpen} onDrive={touchDrive} onCollect={()=>engine.current?.collect()} actionLabel={stationAction?"Check cargo · +10s":undefined} nearby={nearPickup||stationAction} collectionReady={interactionReady} item={state.nearest?WASTE[state.nearest!.wasteType].label:"waste"}/>

  </>}
  {state.phase === "paused" && !mapOpen && <div className="eco-game-modal"><section className="eco-game-pause"><span className="eco-game-eyebrow">TAKE A BREATHER</span><h2>Your city can wait.</h2><p>Round paused. Golden gates add up to 5 seconds once; sorting stops check your cargo. Your access pass has {time(accessSeconds)} left.</p><div className="eco-game-pause-cargo" aria-label="Collection list">{WASTE_TYPES.map(t => <span key={t}><i style={{ background: WASTE[t].color }} />{WASTE[t].label}<b>{state.cargo[t]}/{WASTE[t].target}</b></span>)}</div><button className="eco-game-primary" onClick={() => engine.current?.togglePause()}><Play size={20} /> Back to the city</button><button className="eco-game-secondary" onClick={toggleMap}><Map size={18} /> Explore the map</button><button className="eco-game-secondary" onClick={() => engine.current?.endRound()}><Trophy size={18} /> Finish this round</button><button className="eco-game-camera-setting" onClick={()=>engine.current?.toggleCamera()}><Orbit size={18}/><span>Camera: {["Third person","First person","360° free look"][state.camera]}</span><kbd>C</kbd></button><button className="eco-game-camera-setting" onClick={()=>engine.current?.freeCamera()}><Orbit size={18}/>360° free-look camera <kbd>V</kbd></button><div className="eco-game-pause-settings"><button onClick={() => engine.current?.toggleSound()} aria-label={state.sound ? "Mute sound" : "Enable sound"}>{state.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}{state.sound ? "Sound on" : "Sound off"}</button><button onClick={fullscreen}><Expand size={17} />Fullscreen</button></div><button className="eco-game-secondary" onClick={onSignOut}>Sign out of this account</button><p className="eco-mobile-help">Left thumb: steer · GO: accelerate · hold brake to stop<br/>Hold reverse to back up. Swipe the world to look around.</p><p className="eco-game-hint">WASD / arrows: drive · E: collect / sorting stop · Space: brake<br />M: map · C: first / third person · V: free look · R: rescue · F: full screen · P: pause<br/>Touch: steer with left pad · hold GO · brake to collect · swipe world to look<br/>360° camera: move cursor to look · J/L orbit · I/K tilt · +/− zoom</p></section></div>}
  {mapOpen && <div className="eco-game-modal"><section className="eco-game-map-panel"><header><div><span className="eco-game-eyebrow">PLAN YOUR NEXT TURN</span><h2>Your city, at a glance.</h2></div><button onClick={toggleMap} aria-label="Close map"><X /></button></header><div className="eco-game-large-map"><CityMap state={state} data={data} large /></div><footer>{WASTE_TYPES.map(t => <span key={t}><i style={{ background: WASTE[t].color }} />{WASTE[t].label}<b>{state.cargo[t]}/{WASTE[t].target}</b></span>)}</footer><p>Gold rings: drive-through exploration gates (+5s once). Trail explored: {state.landmarks?.length||0}/6. Cyan squares: sorting stops (+10s once after collecting waste). The clock is paused. White arrow: your truck. White ring: nearest needed pickup. Press M to return.</p></section></div>}
  {state.phase === "finished" && <div className={`eco-game-finish${emailOpen ? " has-email" : ""}`}><section className="eco-game-result"><div className="eco-game-result-icon"><Trophy size={34} /></div><span className="eco-game-eyebrow">{done ? "ALL SIX TYPES. MISSION COMPLETE." : "YOUR ROUND, YOUR IMPACT."}</span><h1>{done ? <>City. Cleaned.<br /><em>Nicely driven.</em></> : <>Good drive.<br /><em>Cleaner streets.</em></>}</h1><p>{done ? "You found every type on your list. Your time bonus is included below." : "Every pickup counted. Take another round and complete the collection."}</p><div className="eco-game-final-score">{state.score.toLocaleString()}<span>COLLECTION SCORE</span></div><div className="eco-game-result-stats"><span><b>{state.collected.length}/{TOTAL_TARGET}</b>pickups</span><span><b>{time(state.seconds)}</b>time left</span><span><b>{best.toLocaleString()}</b>local best</span></div><div className="eco-game-result-cargo">{WASTE_TYPES.map(t => <span key={t}><i style={{ background: WASTE[t].color }} />{WASTE[t].label}<b>{state.cargo[t]}</b></span>)}</div><div className="eco-game-result-actions"><button className="eco-game-primary" onClick={saveStory} disabled={saving}><Download size={20} />{saving ? "Making your card…" : "Save my story card"}</button><button className="eco-game-secondary" disabled={starting} onClick={() => { setShareMessage(""); setEmailOpen(false);setEmail("");setEmailStatus("");void startRound(); }}><RotateCcw size={18} /> One more round</button><button className="eco-game-email-toggle" onClick={()=>setEmailOpen(v=>!v)} aria-expanded={emailOpen}><Mail size={18}/>Email my result</button></div>{emailOpen && <form className="eco-game-email" onSubmit={emailResult}><label htmlFor="game-result-email">Send your score and story card</label><div><input id="game-result-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" disabled={emailBusy}/><button type="submit" disabled={emailBusy}>{emailBusy?"Sending…":"Send email"}</button></div><p role="status">{emailStatus||"One result email. No account needed."}</p></form>}<p className="eco-game-share-note" role="status">{shareMessage || "A portrait score card, ready for your story. Game points are separate from Discovery Points."}</p></section></div>}
 </main>;
}
