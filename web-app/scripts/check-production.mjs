import {createRequire} from 'node:module';
createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const e=process.env;
let validUrl=false;try{const url=new URL(e.APP_URL||'');validUrl=url.protocol==='https:'&&!['localhost','127.0.0.1','::1'].includes(url.hostname)}catch{}
const checks=[
 ['Public HTTPS application URL',validUrl],
 ['Database URI and database name',!!e.MONGODB_URI&&!!e.MONGODB_DB],
 ['Identification API key',!!e.GEMINI_API_KEY],
 ['SMTP host, sender and authenticated credentials',!!e.SMTP_HOST&&!!e.SMTP_FROM&&!!e.SMTP_USER&&!!e.SMTP_PASSWORD],
 ['Live Razorpay key and secret',e.RAZORPAY_KEY_ID?.startsWith('rzp_live_')&&!!e.RAZORPAY_KEY_SECRET],
 ['Razorpay webhook secret',!!e.RAZORPAY_WEBHOOK_SECRET&&e.RAZORPAY_WEBHOOK_SECRET.length>=20],
 ['Operations administrator email allowlist',!!e.ADMIN_EMAILS?.trim()],
 ['Demo auto-assignment disabled',e.DEMO_AUTO_ASSIGN!=='true'],
 ['Unverified signup override disabled',e.ALLOW_UNVERIFIED_SIGNUP!=='true'],
];
for(const [name,passed] of checks)console.log(`${passed?'PASS':'REQUIRED'} ${name}`);
console.log('Configuration check only: verify sender delivery, webhook reachability, database access/backups and device tracking separately. No credential values are printed.');
if(checks.some(([,passed])=>!passed))process.exitCode=1;
