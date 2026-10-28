export const speedNeedleAngle=(speed:number)=>-135+Math.max(0,Math.min(100,Number.isFinite(speed)?speed:0))/100*270;
export const toggleDrivingCamera=(view:number)=>view===1?0:1;
export function driverView(x:number,z:number,heading:number){
 const dx=Math.cos(heading),dz=-Math.sin(heading);
 return {eye:{x:x+dx*1.85,y:2.95,z:z+dz*1.85},target:{x:x+dx*25,y:2.65,z:z+dz*25}};
}
export function chaseOffset(heading:number){return {x:-Math.cos(heading)*15,y:8.5,z:Math.sin(heading)*15};}
