"use client";
import {speedNeedleAngle} from '@/lib/collection-game-camera';
export default function Speedometer({speed,reverse=false}:{speed:number;reverse?:boolean}){
 const angle=speedNeedleAngle(speed),value=Math.max(0,Math.round(speed));
 return <div className="eco-game-speedometer" role="meter" aria-label="Vehicle speed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(value,100)} aria-valuetext={value+' kilometres per hour'+(reverse?', reversing':'')}>
  <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="#173c30" fillOpacity=".92"/><path d="M26 94 A48 48 0 1 1 94 94" fill="none" stroke="#adc8a1" strokeWidth="1.2" opacity=".3"/>
   {Array.from({length:21},(_,i)=><g key={i} transform={'rotate('+(-135+i*13.5)+' 60 60)'}><path d={i%4===0?'M60 14V22':'M60 15V19'} stroke={i>=18?'#edbd7d':'#c5dfb8'} strokeWidth={i%4===0?1.7:.8}/></g>)}
   {[0,20,40,60,80,100].map((n,i)=>{const a=(-135+i*54)*Math.PI/180;return <text key={n} x={60+Math.sin(a)*33} y={63-Math.cos(a)*33} fill="#c5d6c0" fontSize="7" textAnchor="middle">{n}</text>;})}
   <g className="eco-game-speed-needle" style={{transform:'rotate('+angle+'deg)'}}><path d="M58.6 62L60 23L61.4 62Z" fill="#c6ef8a"/><path d="M59 62H61V69H59Z" fill="#c6ef8a"/></g><circle cx="60" cy="60" r="4" fill="#c6ef8a"/><circle cx="60" cy="60" r="1.8" fill="#193a2b"/>
   <text x="60" y="89" fill="#fffbe9" fontSize="18" fontWeight="600" textAnchor="middle">{value}</text><text x="60" y="101" fill="#a6be9e" fontSize="6.5" textAnchor="middle" letterSpacing="1.4">KM/H</text><text x="60" y="45" fill={reverse?'#f5cc8b':'#b4d0a7'} fontSize="8" fontWeight="600" textAnchor="middle">{reverse?'R':value?'D':'N'}</text>
  </svg>
 </div>;
}
