import {z} from 'zod';
export const wastePropertiesSchema=z.object({
 biodegradability:z.enum(['biodegradable','non_biodegradable','mixed','unknown']),
 recyclability:z.enum(['potentially_recyclable','not_recyclable','unknown']),
 note:z.string().max(300),
});
export type WasteProperties=z.infer<typeof wastePropertiesSchema>;
export function wastePropertyLabels(value?:WasteProperties){
 if(!value)return ['Classification needs a new scan'];
 const labels=[{biodegradable:'Biodegradable',non_biodegradable:'Non-biodegradable',mixed:'Mixed biodegradability',unknown:'Biodegradability unclear'}[value.biodegradability]];
 if(value.recyclability==='potentially_recyclable')labels.push('Recyclable · check locally');
 else if(value.recyclability==='not_recyclable')labels.push('Not suitable for ordinary recycling');
 else labels.push('Recyclability unclear');
 return labels;
}
