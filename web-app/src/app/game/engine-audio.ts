/** A small procedural motor: no downloaded loops and no audio before a gesture. */
export class EngineAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private motor:GainNode|null=null;
 private filter:BiquadFilterNode|null=null;
 private voices:OscillatorNode[]=[];
 private enabled=true;
 isRunning(){return this.context?.state==="running";}
 unlock(){
  try{
   if(!this.context||this.context.state==="closed"){
    const Audio=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Audio)return;
    const context=this.context=new Audio();
    this.master=context.createGain();this.master.gain.value=this.enabled?1:0;this.master.connect(context.destination);
    this.motor=context.createGain();this.motor.gain.value=0;
    this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=650;
    this.motor.connect(this.filter);this.filter.connect(this.master);
    for(const [type,multiplier,volume] of [['triangle',1,.5],['sawtooth',.5,.15],['triangle',2,.22],['triangle',4,.13]] as const){
     const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.value=45*multiplier;g.gain.value=volume;o.connect(g);g.connect(this.motor);o.start();this.voices.push(o);
    }
   }
   if(this.context.state!=="running")void this.context.resume().catch(()=>{});
  }catch{ /* Continue silently on devices without audio support. */ }
 }
 setEnabled(enabled:boolean){this.enabled=enabled;if(enabled)this.unlock();if(this.context&&this.master)this.master.gain.setTargetAtTime(enabled?1:0,this.context.currentTime,.04);}
 update(speed:number,throttle:boolean,active:boolean){
  if(!this.context||!this.motor||!this.filter)return;
  const t=this.context.currentTime,ratio=Math.min(Math.abs(speed)/26,1),gear=Math.min(3,Math.floor(ratio*4)),rev=(ratio*4)%1;
  const frequency=active?65+gear*12+rev*40+(throttle?18:0):65;
  this.voices.forEach((o,i)=>o.frequency.setTargetAtTime(frequency*[1,.5,2,4][i],t,.09));
  this.filter.frequency.setTargetAtTime(550+ratio*800+(throttle?300:0),t,.1);
  this.motor.gain.setTargetAtTime(active&&this.enabled ? .11+ratio*.09+(throttle?.07:0):0,t,.07);
 }
 cue(frequency:number){
  if(!this.enabled)return;this.unlock();if(!this.context||!this.master)return;
  const o=this.context.createOscillator(),g=this.context.createGain(),t=this.context.currentTime;
  o.connect(g);g.connect(this.master);o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*1.5,t+.16);
  g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.start();o.stop(t+.3);
 }
 dispose(){for(const o of this.voices){o.stop();o.disconnect();}this.voices=[];void this.context?.close().catch(()=>{});this.context=null;}
}
