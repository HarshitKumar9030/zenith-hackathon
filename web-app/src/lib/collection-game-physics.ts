/** Planar arcade physics. Metres, seconds; truck points along (cos(yaw), -sin(yaw)). */
export interface Body { x:number; z:number; vx:number; vz:number; radius:number; mass:number; yaw?:number; capsule?:number }
export interface Wall { x:number; z:number; hx:number; hz:number; yaw?:number }
interface Contact { nx:number; nz:number; depth:number }
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function samples(body:Body){
 const c=Math.cos(body.yaw??0),s=-Math.sin(body.yaw??0),h=body.capsule??0;
 return h?[-h,0,h].map(o=>({x:body.x+c*o,z:body.z+s*o})):[{x:body.x,z:body.z}];
}
function boxContact(x:number,z:number,r:number,w:Wall):Contact|null{
 const c=Math.cos(w.yaw??0),s=Math.sin(w.yaw??0),dx=x-w.x,dz=z-w.z;
 const lx=c*dx-s*dz,lz=s*dx+c*dz;
 const qx=clamp(lx,-w.hx,w.hx),qz=clamp(lz,-w.hz,w.hz),ax=lx-qx,az=lz-qz,d=Math.hypot(ax,az);
 let nx:number,nz:number,depth:number;
 if(d>=r)return null;
 if(d>1e-8){nx=ax/d;nz=az/d;depth=r-d;}
 else if(w.hx-Math.abs(lx)<w.hz-Math.abs(lz)){nx=lx>=0?1:-1;nz=0;depth=r+w.hx-Math.abs(lx);}
 else{nx=0;nz=lz>=0?1:-1;depth=r+w.hz-Math.abs(lz);}
 return {nx:c*nx+s*nz,nz:-s*nx+c*nz,depth};
}
function resolve(a:Body,b:Body|null,c:Contact){
 const ia=1/a.mass,ib=b?1/b.mass:0,total=ia+ib;
 a.x+=c.nx*(c.depth+.001)*ia/total;a.z+=c.nz*(c.depth+.001)*ia/total;
 if(b){b.x-=c.nx*(c.depth+.001)*ib/total;b.z-=c.nz*(c.depth+.001)*ib/total;}
 const rvx=a.vx-(b?.vx??0),rvz=a.vz-(b?.vz??0),vn=rvx*c.nx+rvz*c.nz;
 if(vn>=0)return 0;
 const impulse=-1.18*vn/total;
 a.vx+=impulse*c.nx*ia;a.vz+=impulse*c.nz*ia;
 if(b){b.vx-=impulse*c.nx*ib;b.vz-=impulse*c.nz*ib;}
 const tangent=clamp((rvx*-c.nz+rvz*c.nx)/total,-impulse*.25,impulse*.25);
 a.vx+=tangent*c.nz*ia;a.vz-=tangent*c.nx*ia;
 if(b){b.vx-=tangent*c.nz*ib;b.vz+=tangent*c.nx*ib;}
 return -vn;
}
/** Substeps limit motion to <= .22m per step even at the game's maximum speed. */
export function physicsStep(truck:Body,props:Body[],walls:Wall[],delta:number){
 const dt=clamp(delta,0,.05),all=[truck,...props];let impact=0;
 const maxSpeed=Math.max(26,...all.map(b=>Math.hypot(b.vx,b.vz)));
 const steps=Math.max(1,Math.ceil(dt*maxSpeed/.22)),h=dt/steps;
 for(let step=0;step<steps;step++){
  for(const b of all){b.x+=b.vx*h;b.z+=b.vz*h;if(b!==truck){const drag=Math.exp(-2.4*h);b.vx*=drag;b.vz*=drag;}}
  for(let iteration=0;iteration<3;iteration++){
   for(const b of all){
    for(const w of walls){
     if(Math.abs(b.x-w.x)>w.hx+w.hz+(b.capsule??0)+b.radius||Math.abs(b.z-w.z)>w.hx+w.hz+(b.capsule??0)+b.radius)continue;
     for(const p of samples(b)){const c=boxContact(p.x,p.z,b.radius,w);if(c){const hit=resolve(b,null,c);if(b===truck)impact=Math.max(impact,hit);break;}}
    }
   }
   for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
    const a=all[i],b=all[j],radius=a.radius+b.radius;
    for(const p of samples(a)){
     const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz);
     if(d<radius){const hit=resolve(a,b,{nx:d>1e-8?dx/d:1,nz:d>1e-8?dz/d:0,depth:radius-d});if(a===truck)impact=Math.max(impact,hit);break;}
    }
   }
  }
 }
 return impact;
}
export const WORLD_WALLS:Wall[]=[{x:380,z:0,hx:10,hz:400},{x:-380,z:0,hx:10,hz:400},{x:0,z:380,hx:400,hz:10},{x:0,z:-380,hx:400,hz:10}];
export function sortingBonus(visited:Set<string>,id:string,collected:number,seconds:number){
 if(visited.has(id)||collected<1)return 0;
 visited.add(id);return Math.max(0,Math.min(10,300-seconds));
}

export const SORTING_STATIONS=[{id:"garden",name:"Garden sorting stop",x:-346,z:300},{id:"central",name:"Central sorting stop",x:14,z:-60},{id:"east",name:"East sorting stop",x:254,z:180}];
