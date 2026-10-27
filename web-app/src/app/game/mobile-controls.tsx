"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ChevronsUp, Hand, Recycle } from "lucide-react";
import { TouchDriveState, steeringFromOffset, type TouchDrive, type TouchPedal } from "@/lib/collection-game-touch";
interface Props {
 enabled: boolean;
 onDrive: (input: TouchDrive) => void;
 onCollect: () => void;
 nearby: boolean;
 collectionReady: boolean;
 item: string;
 actionLabel?: string;
}
export default function MobileControls({enabled,onDrive,onCollect,nearby,collectionReady,item,actionLabel}:Props) {
 const input = useRef(new TouchDriveState());
 const joystickPointer = useRef<number|null>(null);
 const [knob,setKnob] = useState(0),[pressed,setPressed] = useState<Record<string,boolean>>({});
 const clear = () => { input.current.reset();joystickPointer.current=null;setKnob(0);setPressed({});onDrive(input.current.snapshot()); };
 useEffect(() => {
  const stop = () => { input.current.reset();joystickPointer.current=null;setKnob(0);setPressed({});onDrive(input.current.snapshot()); };
  if(!enabled)stop();
  window.addEventListener("blur",stop);document.addEventListener("visibilitychange",stop);
  return () => { window.removeEventListener("blur",stop);document.removeEventListener("visibilitychange",stop);input.current.reset();onDrive(input.current.snapshot()); };
 },[enabled,onDrive]);
 const updateStick = (event:React.PointerEvent<HTMLDivElement>) => {
  const box=event.currentTarget.getBoundingClientRect(),radius=box.width*.34;
  const offset=Math.max(-radius,Math.min(radius,event.clientX-box.left-box.width/2));
  setKnob(offset);input.current.steer(steeringFromOffset(offset,radius));onDrive(input.current.snapshot());
 };
 const releaseStick = (event:React.PointerEvent<HTMLDivElement>) => {
  if(joystickPointer.current!==event.pointerId)return;
  joystickPointer.current=null;setKnob(0);input.current.steer(0);onDrive(input.current.snapshot());
 };
 const pedalProps = (pedal:TouchPedal) => ({
  onPointerDown:(event:React.PointerEvent<HTMLButtonElement>)=>{
   if(!enabled)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
   input.current.press(event.pointerId,pedal);setPressed(p=>({...p,[pedal]:true}));onDrive(input.current.snapshot());
  },
  onPointerUp:(event:React.PointerEvent<HTMLButtonElement>)=>{
   input.current.release(event.pointerId);const snapshot=input.current.snapshot();setPressed({accelerate:snapshot.throttle===1,reverse:snapshot.throttle===-1,brake:snapshot.brake});onDrive(snapshot);
  },
  onPointerCancel:(event:React.PointerEvent<HTMLButtonElement>)=>{
   input.current.release(event.pointerId);const next=input.current.snapshot();setPressed({accelerate:next.throttle===1,reverse:next.throttle===-1,brake:next.brake});onDrive(next);
  },
  onLostPointerCapture:(event:React.PointerEvent<HTMLButtonElement>)=>{
   input.current.release(event.pointerId);const next=input.current.snapshot();setPressed({accelerate:next.throttle===1,reverse:next.throttle===-1,brake:next.brake});onDrive(next);
  },
  onContextMenu:(event:React.MouseEvent)=>event.preventDefault(),
 });
 return <div className="eco-mobile-drive" aria-label="Touch driving controls" inert={!enabled}>
  <div className="eco-mobile-stick-wrap"><div className="eco-mobile-steer" role="slider" tabIndex={0} aria-label="Steer truck" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(input.current.snapshot().steering*100)}
   onPointerDown={event=>{if(!enabled||joystickPointer.current!==null)return;event.preventDefault();joystickPointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);updateStick(event);}}
   onPointerMove={event=>{if(joystickPointer.current===event.pointerId)updateStick(event);}}
   onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}
   onKeyDown={event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();event.stopPropagation();const value=event.key==="ArrowLeft"?-1:1;input.current.steer(value);setKnob(value*32);onDrive(input.current.snapshot());}}}
   onKeyUp={event=>{if(event.key.startsWith("Arrow")){event.stopPropagation();clear();}}} onBlur={()=>{input.current.steer(0);setKnob(0);onDrive(input.current.snapshot());}}>
   <span className="eco-mobile-steer-track"/><span className="eco-mobile-steer-arrows" aria-hidden="true">‹<b>›</b></span><span className="eco-mobile-knob" style={{transform:`translateX(${knob}px)`}}><span/></span>
  </div><span className="eco-mobile-control-label">STEER</span></div>
  <div className="eco-mobile-pedals">
   <button className={`eco-mobile-reverse${pressed.reverse?" is-held":""}`} aria-label="Hold to reverse" {...pedalProps("reverse")}><ArrowDown size={18}/><span>REVERSE</span></button>
   <button className={`eco-mobile-brake${pressed.brake?" is-held":""}`} aria-label="Hold to brake" {...pedalProps("brake")}><Hand size={21}/><span>BRAKE</span></button>
   <button className={`eco-mobile-gas${pressed.accelerate?" is-held":""}`} aria-label="Hold to accelerate" {...pedalProps("accelerate")}><ChevronsUp size={30}/><span>GO</span></button>
  </div>
  {nearby && <button className="eco-mobile-collect" disabled={!collectionReady||!enabled} onClick={onCollect}><Recycle size={19}/><span>{collectionReady?(actionLabel??`Collect ${item.toLowerCase()}`):"Brake to interact"}</span></button>}
 </div>;
}
