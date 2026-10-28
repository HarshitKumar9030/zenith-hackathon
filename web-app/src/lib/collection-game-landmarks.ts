export const ECO_TRAIL=[
 {id:'willow',name:'Willow gateway',x:-360,z:270},
 {id:'campus',name:'Campus lane',x:-240,z:90},
 {id:'canal',name:'Canal drive',x:240,z:210},
 {id:'workshop',name:'Maker crossing',x:240,z:-90},
 {id:'hub',name:'Circular avenue',x:0,z:-270},
 {id:'oldtown',name:'Old Town turn',x:-240,z:-270},
];
export function visitEcoTrail(visited:Set<string>,x:number,z:number,seconds:number){
 const landmark=ECO_TRAIL.find(p=>!visited.has(p.id)&&Math.hypot(x-p.x,z-p.z)<=6);
 if(!landmark)return null;visited.add(landmark.id);
 return {landmark,bonus:Math.max(0,Math.min(5,300-seconds))};
}
