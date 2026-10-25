"use client";
import {useEffect,useRef,useState} from "react";
import {LocateFixed,MapPin,RotateCcw} from "lucide-react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import type {TrackingPoint} from "@/lib/tracking";
import styles from "./pickup-tracking.module.css";
export type Destination={latitude:number;longitude:number;accuracy?:number};
export default function LivePickupMap({point,destination,stale=false}:{point:TrackingPoint;destination?:Destination|null;stale?:boolean}){
 const container=useRef<HTMLDivElement>(null),map=useRef<Leaflet.Map|null>(null),marker=useRef<Leaflet.Marker|null>(null),circle=useRef<Leaflet.Circle|null>(null),home=useRef<Leaflet.CircleMarker|null>(null),tiles=useRef<Leaflet.TileLayer|null>(null);
 const latest=useRef({point,destination}),follow=useRef(true);latest.current={point,destination};
 const [ready,setReady]=useState(false),[following,setFollowing]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
  let cancelled=false,observer:ResizeObserver|undefined;
  void import("leaflet").then(L=>{
   if(cancelled||!container.current)return;
   const {point:p,destination:d}=latest.current;
   const m=L.map(container.current,{scrollWheelZoom:false,zoomControl:true}).setView([p.latitude,p.longitude],15);map.current=m;
   const layer=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(m);tiles.current=layer;
   layer.on("tileerror",()=>{if(!cancelled)setError("Map tiles could not load. The reported location and arrival estimate are still available.")});
   const icon=L.divIcon({className:styles.helperMarker,iconSize:[44,44],iconAnchor:[22,22],html:'<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="20" fill="#28694f" stroke="white" stroke-width="3"/><g fill="none" stroke="white" stroke-width="1.6" stroke-linejoin="round"><path d="M11 16h14v12H11zM25 20h5l4 5v3h-9z"/><circle cx="16" cy="29" r="2.5" fill="#28694f"/><circle cx="30" cy="29" r="2.5" fill="#28694f"/><path d="M15 23c0-4 4-6 7-5 0 4-2 6-5 5m0 0 4-4"/></g></svg>'});
   marker.current=L.marker([p.latitude,p.longitude],{icon,title:"Helper location",alt:"Helper location"}).addTo(m).bindTooltip("Your helper");
   circle.current=L.circle([p.latitude,p.longitude],{radius:p.accuracy,color:"#6d619c",weight:1,fillOpacity:.12}).addTo(m);
   if(d)home.current=L.circleMarker([d.latitude,d.longitude],{radius:7,color:"#fff",weight:3,fillColor:"#8171ba",fillOpacity:1}).addTo(m).bindTooltip("Collection address");
   const bounds=circle.current.getBounds();if(d)bounds.extend([d.latitude,d.longitude]);m.fitBounds(bounds,{padding:[36,36],maxZoom:16,animate:false});
   m.on("dragstart",()=>{follow.current=false;setFollowing(false)});
   observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(container.current);
   setReady(true);
  }).catch(()=>{if(!cancelled)setError("The map could not start. Try reopening it.")});
  return()=>{cancelled=true;observer?.disconnect();map.current?.remove();map.current=null;marker.current=null;circle.current=null;home.current=null;tiles.current=null;};
 },[]);
 useEffect(()=>{
  if(!ready||!map.current)return;
  marker.current?.setLatLng([point.latitude,point.longitude]).setOpacity(stale?.55:1);circle.current?.setLatLng([point.latitude,point.longitude]).setRadius(point.accuracy).setStyle({color:stale?"#8c887c":"#6d619c"});
  if(follow.current)map.current.panTo([point.latitude,point.longitude],{animate:false});
 },[point,stale,ready]);
 useEffect(()=>{
  const m=map.current;if(!ready||!m)return;
  if(!destination){home.current?.remove();home.current=null;return;}
  let cancelled=false;
  void import("leaflet").then(L=>{if(cancelled||map.current!==m)return;if(home.current)home.current.setLatLng([destination.latitude,destination.longitude]);else home.current=L.circleMarker([destination.latitude,destination.longitude],{radius:7,color:"#fff",weight:3,fillColor:"#8171ba",fillOpacity:1}).addTo(m).bindTooltip("Collection address")});
  return()=>{cancelled=true};
 },[destination,ready]);
 const recenter=()=>{follow.current=true;setFollowing(true);const m=map.current;if(!m)return;const bounds=circle.current?.getBounds();if(bounds){if(destination)bounds.extend([destination.latitude,destination.longitude]);m.fitBounds(bounds,{padding:[36,36],maxZoom:16,animate:false})}};
 return <div className={styles.mapWrap}>
  <div className={styles.map} ref={container} role="region" aria-label="Helper location map"/>
  <div className={styles.mapToolbar}><span className={styles.mapLegend}><MapPin size={14}/>{stale?"Last known position":"Helper"}{destination&&<><i/>Collection address</>}</span><button type="button" className={styles.link} onClick={recenter} disabled={!ready}><LocateFixed size={15}/>{following?"Recenter":"Follow helper"}</button></div>
  {error&&<div className={styles.mapError} role="status"><p>{error}</p>{ready&&<button type="button" className={styles.link} onClick={()=>{setError("");tiles.current?.redraw()}}><RotateCcw size={14}/>Retry map tiles</button>}</div>}
  {!ready&&!error&&<p className={styles.note} role="status">Loading map…</p>}
 </div>;
}
