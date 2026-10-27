import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { gameResultSchema,gameResultAttachment,resultSummary } from './game-result-email';
import { emptyCargo } from './collection-game-rules';
test('email results reject extra score fields, invalid addresses and inflated counts',()=>{
 const input={email:'player@example.com',cargo:emptyCargo(),remainingSeconds:120};
 assert.equal(gameResultSchema.safeParse(input).success,true);
 assert.equal(gameResultSchema.safeParse({...input,score:999999}).success,false);
 assert.equal(gameResultSchema.safeParse({...input,email:'bad\r\nBcc: nope@example.com'}).success,false);
 assert.equal(gameResultSchema.safeParse({...input,cargo:{...input.cargo,organic:4}}).success,false);
 assert.equal(gameResultSchema.safeParse({...input,remainingSeconds:301}).success,false);
});
test('email score is recomputed with a time bonus only for complete rounds',()=>{
 const input={email:'player@example.com',cargo:{...emptyCargo(),paper:1},remainingSeconds:120};
 assert.deepEqual(resultSummary(input),{count:1,complete:false,score:100});
 const complete={...input,cargo:{organic:3,plastic:3,paper:2,metal:1,glass:2,ewaste:1}};
 assert.deepEqual(resultSummary(complete),{count:12,complete:true,score:2050});
});
test('email attachment is a real portrait PNG',async()=>{
 const image=await gameResultAttachment({email:'player@example.com',cargo:emptyCargo(),remainingSeconds:0});
 const info=await sharp(image).metadata();assert.equal(info.format,'png');assert.equal(info.width,1080);assert.equal(info.height,1920);
});
