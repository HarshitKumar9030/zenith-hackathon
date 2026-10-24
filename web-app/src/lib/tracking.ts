export const TRACKING_SESSION_MS=2*60*60*1000;
export const PAIRING_MS=5*60*1000;
export type TrackingPoint={latitude:number;longitude:number;accuracy:number;timestamp:number};
export function validTrackingPoint(p:TrackingPoint,now=Date.now()){
 return [p.latitude,p.longitude,p.accuracy,p.timestamp].every(Number.isFinite)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180&&p.accuracy>0&&p.accuracy<=10000&&p.timestamp<=now+10000&&p.timestamp>=now-90000;
}
export function trackingQuality(p:TrackingPoint,now=Date.now()){
 const age=Math.max(0,now-p.timestamp);
 return age>30000?'stale':p.accuracy>100?'approximate':'live';
}
export function canReadTracking(viewer:string,owner:string,helper:string){return viewer===owner||viewer===helper;}
/** A distance-based range, not a routed or traffic-aware prediction. */
export function estimateArrival(point:TrackingPoint,destination:{latitude:number;longitude:number}|null,now=Date.now()){
 if(!destination||now-point.timestamp>30000||point.accuracy>100||![destination.latitude,destination.longitude].every(Number.isFinite)||Math.abs(destination.latitude)>90||Math.abs(destination.longitude)>180)return null;
 const rad=(n:number)=>n*Math.PI/180;
 const a=Math.sin(rad(destination.latitude-point.latitude)/2)**2+Math.cos(rad(point.latitude))*Math.cos(rad(destination.latitude))*Math.sin(rad(destination.longitude-point.longitude)/2)**2;
 const km=6371*2*Math.atan2(Math.sqrt(Math.min(1,a)),Math.sqrt(Math.max(0,1-a)));
 return {minMinutes:Math.max(2,Math.ceil(km/25*60)),maxMinutes:Math.max(5,Math.ceil(km/10*60)+5)};
}
