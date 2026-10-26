import rawBank from './quiz-bank.json';
export type WasteType='biodegradable'|'non_biodegradable'|'recyclable';
export type QuizItem={id:string;name:string;difficulty:string;types:string[];categories:string[];explanation:string};
export type QuizAnswer={type:string;category:string};
export const quizBank:QuizItem[]=rawBank;
export const typeOptions=[{value:'biodegradable',label:'Biodegradable'},{value:'non_biodegradable',label:'Non-biodegradable'},{value:'recyclable',label:'Recyclable'}];
export const categoryOptions=[['plastic','Plastic'],['paper','Paper'],['cardboard','Cardboard'],['glass','Glass'],['metal','Metal'],['food_waste','Food waste'],['garden_waste','Garden waste'],['textile','Textile'],['wood','Wood'],['rubber','Rubber'],['ceramic','Ceramic'],['e_waste','Electronic waste'],['hazardous','Hazardous waste'],['sanitary','Sanitary waste'],['oil','Oil'],['composite_or_other','Mixed materials / other']].map(([value,label])=>({value,label}));
export function shuffle<T>(items:readonly T[],random:()=>number=Math.random):T[]{
 const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function makeQuiz(random:()=>number=Math.random):QuizItem[]{
 const selected=Object.entries({easy:5,medium:2,hard:3}).flatMap(([difficulty,count])=>{
  const pool=quizBank.filter(q=>q.difficulty===difficulty);
  if(pool.length<count)throw new Error(`Not enough ${difficulty} quiz images`);
  return shuffle(pool,random).slice(0,count);
 });
 return shuffle(selected,random);
}
export function gradeQuiz(questions:QuizItem[],answers:Record<string,QuizAnswer>){
 const results=questions.map(question=>{const answer=answers[question.id];const typeCorrect=Boolean(answer&&question.types.includes(answer.type));const categoryCorrect=Boolean(answer&&question.categories.includes(answer.category));return {question,answer,typeCorrect,categoryCorrect,points:Number(typeCorrect)+Number(categoryCorrect)};});
 return {results,points:results.reduce((total,r)=>total+r.points,0),maximum:questions.length*2,fullyCorrect:results.filter(r=>r.points===2).length};
}
export function quizImage(item:QuizItem){return '/quiz%20images/'+item.id.split('/').map(encodeURIComponent).join('/');}
export function answerLabel(value:string,kind:'type'|'category'){return (kind==='type'?typeOptions:categoryOptions).find(o=>o.value===value)?.label??'Not answered';}
