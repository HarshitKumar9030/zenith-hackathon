import test from 'node:test';
import assert from 'node:assert/strict';
import {googleReturnPath,googleEmailAuthoritative,googleAuthOrigin} from './google-auth';
test('Google login redirects only to explicit same-site application pages',()=>{
 for(const path of ['/app','/scan-station','/account','/game'])assert.equal(googleReturnPath(path),path);
 for(const path of ['https://evil.example','//evil.example','/\\evil.example','/scan-station?next=https://evil.example','/api/auth/logout',null,{},'/scan-station/../account'])assert.equal(googleReturnPath(path),'/app');
});
test('Google third-party email claims cannot automatically link existing accounts',()=>{
 assert.equal(googleEmailAuthoritative('resident@gmail.com'),true);
 assert.equal(googleEmailAuthoritative('resident@GMAIL.COM'),true);
 assert.equal(googleEmailAuthoritative('resident@campus.example','campus.example'),true);
 assert.equal(googleEmailAuthoritative('resident@campus.example'),false);
 assert.equal(googleEmailAuthoritative('resident@gmail.com.evil.example'),false);
});

test('Google callbacks stay on the registered app domains and reject arbitrary hosts',()=>{
 const app='https://wasteright.harshit.page';
 assert.equal(googleAuthOrigin('https://ecomitra.harshit.page/scan-station',app,true),'https://ecomitra.harshit.page');
 assert.equal(googleAuthOrigin(app+'/app',app,true),app);
 assert.equal(googleAuthOrigin('http://localhost:3001/scan-station',app,false),'http://localhost:3001');
 assert.throws(()=>googleAuthOrigin('https://evil.example/app',app,true));
 assert.throws(()=>googleAuthOrigin('http://localhost:3001/app',app,true));
});
