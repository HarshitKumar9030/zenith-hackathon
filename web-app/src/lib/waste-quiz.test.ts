import {test} from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';import {makeQuiz,gradeQuiz,quizBank,typeOptions,categoryOptions,quizImage} from './waste-quiz';
test('all quiz items have images and an explicit valid answer key',()=>{
 assert.equal(quizBank.length,100);assert.equal(new Set(quizBank.map(q=>q.id)).size,100);
 for(const q of quizBank){assert.ok(existsSync(`public/quiz images/${q.id}`),q.id);assert.ok(q.types.length&&q.types.every(t=>typeOptions.some(o=>o.value===t)),q.id);assert.ok(q.categories.length&&q.categories.every(c=>categoryOptions.some(o=>o.value===c)),q.id);assert.ok(q.explanation);assert.ok(quizImage(q).startsWith('/quiz%20images/'));}
});
test('every random round has 5 easy, 2 medium, 3 hard and no duplicate images',()=>{
 const before=JSON.stringify(quizBank);const combinations=new Set();
 for(let i=0;i<100;i++){const round=makeQuiz();assert.equal(round.length,10);assert.equal(new Set(round.map(q=>q.id)).size,10);for(const [d,n]of Object.entries({easy:5,medium:2,hard:3}))assert.equal(round.filter(q=>q.difficulty===d).length,n);combinations.add(round.map(q=>q.id).join('|'));}
 assert.ok(combinations.size>1);assert.equal(JSON.stringify(quizBank),before);
});
test('two marks per image, partial credit, accepted overlap and unanswered fields',()=>{
 const questions=makeQuiz(()=>.3);const answers=Object.fromEntries(questions.map(q=>[q.id,{type:q.types[0],category:q.categories[0]}]));assert.equal(gradeQuiz(questions,answers).points,20);assert.equal(gradeQuiz(questions,{}).points,0);answers[questions[0].id].category='invalid';const result=gradeQuiz(questions,answers);assert.equal(result.points,19);assert.equal(result.fullyCorrect,9);assert.equal(result.results[0].typeCorrect,true);assert.equal(result.results[0].categoryCorrect,false);
 const paper=quizBank.find(q=>q.id.includes('office paper'))!;assert.equal(gradeQuiz([paper],{[paper.id]:{type:'biodegradable',category:'paper'}}).points,2);assert.equal(gradeQuiz([paper],{[paper.id]:{type:'recyclable',category:'paper'}}).points,2);
});

test('Kahoot-style category choices always contain one accepted answer and three distinct distractors',async()=>{
 const {quizCategoryChoices}=await import('./waste-quiz');
 for(const question of quizBank){const options=quizCategoryChoices(question);assert.equal(options.length,4);assert.equal(new Set(options.map(o=>o.value)).size,4);assert.equal(options.filter(o=>question.categories.includes(o.value)).length,1);}
});

test('type and category answer slots are well distributed and never change the source options',async()=>{
 const {quizTypeChoices,quizCategoryChoices}=await import('./waste-quiz');
 let seed=20261027;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const typeCounts=[0,0,0],categoryCounts=[0,0,0,0],before=JSON.stringify(typeOptions),question=quizBank[0];
 for(let i=0;i<6000;i++){
  const types=quizTypeChoices(random);assert.equal(new Set(types.map(o=>o.value)).size,3);typeCounts[types.findIndex(o=>o.value==='biodegradable')]++;
  const categories=quizCategoryChoices(question,random);categoryCounts[categories.findIndex(o=>question.categories.includes(o.value))]++;
 }
 for(const count of typeCounts)assert(count>1750&&count<2250,JSON.stringify(typeCounts));
 for(const count of categoryCounts)assert(count>1250&&count<1750,JSON.stringify(categoryCounts));
 assert.equal(JSON.stringify(typeOptions),before);
});
test('a photo shares one ten-second deadline across both prompts, including background time',async()=>{
 const {quizSecondsRemaining}=await import('./waste-quiz'),deadline=10000;
 assert.equal(quizSecondsRemaining(deadline,0),10);
 assert.equal(quizSecondsRemaining(deadline,3100),7);
 assert.equal(quizSecondsRemaining(deadline,4200),6);
 assert.equal(quizSecondsRemaining(deadline,9999),1);
 assert.equal(quizSecondsRemaining(deadline,10000),0);
 assert.equal(quizSecondsRemaining(deadline,30000),0);
});
