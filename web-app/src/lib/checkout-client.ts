"use client";
import {serviceApi} from './client-api';
declare global {interface Window{Razorpay?:new(options:Record<string,unknown>)=>{open:()=>void}}}
let loading:Promise<void>|null=null,active=false;
async function loadCheckout(){
 if(window.Razorpay)return;
 if(loading)return loading;
 loading=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');let timer:ReturnType<typeof setTimeout>;
  const fail=()=>{clearTimeout(timer);script.remove();reject(new Error('Payment window could not load. Check your connection and try again.'))};
  script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
  script.onload=()=>{clearTimeout(timer);if(window.Razorpay)resolve();else fail()};script.onerror=fail;
  timer=setTimeout(fail,15000);document.head.appendChild(script);
 });
 try{await loading}finally{loading=null}
}
export async function openWasteCheckout(plan:string,bookingId?:string):Promise<{paid:boolean;outcome?:string}>{
 if(active)throw new Error('A payment window is already open. Finish or close it first.');
 active=true;
 try{
  await loadCheckout();
  const order=await serviceApi('payments/order',{plan,bookingId});
  return await new Promise((resolve,reject)=>{
   let finished=false,verifying=false;
   const finish=(value:{paid:boolean;outcome?:string})=>{if(!finished){finished=true;resolve(value)}};
   const checkout=new window.Razorpay!({key:order.key,order_id:order.orderId,amount:order.amount,currency:'INR',name:'Waste Right',description:plan==='basic'?'Waste pickup':`${plan} monthly plan`,prefill:{name:order.name,email:order.email},theme:{color:'#6559a3'},
    modal:{ondismiss:()=>{if(!verifying)finish({paid:false})}},
    handler:async(data:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string})=>{
     if(finished||verifying)return;verifying=true;
     try{const result=await serviceApi('payments/verify',{orderId:data.razorpay_order_id,paymentId:data.razorpay_payment_id,signature:data.razorpay_signature});finish({paid:true,outcome:result.outcome})}
     catch{finished=true;reject(new Error('We could not confirm the payment yet. Check your payment history before trying again.'))}
    },
   });
   try{checkout.open()}catch(e){finished=true;reject(e)}
  });
 }finally{active=false}
}
