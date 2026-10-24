export type HelperPayJob = {status:string;receipt?:{sortingFeePaise?:number;sortingReferencePaise?:number;sortingIncluded?:boolean};settlement?:{netPaise?:number};workPay?:{amountPaise:number}};
export function helperCompensation(job:HelperPayJob){
 const completed=job.status==='completed';
 const safe=(n:number|undefined)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:0;
 const basePaise=completed?800:0;
 const sortingPaise=completed?Math.floor(safe(job.receipt?.sortingIncluded?job.receipt.sortingReferencePaise:job.receipt?.sortingFeePaise)/2):0;
 const recoveryPaise=completed?Math.floor(safe(job.settlement?.netPaise)*.4):0;
 const earnedPaise=basePaise+sortingPaise+recoveryPaise,paidPaise=safe(job.workPay?.amountPaise);
 return {basePaise,sortingPaise,recoveryPaise,earnedPaise,paidPaise,duePaise:Math.max(0,earnedPaise-paidPaise)};
}
