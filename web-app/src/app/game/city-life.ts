import * as THREE from "three";
import type {Wall} from "@/lib/collection-game-physics";
interface Actor { route:THREE.CatmullRomCurve3; progress:number; speed:number; yaw:number; x:number; z:number }
const TAU=Math.PI*2;
/** Traffic yields to the truck and provides kinematic collision footprints. */
export class CityLife {
 readonly root=new THREE.Group();
 readonly solidWalls:Wall[]=[];
 walkerPoses(){return this.walkers.map(a=>({x:a.x,z:a.z,yaw:a.yaw}));}
 useDetailedPeople(){for(const mesh of [this.torsos,this.heads,this.legs])mesh.visible=false;}
 trafficPoses(){return this.cars.map(a=>({x:a.x,z:a.z,yaw:a.yaw}));}
 useDetailedTraffic(){for(const mesh of [this.carBody,this.carGlass,this.carRoof,this.carWheels,this.headlights,this.taillights])mesh.visible=false;}
 trafficWalls():Wall[]{return this.cars.map(a=>({x:a.x,z:a.z,hx:1.02,hz:2.25,yaw:a.yaw}));}
 private cars:Actor[]=[];
 private walkers:Actor[]=[];
 private carBody:THREE.InstancedMesh;
 private carGlass:THREE.InstancedMesh;
 private carRoof:THREE.InstancedMesh;
 private carWheels:THREE.InstancedMesh;
 private headlights:THREE.InstancedMesh;
 private taillights:THREE.InstancedMesh;
 private torsos:THREE.InstancedMesh;
 private heads:THREE.InstancedMesh;
 private legs:THREE.InstancedMesh;
 private birdLeft:THREE.InstancedMesh;
 private birdRight:THREE.InstancedMesh;
 private flags:THREE.InstancedMesh;
 private particles:THREE.Points;
 private particleTime=2;
 private burstOrigin=new THREE.Vector3();
 private particlePositions=new Float32Array(48*3);
 private particleVelocity=new Float32Array(48*3);
 private time=0;
 private object=new THREE.Object3D();
 private point=new THREE.Vector3();
 private direction=new THREE.Vector3();
 private texture:THREE.CanvasTexture;
 constructor(){
  this.root.name="Living_City_Ambience";
  const box=new THREE.BoxGeometry(1,1,1),wheel=new THREE.CylinderGeometry(1,1,1,10);
  const material=(color:number,emissive=0)=>new THREE.MeshStandardMaterial({color,roughness:.75,emissive,emissiveIntensity:.4});
  const cream=material(0xeee9ce),dark=material(0x253a39),metal=material(0x3b524c),rubber=material(0x25312d);
  this.carBody=this.instances(box,material(0xffffff),18,true);this.carGlass=this.instances(box,material(0x37575b),18);
  this.carRoof=this.instances(box,cream,18);this.carWheels=this.instances(wheel,rubber,72);this.headlights=this.instances(box,material(0xffe7a1,0xffd57a),36);this.taillights=this.instances(box,material(0xbb5549),36);
  const colours=[0xb7cb73,0xba8b74,0x91b6ce,0xb6a3cc,0xdfd8b4,0x5c9c86];
  for(let i=0;i<18;i++){
   const zone=i%9,cx=(zone%3-1)*240,cz=(Math.floor(zone/3)-1)*240;
   const route=this.rectangle(cx,cz,116,116,14);
   this.cars.push({route,progress:i===6?.80:((i*.319+.18)%1),speed:6.5+(i%4)*1.1,yaw:0,x:0,z:0});
   this.carBody.setColorAt(i,new THREE.Color(colours[i%colours.length]));
  }
  this.torsos=this.instances(new THREE.CapsuleGeometry(.22,.50,3,6),material(0xffffff),36,true);
  this.heads=this.instances(new THREE.SphereGeometry(.23,8,6),material(0xffffff),36);
  this.legs=this.instances(box,dark,72);
  const skin=[0xd7b58b,0x9a6e50,0xc08d63,0x7f5842];
  for(let i=0;i<36;i++){
   const col=i%6,row=Math.floor(i/6)%6;
   this.walkers.push({route:this.rectangle(-300+col*120,-300+row*120,43,43,6),progress:(i*.271+.12)%1,speed:.8+(i%4)*.12,yaw:0,x:0,z:0});
   this.torsos.setColorAt(i,new THREE.Color(colours[(i+2)%colours.length]));this.heads.setColorAt(i,new THREE.Color(skin[i%skin.length]));
  }
  // Streetlights stay instanced; there are no dozens of expensive point lights.
  const poles=this.instances(new THREE.CylinderGeometry(.12,.17,1,7),metal,50,true);
  const arms=this.instances(box,metal,50),lamps=this.instances(box,material(0xffe7a4,0xffd88c),50);
  let lamp=0;
  for(let x=-240;x<=240;x+=120)for(let z=-240;z<=240;z+=120)for(const side of [-1,1]){
   this.solidWalls.push({x:x+side*13,z:z+13,hx:.2,hz:.2});
   this.transform(poles,lamp,x+side*13,3.9,z+13,0,1,6.6,1);
   this.transform(arms,lamp,x+side*12.2,7.1,z+13,0,2,.13,.16);
   this.transform(lamps,lamp,x+side*11.4,7,z+13,0,.9,.18,.6);lamp++;
  }
  // Shelters and planters add street-level detail without filling road lanes.
  for(const [x,z] of [[-347,285],[133,45],[-107,-195]]){
   this.solidWalls.push({x,z,hx:.6,hz:2.6});
   const canopy=new THREE.Mesh(new THREE.BoxGeometry(3.6,.3,7.4),cream);canopy.position.set(x,3.9,z);canopy.castShadow=true;this.root.add(canopy);
   for(const dz of [-3,3]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,3.2,6),metal);post.position.set(x,2.15,z+dz);this.root.add(post);}
   const seat=new THREE.Mesh(new THREE.BoxGeometry(1.1,.3,5),material(0x8caa78));seat.position.set(x,1.2,z);seat.castShadow=true;this.root.add(seat);
   for(const dz of [-1.8,1.8]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.5,.25),metal);leg.position.set(x,.82,z+dz);this.root.add(leg);}
  }
  const wing=new THREE.BufferGeometry();wing.setAttribute("position",new THREE.Float32BufferAttribute([0,0,0,.95,0,.35,.35,0,-.28],3));wing.computeVertexNormals();
  const wingMaterial=new THREE.MeshBasicMaterial({color:0x3d514a,side:THREE.DoubleSide});
  this.birdLeft=this.instances(wing,wingMaterial,12);this.birdRight=this.instances(wing.clone().scale(-1,1,1),wingMaterial,12);
  const flagGeometry=new THREE.BufferGeometry();flagGeometry.setAttribute("position",new THREE.Float32BufferAttribute([-1.3,0,0,1.3,0,0,0,-2.3,0],3));flagGeometry.computeVertexNormals();
  this.flags=this.instances(flagGeometry,new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:1}),44);
  for(let i=0;i<44;i++)this.flags.setColorAt(i,new THREE.Color(colours[i%colours.length]));
  for(const z of [250,350]){
   const rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-110,8.6,z),new THREE.Vector3(110,8.6,z)]),new THREE.LineBasicMaterial({color:0x54654d}));this.root.add(rope);
  }
  const canvas=document.createElement("canvas");canvas.width=canvas.height=32;const ctx=canvas.getContext("2d");
  if(ctx){const gradient=ctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,"#fff");gradient.addColorStop(.45,"rgba(255,255,255,.9)");gradient.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);}
  this.texture=new THREE.CanvasTexture(canvas);
  const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute("position",new THREE.BufferAttribute(this.particlePositions,3));
  this.particles=new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0xbde881,size:.35,map:this.texture,transparent:true,depthWrite:false}));this.particles.frustumCulled=false;this.particles.visible=false;this.root.add(this.particles);
  this.update(0,new THREE.Vector3(-360,.35,330),true);
 }
 private rectangle(x:number,z:number,hx:number,hz:number,r:number){
  return new THREE.CatmullRomCurve3([
   new THREE.Vector3(x-hx+r,0,z-hz),new THREE.Vector3(x+hx-r,0,z-hz),new THREE.Vector3(x+hx,0,z-hz+r),new THREE.Vector3(x+hx,0,z+hz-r),
   new THREE.Vector3(x+hx-r,0,z+hz),new THREE.Vector3(x-hx+r,0,z+hz),new THREE.Vector3(x-hx,0,z+hz-r),new THREE.Vector3(x-hx,0,z-hz+r),
  ],true,"centripetal");
 }
 private instances(geometry:THREE.BufferGeometry,material:THREE.Material,count:number,shadow=false){
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=shadow;mesh.receiveShadow=true;
  mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(),600);this.root.add(mesh);return mesh;
 }
 private transform(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,yaw:number,sx:number,sy:number,sz:number,roll=0){
  this.object.position.set(x,y,z);this.object.rotation.set(0,yaw,roll);this.object.scale.set(sx,sy,sz);this.object.updateMatrix();mesh.setMatrixAt(i,this.object.matrix);
 }
 private part(mesh:THREE.InstancedMesh,i:number,a:Actor,lx:number,y:number,lz:number,sx:number,sy:number,sz:number,roll=0){
  this.transform(mesh,i,a.x+lx*Math.cos(a.yaw)+lz*Math.sin(a.yaw),y,a.z-lx*Math.sin(a.yaw)+lz*Math.cos(a.yaw),a.yaw,sx,sy,sz,roll);
 }
 reset(){this.particleTime=2;this.particles.visible=false;}
 burst(position:number[],colour:string){
  this.burstOrigin.fromArray(position);this.particleTime=0;this.particles.visible=true;(this.particles.material as THREE.PointsMaterial).color.set(colour);
  for(let i=0;i<48;i++){const angle=i*2.39996;this.particleVelocity.set([Math.cos(angle)*(2+i%3),3+i%5,Math.sin(angle)*(2+i%3)],i*3);}
 }
 update(dt:number,player:THREE.Vector3,running:boolean){
  if(running)this.time+=dt;else dt=0;
  this.cars.forEach((a,i)=>{
   a.route.getPointAt(a.progress,this.point);const yieldToTruck=Math.hypot(player.x-this.point.x,player.z-this.point.z)<18;
   a.progress=(a.progress+(yieldToTruck?0:a.speed)*dt/a.route.getLength())%1;
   a.route.getPointAt(a.progress,this.point);a.route.getTangentAt(a.progress,this.direction);a.x=this.point.x;a.z=this.point.z;a.yaw=Math.atan2(this.direction.x,this.direction.z);
   this.part(this.carBody,i,a,0,1.03,0,1.9,.9,4.2);this.part(this.carGlass,i,a,0,1.72,.12,1.65,.75,2.3);this.part(this.carRoof,i,a,0,2.14,.12,1.8,.12,2.5);
   for(let side=0;side<2;side++){
    const lx=side===0?-.95:.95;
    for(let axle=0;axle<2;axle++)this.part(this.carWheels,i*4+side*2+axle,a,lx,.69,axle===0?-1.35:1.35,.42,.24,.42,Math.PI/2);
    this.part(this.headlights,i*2+side,a,lx*.7,1.13,2.12,.36,.24,.08);this.part(this.taillights,i*2+side,a,lx*.7,1.13,-2.12,.36,.22,.08);
   }
  });
  this.walkers.forEach((a,i)=>{
   a.progress=(a.progress+a.speed*dt/a.route.getLength())%1;a.route.getPointAt(a.progress,this.point);a.route.getTangentAt(a.progress,this.direction);
   a.x=this.point.x;a.z=this.point.z;a.yaw=Math.atan2(this.direction.x,this.direction.z);
   const stride=Math.sin(this.time*6+i)*.18;
   this.part(this.torsos,i,a,0,1.77,0,1,1,1);this.part(this.heads,i,a,0,2.40,0,1,1,1);
   this.part(this.legs,i*2,a,-.13,1.02,stride,.16,.64,.19);this.part(this.legs,i*2+1,a,.13,1.02,-stride,.16,.64,.19);
  });
  for(let i=0;i<12;i++){
   const angle=this.time*.16+i*2.17,x=(i%3-1)*240+Math.cos(angle)*32,z=(Math.floor(i/3)%3-1)*240+Math.sin(angle)*32,y=26+Math.sin(angle*2+i)*3;
   const flap=Math.sin(this.time*7+i)*.65;
   this.transform(this.birdLeft,i,x,y,z,-angle,1,1,1,flap);this.transform(this.birdRight,i,x,y,z,-angle,1,1,1,-flap);
  }
  for(let i=0;i<44;i++)this.transform(this.flags,i,-105+(i%22)*10,8.6,i<22?250:350,Math.sin(this.time*1.7+i*.4)*.2,1,1,1,Math.sin(this.time*2+i*.5)*.13);
  if(this.particles.visible){
   this.particleTime+=dt;const t=this.particleTime;
   for(let i=0;i<48;i++){this.particlePositions[i*3]=this.burstOrigin.x+this.particleVelocity[i*3]*t;this.particlePositions[i*3+1]=this.burstOrigin.y+1+this.particleVelocity[i*3+1]*t-5*t*t;this.particlePositions[i*3+2]=this.burstOrigin.z+this.particleVelocity[i*3+2]*t;}
   this.particles.geometry.attributes.position.needsUpdate=true;(this.particles.material as THREE.PointsMaterial).opacity=Math.max(0,1-t);if(t>1)this.particles.visible=false;
  }
  for(const mesh of [this.carBody,this.carGlass,this.carRoof,this.carWheels,this.headlights,this.taillights,this.torsos,this.heads,this.legs,this.birdLeft,this.birdRight,this.flags])mesh.instanceMatrix.needsUpdate=true;
 }
 dispose(){
  this.root.removeFromParent();this.texture.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  this.root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
}
