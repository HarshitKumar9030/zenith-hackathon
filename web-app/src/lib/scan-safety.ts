import type {Identification} from './rules';
type Item={name:string;classification?:'waste'|'not_waste'|'uncertain'};
export function isPerson(item:Item){return !/\bface mask\b/i.test(item.name)&&/\b(person|people|human|man|woman|child|boy|girl|baby|face|selfie)\b/i.test(item.name);}
export function selectableWaste(item:Item){return !isPerson(item)&&item.classification!=='not_waste';}
export function safeIdentification(value:Identification):Identification {
 const items=(value.detected_items||[]).filter(item=>!isPerson(item)).slice(0,16).map(item=>({...item,classification:item.classification||"uncertain" as const}));
 return {...value,detected_items:items,object_name:items.length?items.map(i=>i.name).join(', ').slice(0,200):'No waste identified',clarification_question:!items.some(selectableWaste)?'No waste was identified. Show the waste clearly or describe what you want collected.':value.clarification_question};
}
