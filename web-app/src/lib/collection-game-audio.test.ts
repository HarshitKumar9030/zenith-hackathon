import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EngineAudio} from '../app/game/engine-audio';
class Param {value=0;setTargetAtTime(value:number){assert.ok(Number.isFinite(value));this.value=value;}setValueAtTime(value:number){this.value=value;}exponentialRampToValueAtTime(value:number){this.value=value;}}
class Node {gain=new Param();frequency=new Param();type='';connect(){}disconnect(){}start(){}stop(){}}
class Context {
 static all:Context[]=[];state='suspended';currentTime=0;destination={};resumes=0;fail=false;gains:Node[]=[];
 constructor(){Context.all.push(this);}
 createGain(){const n=new Node();this.gains.push(n);return n;}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}
 async resume(){this.resumes++;if(this.fail)throw new Error('gesture needed');this.state='running';}async close(){this.state='closed';}
}
test('game audio resumes after interruption, keeps mute and disposes its context',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{AudioContext:Context}});
 try{
  const audio=new EngineAudio();audio.unlock();await Promise.resolve();const ctx=Context.all.at(-1)!;
  assert.equal(audio.isRunning(),true);assert.equal(ctx.resumes,1);
  audio.update(20,true,true);assert.ok(ctx.gains[1].gain.value>.1);
  ctx.state='suspended';ctx.fail=true;audio.unlock();await Promise.resolve();assert.equal(audio.isRunning(),false);
  ctx.fail=false;audio.unlock();await Promise.resolve();assert.equal(audio.isRunning(),true);
  audio.setEnabled(false);assert.equal(ctx.gains[0].gain.value,0);audio.update(20,true,true);assert.equal(ctx.gains[1].gain.value,0);
  audio.setEnabled(true);audio.cue(660);assert.equal(ctx.gains[0].gain.value,1);
  audio.dispose();assert.equal(ctx.state,'closed');assert.equal(audio.isRunning(),false);
 }finally{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');}
});
