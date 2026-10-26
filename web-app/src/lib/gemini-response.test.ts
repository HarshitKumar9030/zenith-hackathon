import {test} from 'node:test';import assert from 'node:assert/strict';import {z} from 'zod';
import {geminiJsonSchema,identificationFailure} from './gemini-response';import {identificationSchema} from './rules';
test('generation schema omits rejected metadata and length constraints recursively while retaining shape',()=>{
 const original=z.toJSONSchema(identificationSchema),schema=geminiJsonSchema(original);const text=JSON.stringify(schema);
 for(const key of ['$schema','additionalProperties','minLength','maxLength'])assert.ok(!text.includes('"'+key+'"'));
 const items=(schema.properties as Record<string,Record<string,unknown>>).detected_items;
 assert.equal(items.maxItems,16);assert.ok(text.includes('"not_waste"'));assert.ok(text.includes('"required"'));assert.ok(JSON.stringify(original).includes('"maxLength"'));
});
test('provider failures distinguish access, quota, model, schema and outage without echoing secrets',()=>{
 assert.equal(identificationFailure(400,{error:{details:[{reason:'API_KEY_INVALID'}]}}).status,503);
 assert.equal(identificationFailure(429,{}).status,429);
 assert.match(identificationFailure(404,{}).error,/model is unavailable/);
 assert.match(identificationFailure(400,{}).error,/scan format/);
 assert.match(identificationFailure(503,{error:{message:'private-key'}}).error,/temporarily unavailable/);
 assert.ok(!identificationFailure(403,{error:{message:'private-key'}}).error.includes('private-key'));
});

test('environmental scan labels do not reintroduce rejected nested item objects',()=>{
 const schema=geminiJsonSchema(z.toJSONSchema(identificationSchema)) as any;
 assert.ok(schema.properties.waste_properties.properties.biodegradability);
 assert.equal(schema.properties.detected_items.items.properties.waste_properties,undefined);
 assert.equal(schema.properties.detected_items.maxItems,16);
});
