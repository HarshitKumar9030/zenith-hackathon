import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectPaymentAttempts,latestScanBooking,type GatewayPayment} from './payment-status';
const orders=[{orderId:'order-new',amount:1000},{orderId:'order-old',amount:1000}];
const payment=(status:string,order_id='order-old'):GatewayPayment=>({id:'pay-fixture',order_id,amount:1000,currency:'INR',status});
test('restoring a scan picks the latest paid booking instead of an older unpaid request',()=>{
 const b=[{id:'old',scanId:'scan',status:'payment_due'},{id:'paid',scanId:'scan',status:'scheduled'},{id:'cancelled',scanId:'scan',status:'cancelled'}];
 assert.equal(latestScanBooking(b,'scan')?.id,'paid');assert.equal(latestScanBooking(b,'other'),null);
});
test('captured payment in an earlier order is reconciled before another checkout, without a new charge',async()=>{
 let applied=0;
 assert.equal(await inspectPaymentAttempts(orders,async id=>id==='order-new'?[payment('authorized',id)]:[payment('captured')],async(order,p)=>{applied++;assert.equal(order.orderId,'order-old');assert.equal(p.id,'pay-fixture');return 'captured'}),'paid');assert.equal(applied,1);
});
test('pending, unreachable, mismatched and refunded attempts do not invite another payment',async()=>{
 let applied=0;const apply=async()=>{applied++;return 'captured'};
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[payment('authorized')],apply),'processing');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>{throw Error('offline')},apply),'unknown');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[{...payment('captured'),amount:999}],apply),'review_needed');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[{...payment('captured'),order_id:'foreign'}],apply),'review_needed');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[{...payment('captured'),amount_refunded:100}],apply),'review_needed');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[payment('refunded')],apply),'review_needed');assert.equal(applied,0);
 assert.equal(await inspectPaymentAttempts([],async()=>[],apply),'unpaid');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[payment('failed')],apply),'unpaid');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[payment('created')],apply),'unknown');
 assert.equal(await inspectPaymentAttempts([orders[1]],async()=>[payment('captured')],async()=> 'review_needed'),'review_needed');
});
