import {test} from 'node:test';import assert from 'node:assert/strict';import {wastePropertyLabels,wastePropertiesSchema} from './waste-properties';import {identificationSchema} from './rules';
test('biodegradability and recycling remain independent with explicit uncertainty',()=>{
 assert.deepEqual(wastePropertyLabels({biodegradability:'biodegradable',recyclability:'potentially_recyclable',note:'Clean paper'}),['Recyclable']);
 assert.deepEqual(wastePropertyLabels({biodegradability:'non_biodegradable',recyclability:'potentially_recyclable',note:'Metal can'}),['Recyclable']);
 assert.deepEqual(wastePropertyLabels({biodegradability:'unknown',recyclability:'unknown',note:'Unclear'}),['Separate for sorting']);
 assert.deepEqual(wastePropertyLabels(),['Separate for sorting']);
 assert.equal(wastePropertiesSchema.safeParse({biodegradability:'plastic',recyclability:'yes',note:''}).success,false);
});
test('legacy identifications still parse; group labels survive validation without nested per-item properties',()=>{
 const base={object_name:'Paper',material:'paper',physical_state:'dry',contaminated:'no',mixed_material:false,special_handling:'no',explanation:'Paper',clarification_question:null};
 assert.ok(identificationSchema.safeParse(base).success);
 const properties={biodegradability:'biodegradable',recyclability:'potentially_recyclable',note:'Clean uncoated paper'};
 const parsed=identificationSchema.parse({...base,waste_properties:properties,detected_items:[{name:'Paper',material:'paper',special_handling:'no'}]});
 assert.deepEqual(parsed.waste_properties,properties);assert.equal('waste_properties' in (parsed.detected_items?.[0]??{}),false);
});

test('primary label prioritises special handling and falls back to a sorting action',()=>{
 const recyclable={biodegradability:'non_biodegradable',recyclability:'potentially_recyclable',note:'Battery'} as const;
 assert.deepEqual(wastePropertyLabels(recyclable,{special_handling:'yes'}),['Special collection']);
 assert.deepEqual(wastePropertyLabels(undefined,{material:'food_waste'}),['Biodegradable']);
 assert.deepEqual(wastePropertyLabels(undefined,{material:'composite_or_other'}),['Separate for sorting']);
 assert.deepEqual(wastePropertyLabels({biodegradability:'mixed',recyclability:'unknown',note:'Mixed'}),['Separate for sorting']);
});
