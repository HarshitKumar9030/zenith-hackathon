import {GOVERNMENT_PROGRAMMES} from '@/lib/government-programmes';
import styles from './government-programmes.module.css';

export default function GovernmentProgrammes({compact=false}:{compact?:boolean}){
 const programmes=compact?GOVERNMENT_PROGRAMMES.slice(0,2):GOVERNMENT_PROGRAMMES;
 return <section id="government-programmes" className={styles.section} aria-labelledby="programmes-heading">
  <p className={styles.eyebrow}>Public programmes · Clear eligibility</p>
  <h2 id="programmes-heading" className={styles.heading}>Where public programmes fit</h2>
  <p className={styles.intro}>Organic processing, safer collection work and better local waste services. These programmes inform our proposed partnerships; participation and funding require official approval.</p>
  <div className={styles.grid}>{programmes.map(programme=><article key={programme.id} className={styles.card}>
   <span className={styles.status}>{programme.status}</span>
   <h3>{programme.name}</h3><p className={styles.authority}>{programme.authority}</p>
   <p>{programme.summary}</p><p>{programme.relevance}</p>
   <details className={styles.details}><summary>Eligibility and status</summary><p>{programme.requirement}</p></details>
   <a className={styles.source} href={programme.source} target="_blank" rel="noopener noreferrer">{programme.sourceLabel} <span aria-hidden="true">↗</span></a>
  </article>)}</div>
  <div className={styles.policy}>
   <h3>Benefits recorded, not assumed</h3>
   <p>Our policy allocates 50% of support actually received and attributable to an eligible completed organic collection to the resident as a recorded credit. This is a Waste Right policy, not a government-mandated rate. A scan or pickup alone does not create a subsidy.</p>
   {compact?<a className={styles.link} href="/government-programmes">All five programmes, eligibility and sources <span aria-hidden="true">→</span></a>:<p>Government collaboration remains proposed/applying. No executed public partnership or award is documented. A PPP needs a signed public-authority agreement; our participation certificate is independently issued by Waste Right. DigiLocker access is not connected.</p>}
  </div>
  <small>Sources checked 24 October 2026. Confirm current terms with the implementing authority before applying.</small>
 </section>;
}
