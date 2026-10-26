"use client";
import {useEffect,useRef,useState} from 'react';
type Cue='start'|'correct'|'try-again'|'complete';
/** User-gesture playback only; unavailable audio/speech must never block a quiz. */
export function useQuizSounds(){
 const [muted,setMuted]=useState(false);
 const mutedRef=useRef(false),audio=useRef<HTMLAudioElement|null>(null),epoch=useRef(0);
 function stop(){epoch.current++;if(audio.current){audio.current.pause();audio.current.removeAttribute('src');audio.current.load();audio.current=null;}if(typeof window!=='undefined'&&'speechSynthesis'in window)window.speechSynthesis.cancel();}
 useEffect(()=>{
  try{const stored=localStorage.getItem('ecomitra-quiz-muted')==='true';mutedRef.current=stored;setMuted(stored);}catch{}
  const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);stop();};
 },[]);
 function toggle(){const next=!mutedRef.current;mutedRef.current=next;setMuted(next);stop();try{localStorage.setItem('ecomitra-quiz-muted',String(next));}catch{}}
 function play(cue:Cue,encouragement?:string){
  stop();if(mutedRef.current||document.hidden)return;
  const token=epoch.current;
  const voice=()=>{
   if(!encouragement||token!==epoch.current||mutedRef.current||document.hidden||!('speechSynthesis'in window))return;
   try{const utterance=new SpeechSynthesisUtterance(encouragement);utterance.lang='en-IN';utterance.rate=1.04;utterance.volume=.65;window.speechSynthesis.speak(utterance);}catch{}
  };
  try{const player=new Audio(`/audio/quiz/${cue}.ogg`);audio.current=player;player.volume=cue==='try-again' ? 0.18 : 0.35;player.onended=voice;player.play().catch(()=>voice());}catch{voice();}
 }
 return {muted,toggle,play,stop};
}
