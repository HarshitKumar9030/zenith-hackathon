import {test} from 'node:test';import assert from 'node:assert/strict';
import {startBrowserTracking,TrackingEnded} from './browser-tracking';
const fix=()=>({coords:{latitude:28.6,longitude:77.2,accuracy:12},timestamp:Date.now()}) as GeolocationPosition;
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(){
 const control=new AbortController(),events:{stopped:number;cleared:number;sent:number;ended:number;started:number;messages:string[]}={stopped:0,cleared:0,sent:0,ended:0,started:0,messages:[]};
 let watchError:PositionErrorCallback=()=>{};
 const geo={getCurrentPosition:(ok:PositionCallback)=>ok(fix()),watchPosition:(_ok:PositionCallback,error:PositionErrorCallback)=>{watchError=error;return 7},clearWatch:(id:number)=>{assert.equal(id,7);events.cleared++}} as Geolocation;
 const options={geolocation:geo,signal:control.signal,start:async()=>{events.started++;return {token:'memory-only'}},send:async()=>{events.sent++},heartbeat:async()=>{},stop:async()=>{events.stopped++},onStatus:(m:string)=>events.messages.push(m),onEnd:()=>{events.ended++}};
 return {options,events,control,watchError:(code:number)=>watchError({code} as GeolocationPositionError)};
}
test('sharing sends a fix and releases its watcher and session exactly once',async()=>{const h=harness();const stop=await startBrowserTracking(h.options);await flush();assert.equal(h.events.sent,1);h.control.abort();stop();assert.deepEqual([h.events.cleared,h.events.stopped,h.events.ended],[1,1,1])});
test('denied permission never creates a server session',async()=>{const h=harness();h.options.geolocation.getCurrentPosition=(_ok,error)=>error?.({code:1} as GeolocationPositionError);await assert.rejects(startBrowserTracking(h.options),/Allow location access/);assert.equal(h.events.started,0)});
test('cancelling a pending permission request does not leave a sharing session',async()=>{const h=harness();h.options.geolocation.getCurrentPosition=()=>{};const pending=startBrowserTracking(h.options);h.control.abort();await assert.rejects(pending,/cancelled/);assert.equal(h.events.started,0)});
test('a session returned after navigation is revoked without starting a watcher',async()=>{const h=harness();let release:(value:{token:string})=>void=()=>{};h.options.start=()=>new Promise(resolve=>{release=resolve});const pending=startBrowserTracking(h.options);await flush();h.control.abort();release({token:'late-session'});await pending;assert.equal(h.events.stopped,1);assert.equal(h.events.sent,0)});
test('permission revocation and server session expiry stop live sharing',async()=>{const h=harness();await startBrowserTracking(h.options);h.watchError(1);assert.equal(h.events.cleared,1);assert.equal(h.events.stopped,1);const ended=harness();ended.options.send=async()=>{throw new TrackingEnded('Pickup ended')};await startBrowserTracking(ended.options);await flush();assert.equal(ended.events.ended,1);assert.equal(ended.events.stopped,1)});
