import type {Identification} from '@/lib/rules';
import {wastePropertyLabels} from '@/lib/waste-properties';
export default function WasteProperties({identification}:{identification:Identification}){
 const properties=identification.waste_properties;
 const labels=wastePropertyLabels(properties,identification);
 const instructions:Record<string,string>={
  'Biodegradable':'Keep this item separate from dry waste.',
  'Non-biodegradable':'Keep this item out of compost and organic waste.',
  'Recyclable':'Keep this item with your dry recyclables.',
  'Special collection':'Keep this item separate for a helper approved for special pickups.',
  'Separate for sorting':'Keep this item separate. Your helper will sort it at collection.',
 };
 return <section aria-label="Biodegradability and recyclability" style={{background:'#f2f5ec',borderRadius:18,padding:'18px 20px',margin:'18px 0'}}>
   <div className="attribute-row" style={{margin:0}}>{labels.map(label=><span key={label}>{label}</span>)}</div>
   <p style={{fontSize:12,lineHeight:1.7,margin:'12px 0 0',color:'#7e8c73'}}>{instructions[labels[0]]}</p>
   <small style={{display:'block',fontSize:10,lineHeight:1.7,marginTop:10,color:'#9aa28f'}}>Your helper confirms the final sorting at collection.</small>
 </section>;
}
