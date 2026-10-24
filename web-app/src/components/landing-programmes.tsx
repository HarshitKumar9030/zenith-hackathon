"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {createPortal} from 'react-dom';
import GovernmentProgrammes from './government-programmes';
/** Add the public programme section inside the landing main, before its footer. */
export default function LandingProgrammes(){
 const pathname=usePathname();
 const [target,setTarget]=useState<Element|null>(null);
 useEffect(()=>{setTarget(pathname==='/'?document.querySelector('.landing main'):null)},[pathname]);
 return pathname==='/'&&target?createPortal(<GovernmentProgrammes compact/>,target):null;
}
