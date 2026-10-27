"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Check,RotateCcw,GraduationCap,X,Trophy,Volume2,VolumeX,Triangle,Square,Circle,Diamond,Zap,Timer} from 'lucide-react';
import {makeQuiz,gradeQuiz,quizImage,answerLabel,quizTypeChoices,quizSecondsRemaining,quizCategoryChoices,type QuizItem,type QuizAnswer} from '@/lib/waste-quiz';
import {useQuizSounds} from './use-quiz-sounds';
import styles from './waste-quiz.module.css';
const ANSWER_SECONDS=10;
const shapes=[Triangle,Diamond,Circle,Square];
const feedbackTitles=['Nice one!','You nailed it!','Great sorting!','Good eye!'];
export default function WasteQuiz(){
 const [questions,setQuestions]=useState<QuizItem[]>([]),[answers,setAnswers]=useState<Record<string,QuizAnswer>>({}),[index,setIndex]=useState(0),[step,setStep]=useState<'type'|'category'>('type'),[locked,setLocked]=useState(false),[finished,setFinished]=useState(false),[streak,setStreak]=useState(0),[confetti,setConfetti]=useState(false);
 const [secondsLeft,setSecondsLeft]=useState(ANSWER_SECONDS);
 const deadlineRef=useRef<{photo:string;at:number}|null>(null);
 const answerLock=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 const sound=useQuizSounds();
 const typeChoices=useMemo(()=>questions.map(()=>quizTypeChoices()),[questions]);
 const categoryChoices=useMemo(()=>questions.map(q=>quizCategoryChoices(q)),[questions]);
 const grade=useMemo(()=>gradeQuiz(questions,answers),[questions,answers]);
 useEffect(()=>{if(!finished)return;setConfetti(true);const timer=setTimeout(()=>setConfetti(false),4500);return()=>clearTimeout(timer);},[finished]);
 const question=questions[index],answer=question?answers[question.id]:undefined;
 const currentValue=answer?.[step];
 const accepted=question?(step==='type'?question.types:question.categories):[];
 const correct=Boolean(currentValue&&accepted.includes(currentValue));
 function start(){deadlineRef.current=null;sound.play('start');setQuestions(makeQuiz());setAnswers({});setIndex(0);setStep('type');setFinished(false);setLocked(false);answerLock.current=false;setStreak(0);setConfetti(false);setSecondsLeft(ANSWER_SECONDS);}
 function select(value:string){
  if(answerLock.current||locked||finished||!question)return;
  if(deadlineRef.current&&quizSecondsRemaining(deadlineRef.current.at,Date.now())===0)value='';
  answerLock.current=true;setLocked(true);
  setAnswers(previous=>({...previous,[question.id]:{type:previous[question.id]?.type??'',category:previous[question.id]?.category??'',[step]:value}}));
  const right=accepted.includes(value);
  const fullCorrect=step==='category'&&right&&question.types.includes(answer?.type??'');
  if(step==='category')setStreak(previous=>fullCorrect?previous+1:0);
  sound.play(right?'correct':'try-again',fullCorrect?'Good job!':undefined);
 }
 function next(){
  if(!answerLock.current)return;
  sound.stop();
  if(step==='type'&&deadlineRef.current&&quizSecondsRemaining(deadlineRef.current.at,Date.now())>0)setStep('category');
  else if(index===questions.length-1){setFinished(true);sound.play('complete',grade.points>=14?'Amazing work! Well done!':'Good job finishing! Keep exploring!');window.scrollTo({top:0,behavior:'instant'});return;}
  else {setIndex(previous=>previous+1);setStep('type');}
  answerLock.current=false;setLocked(false);requestAnimationFrame(()=>heading.current?.focus());
 }
 useEffect(()=>{
  if(!locked||finished)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{if(timer)clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>next(),correct?1100:2200);};
  schedule();document.addEventListener('visibilitychange',schedule);
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 },[locked,finished,index,step,correct,grade.points]);
 useEffect(()=>{
  if(!question||finished||(locked&&step==='category'))return;
  if(deadlineRef.current?.photo!==question.id)deadlineRef.current={photo:question.id,at:Date.now()+ANSWER_SECONDS*1000};
  const deadline=deadlineRef.current.at;
  const tick=()=>{
   const remaining=quizSecondsRemaining(deadline,Date.now());
   setSecondsLeft(remaining);
   if(remaining===0)select('');
  };
  tick();
  const timer=setInterval(tick,100);
  document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
 },[question?.id,step,locked,finished]);
 const choices=(step==='type'?typeChoices[index]:categoryChoices[index])??[];
 return <div className={styles.root}>
  <div className={styles.gameBar}><span className={styles.gameBrand}><GraduationCap size={17}/> THE ECOMITRA CHALLENGE</span><button className={styles.sound} onClick={sound.toggle} aria-label={sound.muted?'Turn sound on':'Mute quiz sounds'} aria-pressed={sound.muted}>{sound.muted?<VolumeX size={17}/>:<Volume2 size={17}/>}<span>Sound {sound.muted?'off':'on'}</span></button></div>
  {!questions.length?<section className={styles.welcome}>
    <div className={styles.welcomeShapes} aria-hidden="true"><Triangle/><Diamond/><Circle/><Square/></div><span className={styles.icon}><GraduationCap size={34}/></span><p className={styles.eyebrow}>A QUICK QUIZ. A FRESH PERSPECTIVE.</p><h1>Ready, set,<br/><em>sort.</em></h1><p>See the photo. Pick your answer.<br/>Let’s turn everyday waste into a little friendly competition.</p><button className={styles.primary} onClick={start}>Let’s play <ArrowRight size={19}/></button><small>10 photos · 20 points · {ANSWER_SECONDS} seconds per photo</small><details><summary>How to play</summary><p>Each photo has two quick picks: waste type, then material. You have {ANSWER_SECONDS} seconds total for both picks. The timer continues between them. An unanswered pick scores zero and moves on automatically. Every correct pick earns one point. Valid overlaps count, so paper can be biodegradable or recyclable. Assume clean, empty items unless stated; recycling may require a specialist facility.</p><p>Quiz scores stay separate from Discovery Points and pickup rewards.</p><p>Sound effects by <a href="https://kenney.nl/assets/interface-sounds" target="_blank" rel="noreferrer">Kenney · CC0</a>. Mute at any time.</p></details>
   </section>:finished?<section className={styles.results}>
    {confetti&&<div className={styles.confetti} aria-hidden="true">{Array.from({length:64},(_,i)=><i key={i} style={{'--x':`${(i*37)%100}%`,'--delay':`${(i%8)*.07}s`,'--duration':`${2.5+(i%5)*.3}s`,'--sway':`${((i*19)%160)-80}px`,'--turn':`${(i%2?1:-1)*(360+i*11)}deg`,background:['#b8d886','#a68bdf','#f1b7cc','#8acbd1','#ecd486'][i%5]} as React.CSSProperties}/>)}</div>}
    <div className={styles.resultHero}><span className={styles.trophy}><Trophy size={39}/></span><p className={styles.eyebrow}>YOU DID IT!</p><h1>{grade.points===20?'Perfect sorting!':grade.points>=14?'You’ve got a good eye!':'Good job showing up!'}</h1><div className={styles.finalScore}><strong>{grade.points}</strong><span>/ {grade.maximum}<small>POINTS EARNED</small></span></div><p>{grade.fullyCorrect} of 10 photos fully correct. {grade.points===20?'Every single pick. Brilliant.':'A little more knowledge for your next round.'}</p><button className={styles.primary} onClick={start}><RotateCcw size={17}/> Play again</button></div>
    <div className={styles.reviewHeading}><h2>{grade.points===20?'A clean sweep.':'Your learning moments'}</h2><p>{grade.points===20?'All 20 answers correct. Nicely done.':'Here’s what to remember for next time.'}</p></div>
    {grade.results.filter(r=>r.points<2).map(r=><article className={styles.review} key={r.question.id}><img src={quizImage(r.question)} alt={r.question.name}/><div><small>{r.points}/2 POINTS</small><h3>{r.question.name}</h3>{(['type','category']as const).map(kind=>{const right=kind==='type'?r.typeCorrect:r.categoryCorrect;return <div key={kind} className={styles.reviewAnswer} data-correct={right}>{right?<Check size={15}/>:<X size={15}/>}<span>{kind==='type'?'Waste type':'Category'}: <strong>{answerLabel(r.answer?.[kind]??'',kind)}</strong>{!right&&<small>Accepted: {(kind==='type'?r.question.types:r.question.categories).map(value=>answerLabel(value,kind)).join(' or ')}</small>}</span></div>})}<p>{r.question.explanation}</p></div></article>)}
   </section>:<section className={styles.question}>
    <div className={styles.roundBar}><span>PHOTO <b>{String(index+1).padStart(2,'0')}</b> / 10</span><div>{streak>1&&<span className={styles.streak}><Zap size={13}/>{streak} in a row</span>}<span className={styles.timer} data-urgent={secondsLeft<=5&&!locked} role="timer" aria-label={`${secondsLeft} seconds remaining`}><Timer size={16}/>{secondsLeft}<small>s</small></span><span className={styles.scorePill}>{grade.points} pts</span></div></div>
    <div className={styles.progress} aria-label={`Photo ${index+1} of 10`}>{questions.map((q,i)=><span key={q.id} data-active={i===index} data-done={i<index||Boolean(answers[q.id]?.category)}/>)}</div>
    <div className={styles.playArea}><div className={styles.photo}><img key={question.id} src={quizImage(question)} alt={question.name}/><span>{question.name}</span></div><div className={styles.answerArea}><div className={styles.promptStep}><span data-current={step==='type'}>1 · Waste type</span><span data-current={step==='category'}>2 · Category</span></div><h1 ref={heading} tabIndex={-1}>{step==='type'?'What kind of waste is this?':'Which category does it belong to?'}</h1><p className={styles.promptHelp}>Pick before the countdown ends.</p>
    <div className={styles.choices} role="group" aria-label={step==='type'?'Waste type answers':'Category answers'}>{choices.map((option,i)=>{const Shape=shapes[i%4];const isRight=accepted.includes(option.value);const selected=currentValue===option.value;return <button key={option.value} className={styles.answerCard} data-color={i} data-result={locked?(isRight?'correct':selected?'wrong':'dim'):undefined} aria-pressed={Boolean(selected)} disabled={locked} onClick={()=>select(option.value)}><Shape size={20} fill="currentColor" strokeWidth={1.5}/><span>{option.label}</span>{locked&&isRight?<Check size={20}/>:locked&&selected?<X size={20}/>:null}</button>})}</div>
    <div className={styles.feedback} aria-live="polite" aria-atomic="true">{locked&&<><div className={styles.feedbackTitle} data-correct={correct}>{correct?<Check size={20}/>:<RotateCcw size={18}/>}<strong>{correct?feedbackTitles[(index+(step==='category'?1:0))%feedbackTitles.length]:!currentValue?'Time’s up! Keep going.':'You’re learning. Keep going!'}</strong><span>{correct?'+1 point':'0 points'}</span></div><p>{correct?(step==='category'?question.explanation:'Great choice. Now find its material category.'):`Accepted: ${accepted.map(value=>answerLabel(value,step)).join(' or ')}. ${step==='category'?question.explanation:''}`}</p><div className={styles.autoNext}><span>{step==='type'&&secondsLeft>0?'Category up next':index===9?'Your score is next':'Next photo coming up'}</span><div style={{animationDuration:correct?'1.1s':'2.2s'}}/></div></>}</div>
    </div></div>
   </section>}
 </div>;
}
