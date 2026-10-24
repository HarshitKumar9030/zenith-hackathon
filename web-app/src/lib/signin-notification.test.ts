import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signInDetails,signInEmail} from './signin-notification';
const now=new Date('2026-10-24T08:00:00Z');
test('untrusted forwarded IPs are not presented as verified network details',()=>{
 const d=signInDetails(new Headers({'x-forwarded-for':'203.0.113.8','x-real-ip':'203.0.113.9'}),'Password',now,{});assert.match(d.ip,/Unavailable/);
});
test('managed proxy IPs are validated and browser details have conservative labels',()=>{
 const d=signInDetails(new Headers({'x-vercel-forwarded-for':'2001:db8::5','user-agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/140 Safari/537.36 Edg/140'}),'Password',now,{VERCEL:'1'});assert.equal(d.ip,'2001:db8::5');assert.equal(d.browser,'Microsoft Edge');assert.equal(d.platform,'Windows');
 const invalid=signInDetails(new Headers({'x-vercel-forwarded-for':'not an ip'}),'Password',now,{VERCEL:'1'});assert.match(invalid.ip,/Unavailable/);
});
test('self-hosted trusted hop selection ignores an attacker-controlled left prefix',()=>{
 const d=signInDetails(new Headers({'x-forwarded-for':'1.2.3.4, 203.0.113.7'}),'Email sign-in link',now,{AUTH_TRUSTED_PROXY_HOPS:'1'});assert.equal(d.ip,'203.0.113.7');
});
test('notification HTML escapes reported values and includes both times without a bearer token',()=>{
 const d=signInDetails(new Headers({'user-agent':'<img src=x onerror=alert(1)> Safari/1'}),'Email sign-in link',now,{});
 const mail=signInEmail('<script>name</script>',d,'https://waste.example/app?auth=forgot-password');
 assert.ok(mail.html.includes('&lt;script&gt;'));assert.ok(!mail.html.includes('<script>'));assert.ok(!mail.html.includes('<img'));assert.match(mail.text,/Time \(India\)/);assert.match(mail.text,/Time \(UTC\)/);assert.match(mail.text,/reset your password/i);assert.ok(!mail.html.includes('#action='));
});
