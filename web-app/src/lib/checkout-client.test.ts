import {test} from 'node:test';import assert from 'node:assert/strict';import {openWasteCheckout} from './checkout-client';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('checkout prevents duplicates, handles dismissal and surfaces uncertain verification without retry',async()=>{
 const originalFetch=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');let options:Record<string,any>|undefined,orders=0,verifies=0;
 Object.defineProperty(globalThis,'window',{configurable:true,value:{Razorpay:class{constructor(value:Record<string,unknown>){options=value}open(){}}}});
 try{
  globalThis.fetch=async(url)=>{if(String(url).endsWith('/order')){orders++;return Response.json({key:'test-fixture',orderId:'qa-order',amount:1000})}verifies++;await tick();return Response.json({outcome:'captured'})};
  const payment=openWasteCheckout('basic','qa-booking');await tick();await assert.rejects(openWasteCheckout('basic','qa-booking'),/already open/);
  assert.ok(options);const data={razorpay_order_id:'qa-order',razorpay_payment_id:'qa-payment',razorpay_signature:'qa-signature'};
  const first=options.handler(data);await options.handler(data);options.modal.ondismiss();await first;
  assert.deepEqual(await payment,{paid:true,outcome:'captured'});assert.equal(orders,1);assert.equal(verifies,1);
  const retry=openWasteCheckout('basic','qa-booking');await tick();options.modal.ondismiss();assert.deepEqual(await retry,{paid:false});assert.equal(verifies,1);
  globalThis.fetch=async(url)=>{if(String(url).endsWith('/order'))return Response.json({key:'test-fixture',orderId:'qa-order',amount:1000});verifies++;return Response.json({error:'temporarily unavailable'},{status:503})};
  const failed=openWasteCheckout('basic','qa-booking');const rejected=assert.rejects(failed,/Check your payment history before trying again/);await tick();await options.handler(data);await rejected;assert.equal(verifies,2);
 }finally{globalThis.fetch=originalFetch;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window')}
});
