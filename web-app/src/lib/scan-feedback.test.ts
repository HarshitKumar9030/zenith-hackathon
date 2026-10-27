import test from 'node:test';
import assert from 'node:assert/strict';
import {scanFeedbackSchema,feedbackAvailable} from './scan-feedback';
test('scan ratings require an integer from one to five and bounded optional comments',()=>{
 for(let stars=1;stars<=5;stars++)assert.equal(scanFeedbackSchema.parse({stars}).stars,stars);
 assert.equal(scanFeedbackSchema.parse({stars:5,comment:'  Easy to use.  '}).comment,'Easy to use.');
 assert.equal(scanFeedbackSchema.parse({stars:3}).comment,'');
 for(const stars of [0,6,1.5,'5',null,undefined])assert.equal(scanFeedbackSchema.safeParse({stars}).success,false);
 assert.equal(scanFeedbackSchema.safeParse({stars:5,comment:'a'.repeat(1001)}).success,false);
 assert.equal(scanFeedbackSchema.safeParse({stars:5,userId:'somebody-else'}).success,false);
});
test('feedback only appears after a successful scan and stops after submission or dismissal',()=>{
 assert.equal(feedbackAvailable({},false),false);
 assert.equal(feedbackAvailable({scanFeedbackEligibleAt:new Date()},false),true);
 assert.equal(feedbackAvailable({scanFeedbackEligibleAt:new Date()},true),false);
 assert.equal(feedbackAvailable({scanFeedbackEligibleAt:new Date(),scanFeedbackDismissedAt:new Date()},false),false);
});
