import type {TrackingPoint} from './tracking';
/** Foreground-only location sharing. Dependencies are injectable for device-free tests. */
export async function startBrowserTracking(options:{
 geolocation:Geolocation;
 start:()=>Promise<{token:string}>;
 send:(point:TrackingPoint,token:string)=>Promise<void>;
 heartbeat:(token:string)=>Promise<void>;
 stop:(token:string)=>Promise<void>;
 onStatus:(message:string)=>void;
 onEnd:()=>void;
 signal:AbortSignal;
}){
 const {geolocation,signal}=options;
 const first=await new Promise<GeolocationPosition>((resolve,reject)=>{
  if(signal.aborted){reject(new Error('Location sharing cancelled.'));return;}
  const abort=()=>{signal.removeEventListener('abort',abort);reject(new Error('Location sharing cancelled.'))};
  signal.addEventListener('abort',abort,{once:true});
  geolocation.getCurrentPosition(p=>{signal.removeEventListener('abort',abort);resolve(p)},e=>{signal.removeEventListener('abort',abort);reject(new Error(e.code===1?'Allow location access to share your position.':'Could not get a location. Check your device location settings and try again.'))},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 });
 if(signal.aborted)return ()=>{};
 const session=await options.start();
 if(signal.aborted){await options.stop(session.token).catch(()=>{});return ()=>{}};
 let ended=false,watch:number|undefined,heartbeat:ReturnType<typeof setInterval>|undefined,uploading=false,lastSent=-Infinity;
 const stop=()=>{
  if(ended)return;ended=true;
  if(watch!==undefined)geolocation.clearWatch(watch);
  if(heartbeat)clearInterval(heartbeat);
  signal.removeEventListener('abort',stop);
  void options.stop(session.token).catch(()=>{});options.onEnd();
 };
 const fail=(e:unknown)=>{
  if(ended)return;
  if(e instanceof TrackingEnded){options.onStatus(e.message);stop()}
  else options.onStatus('Connection interrupted. Your resident sees the last reported location.');
 };
 const upload=(p:GeolocationPosition)=>{
  const now=Date.now();
  if(ended||uploading||now-lastSent<5000||now-p.timestamp>30000||p.timestamp>now+10000||!Number.isFinite(p.coords.accuracy)||p.coords.accuracy<=0)return;
  uploading=true;lastSent=now;
  void options.send({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp},session.token)
   .then(()=>{if(!ended)options.onStatus('Sharing location with this resident.')}).catch(fail).finally(()=>{uploading=false});
 };
 signal.addEventListener('abort',stop,{once:true});
 try{
  upload(first);
  watch=geolocation.watchPosition(upload,e=>{if(ended)return;if(e.code===1){options.onStatus('Location permission was removed.');stop()}else options.onStatus('Waiting for a fresh GPS fix. Your previous position may be stale.')},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  heartbeat=setInterval(()=>{if(!ended)void options.heartbeat(session.token).catch(fail)},15000);
 }catch(e){stop();throw e}
 return stop;
}
export class TrackingEnded extends Error{}
