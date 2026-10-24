"use client";
import {useId,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Eye,EyeOff,KeyRound,Leaf,Loader2,Mail,MailCheck,ShieldCheck,TriangleAlert} from 'lucide-react';
import Dropdown from './dropdown';
import styles from './auth-screens.module.css';
export type AuthMode='login'|'signup'|'forgot-password'|'send-signin'|'resend-verification';
export type AuthFeedback={type:'success'|'error';text:string}|null;
const copy={
 login:{title:'Welcome back.',description:'Sign in to your pickups, rewards and everyday progress.',action:'Sign in'},
 signup:{title:'A fresh start.',description:'Create your Waste Right account. Choose how you would like to take part.',action:'Create account'},
 'forgot-password':{title:'Forgot your password?',description:'Enter your account email and we’ll send a link to reset your password.',action:'Send reset link'},
 'send-signin':{title:'Sign in with an email.',description:'We’ll email you a single-use link. No password needed.',action:'Send sign-in link'},
 'resend-verification':{title:'Verify your email.',description:'Request a fresh verification link to finish setting up your account.',action:'Send verification link'},
};
export function PasswordField({name='password',label='Password',newPassword=false,helper=false,disabled=false,action}:{name?:string;label?:string;newPassword?:boolean;helper?:boolean;disabled?:boolean;action?:React.ReactNode}){
 const [visible,setVisible]=useState(false),id=useId();
 return <div className={styles.field}><div className={styles.labelRow}><label htmlFor={id}>{label}</label>{action}</div><span className={styles.password}>
  <input id={id} name={name} type={visible?'text':'password'} required minLength={10} maxLength={128} autoComplete={newPassword?'new-password':'current-password'} disabled={disabled} aria-describedby={helper?`${id}-help`:undefined}/>
  <button className={styles.visibility} type="button" aria-label={`${visible?'Hide':'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(!visible)} disabled={disabled}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>
 </span>{helper&&<small id={`${id}-help`}>Use 10–128 characters.</small>}</div>
}
export function AuthMessage({feedback}:{feedback:AuthFeedback}){return feedback?<div className={`${styles.feedback} ${feedback.type==='success'?styles.feedbackSuccess:''}`} role={feedback.type==='error'?'alert':'status'}>{feedback.type==='success'?<CheckCircle2 size={17}/>:<TriangleAlert size={17}/>}<span>{feedback.text}</span></div>:null}
export default function AuthDialogContent({mode,busy,feedback,accountType,onAccountType,onMode,onSubmit}:{mode:AuthMode;busy:boolean;feedback:AuthFeedback;accountType:string;onAccountType:(value:string)=>void;onMode:(mode:AuthMode)=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void}){
 const [email,setEmail]=useState('');const emailOnly=!['login','signup'].includes(mode),sent=emailOnly&&feedback?.type==='success',content=copy[mode];
 const Icon=sent?MailCheck:mode==='forgot-password'?KeyRound:mode==='send-signin'?Mail:mode==='resend-verification'?ShieldCheck:Leaf;
 return <>
  <div className={`${styles.mark} ${sent?styles.successMark:''}`}><Icon size={26} strokeWidth={1.6}/></div>
  <header className={styles.header}><h2 id="auth-dialog-title" className={styles.title}>{sent?'Check your inbox.':content.title}</h2><p id="auth-dialog-description" className={styles.description}>{sent?'If an eligible account matches your email, a link will arrive shortly. Check your spam folder too.':content.description}</p></header>
  {!sent&&<AuthMessage feedback={feedback}/>}
  {sent?<>
   {email&&<p className={styles.email}>{email}</p>}
   <p className={styles.helperNote}>Links are single-use and expire after 15 minutes. Use the newest email you receive.</p>
   <div className={styles.sentActions}><button type="button" className={styles.submit} onClick={()=>onMode('login')}>Back to sign in <ArrowRight size={17}/></button><button type="button" className={styles.link} onClick={()=>onMode(mode)}>Use a different email or try again</button></div>
  </>:<form onSubmit={onSubmit} className={styles.form} aria-busy={busy}>
   {mode==='signup'&&<label className={styles.field}>Your name<input name="name" autoComplete="name" required maxLength={80} disabled={busy}/></label>}
   {mode==='signup'&&<div className={styles.field}><span>Account type</span><Dropdown label="Account type" value={accountType} onChange={onAccountType} options={[{value:'user',label:'Resident'},{value:'helper',label:'Collection helper'}]}/><small>{accountType==='helper'?'Collect waste and track earnings. Approval is required to accept jobs.':'Scan waste, book pickups and earn rewards.'}</small></div>}
   <label className={styles.field}>Email address<input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} disabled={busy} placeholder="you@example.com"/></label>
   {!emailOnly&&<PasswordField newPassword={mode==='signup'} helper={mode==='signup'} disabled={busy} action={mode==='login'?<button type="button" className={styles.link} disabled={busy} onClick={()=>onMode('forgot-password')}>Forgot password?</button>:undefined}/>}
   <button type="submit" className={styles.submit} disabled={busy}>{busy?<Loader2 className="spin" size={18}/>:<ArrowRight size={17}/>} {busy?'Please wait…':content.action}</button>
  </form>}
  {!sent&&mode==='login'&&<div className={styles.options} aria-label="Other account options">
   <button type="button" className={styles.option} disabled={busy} onClick={()=>onMode('send-signin')}><Mail size={17}/><span><strong>Email a sign-in link</strong><small>Continue without a password</small></span></button>
   <button type="button" className={styles.option} disabled={busy} onClick={()=>onMode('resend-verification')}><ShieldCheck size={17}/><span><strong>Verify your email</strong><small>Request a new verification link</small></span></button>
  </div>}
  {!sent&&<div className={styles.footer}>{emailOnly?<button type="button" className={styles.link} disabled={busy} onClick={()=>onMode('login')}><ArrowLeft size={14}/>Back to sign in</button>:<><span>{mode==='signup'?'Already have an account?':'New to Waste Right?'}</span><button type="button" className={styles.link} disabled={busy} onClick={()=>onMode(mode==='signup'?'login':'signup')}>{mode==='signup'?'Sign in':'Create an account'}</button></>}</div>}
 </>;
}
