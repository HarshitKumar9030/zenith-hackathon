import test from 'node:test';
import assert from 'node:assert/strict';
import {scanFeedbackSchema,stationFeedbackSchema,feedbackAvailable} from './scan-feedback';
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

test('station reviews require a visitor name and allow a blank, phone or email contact',()=>{
 const base={stars:5,ticket:'a'.repeat(64),name:'  Visitor  '};
 assert.equal(stationFeedbackSchema.parse(base).name,'Visitor');
 for(const contact of ['', 'person@example.com','+91 98765 43210','(987) 654-3210'])assert(stationFeedbackSchema.safeParse({...base,contact}).success);
 for(const contact of ['not a contact','person@','123'])assert.equal(stationFeedbackSchema.safeParse({...base,contact}).success,false);
 for(const name of ['', '  ','a'.repeat(81),'Visitor\nInjected'])assert.equal(stationFeedbackSchema.safeParse({...base,name}).success,false);
 assert.equal(stationFeedbackSchema.safeParse({...base,userId:'operator'}).success,false);
 assert.equal(stationFeedbackSchema.safeParse({...base,ticket:'invented'}).success,false);
});
