import {z} from 'zod';
export const wastePropertiesSchema=z.object({
 biodegradability:z.enum(['biodegradable','non_biodegradable','mixed','unknown']),
 recyclability:z.enum(['potentially_recyclable','not_recyclable','unknown']),
 note:z.string().max(300),
});
export type WasteProperties=z.infer<typeof wastePropertiesSchema>;
/** One primary label; unresolved evidence produces an action, never a guessed property. */
export function wastePropertyLabels(value?:WasteProperties,context?:{material?:string;special_handling?:string}){
 if(context?.special_handling==='yes')return ['Special collection'];
 if(value?.recyclability==='potentially_recyclable')return ['Recyclable'];
 if(value?.biodegradability==='biodegradable')return ['Biodegradable'];
 if(value?.biodegradability==='non_biodegradable')return ['Non-biodegradable'];
 if(['food_waste','garden_waste'].includes(context?.material??''))return ['Biodegradable'];
 return ['Separate for sorting'];
}
