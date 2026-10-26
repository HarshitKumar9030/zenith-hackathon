import type {Metadata} from 'next';
import GovernmentProgrammes from '@/components/government-programmes';
import styles from '@/components/government-programmes.module.css';
export const metadata:Metadata={title:'Government programmes | EcoMitra',description:'Official sources, eligibility and the status of government programmes relevant to EcoMitra.'};
export default function ProgrammesPage(){return <div className={styles.page}>
 <nav className={styles.nav} aria-label="Programme page navigation"><a href="/">← EcoMitra</a><a href="/app">Open app →</a></nav>
 <main><GovernmentProgrammes/></main>
 </div>}
