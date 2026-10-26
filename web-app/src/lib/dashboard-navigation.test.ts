import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardPage} from './dashboard-navigation';
import {roleFor} from './service';
test('Operations direct links survive sign-in for resident and helper admin accounts',()=>{
 assert.equal(dashboardPage('Operations',null),'Operations');
 assert.equal(dashboardPage('Operations',{role:'admin',accountType:'user'}),'Operations');
 assert.equal(dashboardPage('Operations',{role:'admin',accountType:'helper'}),'Operations');
 assert.equal(dashboardPage('Operations',{role:'resident',accountType:'user'}),'Overview');
 assert.equal(dashboardPage('Operations',{role:'collector',accountType:'helper'}),'Helper dashboard');
 assert.equal(dashboardPage('Settings',{accountType:'helper'}),'Settings');
 assert.equal(dashboardPage('Collection route',{role:'collector',accountType:'helper'}),'Collection route');
});
test('Admin authority requires the server allowlist and verified email or explicit legacy approval',()=>{
 const previous=process.env.ADMIN_EMAILS;process.env.ADMIN_EMAILS=' ops@example.test ';
 try{
  assert.equal(roleFor({email:'OPS@example.test',emailVerifiedAt:new Date()}),'admin');
  assert.equal(roleFor({email:'ops@example.test'}),'resident');
  assert.equal(roleFor({email:'other@example.test',emailVerifiedAt:new Date(),adminApproved:true}),'resident');
  assert.equal(roleFor({email:'ops@example.test',adminApproved:true}),'admin');
 }finally{if(previous===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=previous}
});
