import {isIP} from 'node:net';
import {createEmailTransport,emailConfigured,accountLink} from './email';
export type SignInDetails={at:string;ip:string;browser:string;platform:string;userAgent:string;method:string};
const clean=(value:string,max=320)=>value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export function signInDetails(headers:Pick<Headers,'get'>,method:string,now=new Date(),env:Record<string,string|undefined>=process.env):SignInDetails{
 const ua=clean(headers.get('user-agent')||'Not provided');
 let raw='';
 if(env.VERCEL==='1')raw=headers.get('x-vercel-forwarded-for')||headers.get('x-real-ip')||'';
 else if(env.AUTH_TRUSTED_PROXY_HOPS&&/^\d+$/.test(env.AUTH_TRUSTED_PROXY_HOPS)){
  const hops=Number(env.AUTH_TRUSTED_PROXY_HOPS),chain=(headers.get('x-forwarded-for')||'').split(',').map(v=>v.trim());
  if(hops>0&&hops<=chain.length&&hops<=16)raw=chain[chain.length-hops];
 }
 const candidate=raw.trim();const ip=isIP(candidate)?candidate:'Unavailable (local or untrusted proxy)';
 const browser=/Edg(?:A|iOS)?\//.test(ua)?'Microsoft Edge':/Firefox\/|FxiOS\//.test(ua)?'Firefox':/Chrome\/|CriOS\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Unknown browser';
 const platform=/Android/i.test(ua)?'Android':/iPhone|iPad|iPod/i.test(ua)?'iOS / iPadOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS X/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'Unknown device';
 return {at:now.toISOString(),ip,browser,platform,userAgent:ua,method:clean(method,80)};
}
const html=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));
export function signInEmail(name:string,details:SignInDetails,resetUrl:string){
 const time=new Date(details.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'long',timeZone:'Asia/Kolkata'});
 const rows=[['Time (India)',time],['Time (UTC)',details.at],['IP address',details.ip],['Browser',details.browser],['Device / OS',details.platform],['Sign-in method',details.method],['Browser details',details.userAgent]];
 const greeting=`Hi ${clean(name,80)||'there'},`;
 return {
  subject:'New sign-in to your Waste Right account',
  text:`${greeting}\n\nA new sign-in to your Waste Right account was successful.\n\n${rows.map(([a,b])=>`${a}: ${b}`).join('\n')}\n\nIf this was you, no action is needed. If you don’t recognise this sign-in, reset your password: ${resetUrl}\nResetting your password signs out existing sessions.\n\nBrowser details are reported by the device; network details can reflect a VPN or proxy. This email contains no password or sign-in token.\n\nWaste Right`,
  html:`<!doctype html><html><body style="margin:0;background:#f5f7f0;font-family:Arial,sans-serif;color:#173f30"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:36px 18px"><table role="presentation" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;margin:auto;background:#fff;border-radius:22px"><tr><td style="padding:32px"><p style="font-size:20px;color:#397750;margin:0 0 28px">Waste Right.</p><h1 style="font-size:26px;line-height:1.2;margin:0 0 18px">A new sign-in to your account.</h1><p style="font-size:14px;line-height:1.7">${html(greeting)}<br>A new sign-in to your Waste Right account was successful.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5ef;border-radius:14px">${rows.map(([a,b])=>`<tr><td style="padding:10px 14px;font-size:12px;vertical-align:top;width:32%;color:#647568">${html(a)}</td><td style="padding:10px 14px;font-size:12px;word-break:break-word;line-height:1.5">${html(b)}</td></tr>`).join('')}</table><p style="font-size:13px;line-height:1.7;margin-top:22px">If this was you, no action is needed. If you don’t recognise this sign-in, reset your password. Resetting signs out existing sessions.</p><a href="${html(resetUrl)}" style="display:inline-block;padding:14px 19px;border-radius:12px;color:white;background:#6559a3;text-decoration:none;font-size:13px">Reset your password</a><p style="font-size:11px;line-height:1.7;color:#7a857c;margin-top:26px">Browser details are reported by the device. A VPN or proxy can affect network details. No password or sign-in token is included.</p></td></tr></table></td></tr></table></body></html>`,
 };
}
export async function sendSignInNotification(to:string,name:string,details:SignInDetails){
 if(!emailConfigured())return;
 // Use the configured application origin, never the caller-supplied Host header.
 const reset=new URL('/app?auth=forgot-password',accountLink('reset','unused')).toString();
 await createEmailTransport().sendMail({from:{name:'Waste Right',address:process.env.SMTP_FROM!},to,...signInEmail(name,details,reset)});
}
