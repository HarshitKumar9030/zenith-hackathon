/** A small procedural motor: no downloaded loops and no audio before a gesture. */
export class EngineAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private motor:GainNode|null=null;
 private filter:BiquadFilterNode|null=null;
 private voices:OscillatorNode[]=[];
 private enabled=true;
 unlock(){
  try{
   if(!this.context){
    const context=this.context=new AudioContext();
    this.master=context.createGain();this.master.gain.value=this.enabled?1:0;this.master.connect(context.destination);
    this.motor=context.createGain();this.motor.gain.value=0;
    this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=280;
    this.motor.connect(this.filter);this.filter.connect(this.master);
    for(const [type,multiplier,volume] of [['triangle',1,.7],['sawtooth',.5,.18],['triangle',2,.10]] as const){
     const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.value=45*multiplier;g.gain.value=volume;o.connect(g);g.connect(this.motor);o.start();this.voices.push(o);
    }
   }
   void this.context.resume().catch(()=>{});
  }catch{ /* Continue silently on devices without audio support. */ }
 }
 setEnabled(enabled:boolean){this.enabled=enabled;if(enabled)this.unlock();if(this.context&&this.master)this.master.gain.setTargetAtTime(enabled?1:0,this.context.currentTime,.04);}
 update(speed:number,throttle:boolean,active:boolean){
  if(!this.context||!this.motor||!this.filter)return;
  const t=this.context.currentTime,ratio=Math.min(Math.abs(speed)/26,1),gear=Math.min(3,Math.floor(ratio*4)),rev=(ratio*4)%1;
  const frequency=active?48+gear*8+rev*34+(throttle?14:0):45;
  this.voices.forEach((o,i)=>o.frequency.setTargetAtTime(frequency*[1,.5,2][i],t,.09));
  this.filter.frequency.setTargetAtTime(220+ratio*380+(throttle?160:0),t,.1);
  this.motor.gain.setTargetAtTime(active&&this.enabled ? .026+ratio*.035+(throttle?.022:0):0,t,.07);
 }
 cue(frequency:number){
  if(!this.enabled)return;this.unlock();if(!this.context||!this.master)return;
  const o=this.context.createOscillator(),g=this.context.createGain(),t=this.context.currentTime;
  o.connect(g);g.connect(this.master);o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*1.5,t+.16);
  g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start();o.stop(t+.3);
 }
 dispose(){for(const o of this.voices){o.stop();o.disconnect();}this.voices=[];void this.context?.close().catch(()=>{});this.context=null;}
}
