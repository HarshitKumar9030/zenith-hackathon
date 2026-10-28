import {OAuth2Client} from 'google-auth-library';
export function googleConfigured(){return Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.APP_URL);}
export function googleReturnPath(value:unknown){return typeof value==='string'&&['/app','/scan-station','/account','/game'].includes(value)?value:'/app';}
export function googleAuthOrigin(requestUrl:string,appUrl=process.env.APP_URL||'http://localhost:3001',production=process.env.NODE_ENV==='production'){
 const origin=new URL(requestUrl).origin;
 const allowed=new Set([new URL(appUrl).origin,'https://ecomitra.harshit.page','https://wasteright.harshit.page',...(!production?['http://localhost:3001','http://127.0.0.1:3001']:[])]);
 if(!allowed.has(origin))throw new Error('Google sign-in is not enabled on this host');
 return origin;
}
export function googleClient(requestUrl?:string){
 const origin=new URL(requestUrl?googleAuthOrigin(requestUrl):process.env.APP_URL||'http://localhost:3001');
 if(origin.protocol!=='https:'&&!(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)))throw new Error('Use a secure APP_URL');
 return new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,new URL('/api/auth/google/callback',origin).toString());
}
export function googleEmailAuthoritative(email:string,hd?:string){return email.toLowerCase().endsWith('@gmail.com')||Boolean(hd);}
