import * as THREE from 'three';
import {ECO_TRAIL,visitEcoTrail} from '@/lib/collection-game-landmarks';
import type {Wall} from '@/lib/collection-game-physics';
export class CityActivities {
 readonly root=new THREE.Group();
 readonly walls:Wall[]=[{x:57,z:57,hx:4.2,hz:4.2}];
 private visited=new Set<string>();
 get visitedIds(){return [...this.visited];}
 private arches=new Map<string,THREE.Group>();
 private water:THREE.Points;
 private drops=new Float32Array(80*3);
 private time=0;
 private signTexture:THREE.CanvasTexture;
 constructor(){
  const gold=new THREE.MeshStandardMaterial({color:0xf6c267,emissive:0xb26c22,emissiveIntensity:.25,roughness:.5}),base=new THREE.MeshStandardMaterial({color:0x315442});
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');
  if(ctx){ctx.fillStyle='#1d4034';ctx.fillRect(0,0,512,128);ctx.fillStyle='#ffe2a6';ctx.textAlign='center';ctx.font='bold 40px Arial';ctx.fillText('ECO TRAIL',256,56);ctx.font='26px Arial';ctx.fillText('DRIVE THROUGH · +5 SEC',256,101);}
  this.signTexture=new THREE.CanvasTexture(canvas);this.signTexture.colorSpace=THREE.SRGBColorSpace;
  const signMaterial=new THREE.MeshStandardMaterial({map:this.signTexture,roughness:.8,side:THREE.DoubleSide});
  for(const point of ECO_TRAIL){
   const arch=new THREE.Group();arch.position.set(point.x,.4,point.z);this.root.add(arch);this.arches.set(point.id,arch);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(5,.13,6,32,Math.PI),gold);ring.position.y=.15;arch.add(ring);
   for(const x of [-5,5]){const foot=new THREE.Mesh(new THREE.CylinderGeometry(.38,.5,.35,10),base);foot.position.set(x,.15,0);arch.add(foot);}
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),signMaterial);sign.position.set(0,6,0);arch.add(sign);
   const glow=new THREE.Mesh(new THREE.PlaneGeometry(9,.15),new THREE.MeshBasicMaterial({color:0xf6d396,transparent:true,opacity:.65,side:THREE.DoubleSide}));glow.rotation.x=-Math.PI/2;glow.position.y=.13;arch.add(glow);
  }
  const stone=new THREE.MeshStandardMaterial({color:0xd0c7b4,roughness:.85}),waterMat=new THREE.MeshStandardMaterial({color:0x5eabb7,metalness:.25,roughness:.15,transparent:true,opacity:.8});
  const fountain=new THREE.Group();fountain.position.set(57,.4,57);this.root.add(fountain);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(4.1,4.6,.65,32),stone);bowl.position.y=.4;bowl.receiveShadow=true;fountain.add(bowl);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(3.8,3.8,.08,32),waterMat);water.position.y=.78;fountain.add(water);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(4,.22,8,40),stone);rim.rotation.x=Math.PI/2;rim.position.y=.8;fountain.add(rim);
  const column=new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,1.6,12),stone);column.position.y=1.25;fountain.add(column);
  const top=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),waterMat);top.position.y=2.1;fountain.add(top);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.drops,3));
  this.water=new THREE.Points(g,new THREE.PointsMaterial({color:0xb9ebf0,size:.16,transparent:true,opacity:.8,depthWrite:false}));this.water.position.copy(fountain.position);this.water.frustumCulled=false;this.root.add(this.water);
  this.animate(0);
 }
 check(x:number,z:number,seconds:number){
  const visit=visitEcoTrail(this.visited,x,z,seconds);
  if(visit){const arch=this.arches.get(visit.landmark.id);if(arch)arch.visible=false;}
  return visit;
 }
 animate(dt:number){
  this.time+=dt;
  for(let i=0;i<80;i++){const a=i*2.39996,t=(this.time*.7+i/80)%1,r=t*3.5;this.drops[i*3]=Math.cos(a)*r;this.drops[i*3+1]=2.1+4.4*t-5.7*t*t;this.drops[i*3+2]=Math.sin(a)*r;}
  this.water.geometry.attributes.position.needsUpdate=true;
 }
 reset(){this.visited.clear();for(const arch of this.arches.values())arch.visible=true;this.time=0;this.animate(0);}
 dispose(){this.signTexture.dispose();}
}
