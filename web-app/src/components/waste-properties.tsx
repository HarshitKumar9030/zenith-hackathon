import type {Identification} from '@/lib/rules';
import {wastePropertyLabels} from '@/lib/waste-properties';
export default function WasteProperties({identification}:{identification:Identification}){
 const properties=identification.waste_properties;
 const items=(identification.detected_items??[]).filter(item=>item.classification!=='not_waste'&&item.waste_properties);
 return <section aria-label="Biodegradability and recyclability" style={{background:'#f2f5ec',borderRadius:18,padding:'18px 20px',margin:'18px 0'}}>
   <div className="attribute-row" style={{margin:0}}>{wastePropertyLabels(properties).map(label=><span key={label}>{label}</span>)}</div>
   <p style={{fontSize:12,lineHeight:1.7,margin:'12px 0 0',color:'#7e8c73'}}>{properties?.note||'These properties have not been established for this scan. Scan again after correcting the item.'}</p>
   {items.length>1&&<details style={{marginTop:12}}><summary style={{fontSize:12,cursor:'pointer'}}>View labels for {items.length} items</summary><ul style={{listStyle:'none',padding:0,display:'grid',gap:12}}>{items.map((item,i)=><li key={`${item.name}-${i}`}><strong style={{fontSize:12,fontWeight:550}}>{item.name}</strong><p style={{fontSize:11,lineHeight:1.7,margin:'5px 0'}}>{wastePropertyLabels(item.waste_properties).join(' · ')}<br/>{item.waste_properties?.note}</p></li>)}</ul></details>}
   <small style={{display:'block',fontSize:10,lineHeight:1.7,marginTop:10,color:'#9aa28f'}}>Recyclable describes potential recovery, not guaranteed local acceptance. Special-handling requirements still apply.</small>
 </section>;
}
