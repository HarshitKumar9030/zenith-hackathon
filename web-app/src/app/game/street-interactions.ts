import * as THREE from 'three';
import {sortingBonus,SORTING_STATIONS,type Body,type Wall} from '@/lib/collection-game-physics';
const SORTING_STOPS=SORTING_STATIONS;
export class StreetInteractions{
 readonly root=new THREE.Group();
 readonly bodies:Body[]=[];
 readonly walls:Wall[]=[];
 private props:{body:Body;mesh:THREE.Group;start:{x:number;z:number};tilt:number}[]=[];
 private stations:{mesh:THREE.Group;lid:THREE.Mesh;ring:THREE.Mesh;id:string;time:number}[]=[];
 private visited=new Set<string>();
 private textures:THREE.CanvasTexture[]=[];
 dispose(){for(const texture of this.textures)texture.dispose();this.textures=[];}
 constructor(){
  const material=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.65});
  const orange=material(0xf49c52),white=material(0xf9eed7),dark=material(0x243e36),green=material(0x98c978),wood=material(0xb08d60);
  const box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(.45,1.3,12),band=new THREE.CylinderGeometry(.24,.32,.23,12);
  const add=(group:THREE.Group,geometry:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  // Roadside clusters leave the lane centre and player spawn clear.
  for(const [cx,cz] of [[-360,300],[-240,180],[-120,60],[0,-60],[120,-180],[240,300],[360,-300]])for(let i=0;i<4;i++){
   const x=cx+((i%2)?7:-7),z=cz+Math.floor(i/2)*6,isCone=i%3!==2;
   const mesh=new THREE.Group();
   if(isCone){add(mesh,box,dark,0,.16,0,.95,.14,.95);add(mesh,cone,orange,0,.83,0);add(mesh,band,white,0,.87,0);}
   else{add(mesh,box,wood,0,.62,0,1.1,1.1,1.1);for(const dz of [-.45,.45])add(mesh,box,dark,0,.62,dz,1.13,.12,.06);}
   mesh.position.set(x,.35,z);this.root.add(mesh);
   const body:Body={x,z,vx:0,vz:0,radius:isCone?.50:.73,mass:isCone?.07:.25};
   this.bodies.push(body);this.props.push({body,mesh,start:{x,z},tilt:0});
  }
  for(const stop of SORTING_STOPS){
   const mesh=new THREE.Group();mesh.position.set(stop.x,.35,stop.z);this.root.add(mesh);
   add(mesh,box,dark,0,1.2,0,3.6,2.4,2.8);add(mesh,box,green,0,1.5,1.42,3.2,1.25,.05);
   const lid=add(mesh,box,green,0,2.5,0,3.8,.22,3);
   // Three raised arrows form a recycling loop, readable without a texture download.
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const arrow=add(mesh,new THREE.ConeGeometry(.27,.9,3),white,Math.cos(a)*.62,1.5+Math.sin(a)*.53,1.48);arrow.rotation.z=a-Math.PI/2;arrow.rotation.x=Math.PI/2;}
   const ring=new THREE.Mesh(new THREE.RingGeometry(4.3,4.6,48),new THREE.MeshBasicMaterial({color:0x9deac7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.10;mesh.add(ring);
   const sign=add(mesh,box,green,0,5,0,4.8,1.2,.15);add(mesh,new THREE.CylinderGeometry(.07,.07,3,6),dark,0,3.6,0);
   const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;const ctx=canvas.getContext("2d");
   if(ctx){ctx.fillStyle="#98c978";ctx.fillRect(0,0,512,128);ctx.fillStyle="#173c2d";ctx.textAlign="center";ctx.font="bold 38px Arial";ctx.fillText("SORTING STOP",256,56);ctx.font="24px Arial";ctx.fillText("CHECK CARGO · +10 SEC",256,99);}
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);sign.material=new THREE.MeshStandardMaterial({map:texture,roughness:.8});
   sign.name=stop.name;this.stations.push({mesh,lid,ring,id:stop.id,time:0});this.walls.push({x:stop.x,z:stop.z,hx:1.9,hz:1.5});
  }
 }
 nearby(x:number,z:number){return SORTING_STOPS.find(s=>!this.visited.has(s.id)&&Math.hypot(x-s.x,z-s.z)<18)??null;}
 use(x:number,z:number,collected:number,seconds:number){
  const stop=this.nearby(x,z);if(!stop)return null;
  const bonus=sortingBonus(this.visited,stop.id,collected,seconds);
  if(!this.visited.has(stop.id))return {bonus:0,message:'Collect some waste before checking in at a sorting stop.'};
  const station=this.stations.find(s=>s.id===stop.id)!;station.time=2;
  (station.ring.material as THREE.MeshBasicMaterial).color.setHex(0x6d8d80);
  return {bonus,message:`Cargo checked at ${stop.name}. +${bonus.toFixed(0)} seconds!`};
 }
 update(dt:number){
  for(const p of this.props){
   p.mesh.position.set(p.body.x,.35,p.body.z);
   const speed=Math.hypot(p.body.vx,p.body.vz);p.tilt+=(Math.min(.95,speed*.07)-p.tilt)*(1-Math.exp(-8*dt));
   p.mesh.rotation.x=p.tilt*(p.body.vz/(speed||1));p.mesh.rotation.z=-p.tilt*(p.body.vx/(speed||1));
   if(speed>.2)p.mesh.rotation.y+=speed*.12*dt;
  }
  for(const s of this.stations){s.time=Math.max(0,s.time-dt);s.lid.rotation.z=Math.sin(s.time*Math.PI)*.35;s.ring.scale.setScalar(s.time>0?1+Math.sin(s.time*10)*.08:1);}
 }
 reset(){this.visited.clear();for(const p of this.props){Object.assign(p.body,p.start,{vx:0,vz:0});p.mesh.rotation.set(0,0,0);p.tilt=0;}for(const s of this.stations){s.time=0;(s.ring.material as THREE.MeshBasicMaterial).color.setHex(0x9deac7);}this.update(0);}
}
