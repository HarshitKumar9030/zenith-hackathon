"use client";
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {gsap} from 'gsap';
/** Reveal existing landing sections without changing their layout or interaction. */
export default function LandingClipMotion(){
 const pathname=usePathname();
 useEffect(()=>{
  const root=document.querySelector<HTMLElement>('.landing');
  if(!root)return;
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   const targets=root.querySelectorAll<HTMLElement>('.landing-hero-copy, .landing-visual, .landing-section-heading, .landing-steps article, .landing-plan, .landing-scale-note, .helper-illustration');
   const context=gsap.context(()=>{},root);
   const revealed=new WeakSet<Element>();
   const reveal=(node:HTMLElement)=>{
    if(revealed.has(node))return;
    revealed.add(node);
    context.add(()=>{gsap.fromTo(node,{clipPath:node.matches('.landing-visual, .helper-illustration')?'inset(0% 0% 90% 0% round 28px)':'inset(0% 0% 55% 0% round 20px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',duration:.95,ease:'power3.out',clearProps:'clipPath',overwrite:'auto'});});
   };
   const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){reveal(entry.target as HTMLElement);observer.unobserve(entry.target)}}),{threshold:.12});
   targets.forEach(node=>observer.observe(node));
   const onFocus=(event:FocusEvent)=>{const target=event.target as HTMLElement;targets.forEach(node=>{if(node.contains(target)){gsap.killTweensOf(node,'clipPath');gsap.set(node,{clearProps:'clipPath'});revealed.add(node);observer.unobserve(node);}})};
   root.addEventListener('focusin',onFocus);
   return ()=>{observer.disconnect();root.removeEventListener('focusin',onFocus);context.revert()};
  });
  return ()=>media.revert();
 },[pathname]);
 return null;
}
