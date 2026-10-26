"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,KeyRound,Leaf,Loader2,Mail,ShieldCheck,ShieldX} from 'lucide-react';
import {AuthMessage,PasswordField,type AuthFeedback} from '@/components/auth-dialog-content';
import styles from '@/components/auth-screens.module.css';
const copy={
 reset:{title:'Choose a new password.',description:'A fresh password keeps your account and collection history protected.',action:'Save new password',success:'Your password is updated.',detail:'Sign in with your new password to continue. Your saved activity stays with your account.'},
 verify:{title:'Verify your email.',description:'Confirm your email to finish setting up your EcoMitra account.',action:'Verify email',success:'Your email is verified.',detail:'Your account is ready. Continue to your dashboard to get started.'},
 signin:{title:'You’re one step away.',description:'Use your email link to sign in securely, without a password.',action:'Sign in securely',success:'You’re signed in.',detail:'Your account is ready. Pick up where you left off.'},
};
export default function AccountLinkPage(){
 const [link,setLink]=useState<{action:string;token:string}|null>(null),[feedback,setFeedback]=useState<AuthFeedback>(null),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const parsed=useRef(false),pending=useRef(false);
 useEffect(()=>{
  if(parsed.current)return;parsed.current=true;
  const params=new URLSearchParams(window.location.hash.slice(1));setLink({action:params.get('action')||'',token:params.get('token')||''});
  window.history.replaceState(window.history.state,'',window.location.pathname);
 },[]);
 const action=link?.action as keyof typeof copy;
 const valid=Boolean(link&&Object.hasOwn(copy,action)&&/^[a-f0-9]{64}$/.test(link.token));
 const content=valid?copy[action]:null;
 const Icon=done?CheckCircle2:!link?Loader2:!valid?ShieldX:action==='reset'?KeyRound:action==='verify'?ShieldCheck:Mail;
 const retryHref=`/app?auth=${action==='reset'?'forgot-password':action==='verify'?'resend-verification':'send-signin'}`;
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!valid||pending.current||done)return;
  const form=new FormData(event.currentTarget),password=String(form.get('password')||'');
  if(action==='reset'&&password!==form.get('confirmation')){setFeedback({type:'error',text:'Your passwords don’t match. Check both fields and try again.'});return;}
  pending.current=true;setBusy(true);setFeedback(null);
  try{
   const response=await fetch(`/api/auth/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:link!.token,...(action==='reset'?{password}:{})})});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(data?.error||'We couldn’t use this link. Try again or request a new email.');
   if(!data?.ok)throw new Error('We couldn’t confirm the request. Please try again.');
   setDone(true);
  }catch(error){setFeedback({type:'error',text:error instanceof TypeError?'Could not connect. Check your connection and try again.':(error as Error).message});}
  finally{pending.current=false;setBusy(false);}
 }
 return <main className={styles.shell}>
  <nav className={styles.nav} aria-label="Account navigation"><a href="/" className={styles.brand}><Leaf size={26} strokeWidth={1.7}/>EcoMitra.</a><a href="/app?auth=login">Back to sign in</a></nav>
  <div className={styles.layout}>
   <aside className={styles.intro}><small>Your EcoMitra account</small><h2>A little help<br/>getting back in.</h2><p>Your pickups, saved scans and everyday progress, together in one place.</p><div className={styles.introNote}><ShieldCheck size={17}/>Secure links. A simple next step.</div></aside>
   <section className={styles.card} aria-labelledby="account-heading">
    <div className={`${styles.mark} ${done?styles.successMark:''}`}><Icon size={26} strokeWidth={1.6} className={!link?'spin':undefined}/></div>
    <header className={styles.header}><h1 id="account-heading" className={styles.title}>{!link?'Checking your link…':done?content!.success:content?.title||'Let’s get you a new link.'}</h1><p className={styles.description}>{!link?'Just a moment while we prepare your next step.':done?content!.detail:content?.description||'This link is incomplete or invalid. Request a fresh email to continue securely.'}</p></header>
    <AuthMessage feedback={feedback}/>
    {link&&!valid&&<a className={styles.submit} href={retryHref}>Request a new link <ArrowRight size={17}/></a>}
    {valid&&!done&&<>
     <form onSubmit={submit} className={styles.form} aria-busy={busy}>
      {action==='reset'&&<><PasswordField label="New password" newPassword helper disabled={busy}/><PasswordField name="confirmation" label="Confirm new password" newPassword disabled={busy}/></>}
      <button type="submit" className={styles.submit} disabled={busy}>{busy?<Loader2 className="spin" size={18}/>:<ArrowRight size={17}/>} {busy?'Please wait…':content!.action}</button>
     </form>
     <p className={styles.statusNote}><ShieldCheck size={14}/>This link works once and expires after 15 minutes.</p>
     <div className={styles.footer}><a className={styles.link} href={retryHref}>Link expired? Request a new one</a></div>
    </>}
    {done&&<a className={styles.submit} href={action==='reset'?'/app?auth=login':'/app'}>{action==='reset'?'Sign in with your new password':'Open your dashboard'}<ArrowRight size={17}/></a>}
    {(!valid||done)&&link&&<div className={styles.footer}><a className={styles.link} href="/"><ArrowLeft size={14}/>Back to EcoMitra</a></div>}
   </section>
  </div>
 </main>;
}
