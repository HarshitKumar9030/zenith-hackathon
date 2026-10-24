"use client";
import {useId,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion';
import {ArrowRight,ArrowUpRight,Leaf,ShieldCheck} from 'lucide-react';
import {GOVERNMENT_PROGRAMMES} from '@/lib/government-programmes';
import styles from './landing-programmes-showcase.module.css';

const chapters=[
 {title:'Organic processing',caption:'GOBARdhan · MDA',icon:Leaf,ids:['gobardhan','mda'],color:'green'},
 {title:'Safer collection work',caption:'NAMASTE',icon:ShieldCheck,ids:['namaste'],color:'violet'},
] as const;

function Journey({active}:{active:number}){return <svg className={styles.journey} viewBox="0 0 600 170" fill="none" aria-hidden="true">
 <path className={styles.route} d="M139 107H212M345 121H459" stroke="currentColor" strokeWidth="2" strokeDasharray="5 8"/>
 <g opacity={active===2?1:.5}><path d="m40 81 42-32 42 32v57H40V81Z" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M72 138v-32h22v32M53 84h14v15H53V84Zm48 0h12v15h-12V84Z" stroke="currentColor" strokeWidth="2"/></g>
 <g opacity={active===1?1:.6}><path d="M228 79h66v47h-66V79Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="2"/><path d="M294 94h20l15 16v16h-35V94Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="246" cy="130" r="9" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2"/><circle cx="312" cy="130" r="9" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2"/><path d="m247 100 8 8 18-19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></g>
 <g opacity={active===0?1:.5}><path d="M474 138V80l36 17V80l37 17v41h-73ZM487 86V48h15v45" fill="currentColor" fillOpacity=".1" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M487 116h10m13 0h10m13 0h5" stroke="currentColor" strokeWidth="5"/><path className={styles.leaf} d="M511 55c-1-23 18-31 35-25-1 20-15 31-35 25Z" fill="currentColor" fillOpacity=".3" stroke="currentColor" strokeWidth="2"/><path d="m511 64 21-25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></g>
 </svg>}

export default function LandingProgrammesShowcase(){
 const [selected,setSelected]=useState(0),reduced=useReducedMotion(),id=useId();
 const tabs=useRef<(HTMLButtonElement|null)[]>([]);
 const chapter=chapters[selected];
 const items=chapter.ids.map(value=>GOVERNMENT_PROGRAMMES.find(p=>p.id===value)!);
 const primary=items[0],related=items[1];
 return <section id="government-programmes" className={styles.section} aria-labelledby={`${id}-heading`}>
  <div className={styles.header}>
   <div><p className={styles.eyebrow}>The public programme connection</p><h2 id={`${id}-heading`}>Your doorstep.<br/>The next destination.</h2></div>
   <p>Explore where government programmes fit into our proposed collection and processing partnerships.</p>
  </div>
  <div className={styles.explorer}>
   <div className={styles.chapters} role="tablist" aria-label="Explore government programmes" aria-orientation="vertical">
    {chapters.map((item,index)=>{const Icon=item.icon;return <button type="button" key={item.title} ref={node=>{tabs.current[index]=node}} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected===index} tabIndex={selected===index?0:-1} className={`${styles.tab} ${selected===index?styles.active:''}`} onClick={()=>setSelected(index)} onKeyDown={event=>{
     let next=index;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%chapters.length;else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+chapters.length-1)%chapters.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=chapters.length-1;else return;event.preventDefault();setSelected(next);tabs.current[next]?.focus();
    }}>
     <span className={styles.icon}><Icon size={21} strokeWidth={1.6}/></span>
     <span className={styles.tabCopy}><strong>{item.title}</strong><small>{item.caption}</small></span>
     <ArrowRight className={styles.tabArrow} size={17}/>
    </button>})}
    <div className={styles.legend}><span/> Partnership proposed / applying</div>
   </div>
   <AnimatePresence mode="wait" initial={false}>
    <motion.div key={selected} className={`${styles.panel} ${styles[chapter.color]}`} role="tabpanel" id={`${id}-panel-${selected}`} aria-labelledby={`${id}-tab-${selected}`} tabIndex={0} initial={{opacity:0,y:reduced?0:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-6}} transition={{duration:reduced?0:.2}}>
     <div className={styles.feature}>
      <div className={styles.featureTop}><span>{primary.status}</span><span className={styles.index}>0{selected+1} / {String(chapters.length).padStart(2,'0')}</span></div>
      <Journey active={selected}/>
      <h3>{primary.name}</h3><p className={styles.authority}>{primary.authority}</p>
      <p className={styles.summary}>{primary.summary}</p>
      <p className={styles.relevance}>{primary.relevance}</p>
      <a href={primary.source} target="_blank" rel="noopener noreferrer" className={styles.source}>Read the official programme <ArrowUpRight size={17}/></a>
     </div>
     {related?<div className={styles.related}>
      <div><span className={styles.relatedStatus}>{related.status}</span><h4>{related.name}</h4><p>{related.summary}</p><p className={styles.requirement}>{related.requirement}</p></div>
      <a href={related.source} target="_blank" rel="noopener noreferrer" aria-label={`Official source for ${related.name}`}><ArrowUpRight size={22}/></a>
     </div>:<div className={styles.related}><div><span className={styles.relatedStatus}>For eligible helpers</span><h4>Recognition starts with validation</h4><p>{primary.requirement}</p></div><ShieldCheck size={30} strokeWidth={1.4}/></div>}
    </motion.div>
   </AnimatePresence>
  </div>
  <div className={styles.bottom}><p>No Waste Right grant or public partnership is documented. Eligibility and current scheme terms require confirmation.</p><a href="/government-programmes">All programmes &amp; benefit policy <ArrowRight size={18}/></a></div>
 </section>
}
