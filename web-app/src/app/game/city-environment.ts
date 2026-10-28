import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {BoxCollider} from '@/lib/collection-game-rules';
type CityCollider=BoxCollider&{name?:string};
type Placement={x:number;z:number;y?:number;yaw?:number;scale?:number;height?:number;width?:number;depth?:number};
type TrafficPose={x:number;z:number;yaw:number};
interface TrafficBatch {meshes:THREE.InstancedMesh[];indices:number[];scale:number;center:THREE.Vector3;minY:number}
export class CityEnvironment {
 readonly root=new THREE.Group();
 private carBatches:TrafficBatch[]=[];
 private people:{root:THREE.Group;model:THREE.Object3D;mixer:THREE.AnimationMixer;index:number}[]=[];
 private object=new THREE.Object3D();
 private textures=new Set<THREE.Texture>();
 constructor(private source:THREE.Group,private colliders:CityCollider[]){
  this.root.name='Kenney_City_Environment';source.updateMatrixWorld(true);
  source.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){if(m.map)this.textures.add(m.map);m.roughness=.8;m.metalness=.03;m.envMapIntensity=.25;}});
 }
 /** Include the original 0.75m roof eaves and projecting windows, not just the wall box. */
 upgradeBuildings(city:THREE.Group){
  const buildings=this.colliders.filter(c=>(!c.name||c.name.startsWith("Building"))&&c.size[1]>5&&c.size[0]>10&&c.size[2]>10);
  city.updateMatrixWorld(true);
  const p=new THREE.Vector3(),q=new THREE.Vector3(),r=new THREE.Vector3();
  city.traverse(node=>{
   if(!(node instanceof THREE.Mesh)||!node.name.includes('__'))return;
   if(/__(leaf|leafLight|trunk)$/.test(node.name)){node.visible=false;return;}
   const g=node.geometry,position=g.attributes.position,index=g.index,kept:number[]=[];
   for(let i=0;i<(index?.count??position.count);i+=3){
    const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
    p.fromBufferAttribute(position,a).applyMatrix4(node.matrixWorld);q.fromBufferAttribute(position,b).applyMatrix4(node.matrixWorld);r.fromBufferAttribute(position,c).applyMatrix4(node.matrixWorld);
    const x=(p.x+q.x+r.x)/3,y=(p.y+q.y+r.y)/3,z=(p.z+q.z+r.z)/3;
    if(y>.48&&buildings.some(b=>Math.abs(x-b.center[0])<=b.size[0]/2+1.1&&Math.abs(z-b.center[2])<=b.size[2]/2+1.1))continue;
    kept.push(a,b,c);
   }
   g.setIndex(kept);g.clearGroups();g.computeBoundingSphere();
  });
  const variants=['building-type-a','building-type-b','building-type-f','building-type-i','building-type-p'];
  variants.forEach((name,i)=>this.batch(name,buildings.filter((_,j)=>j%variants.length===i).map((c,j)=>({x:c.center[0],z:c.center[2],y:.4,width:c.size[0]*.98,depth:c.size[2]*.98,yaw:j%2?Math.PI:0}))));
 }
 private free(x:number,z:number,radius=2){return Math.abs(x)<366&&Math.abs(z)<366&&!this.colliders.some(c=>Math.abs(x-c.center[0])<c.size[0]/2+radius&&Math.abs(z-c.center[2])<c.size[2]/2+radius);}
 populate(){
  const trees:Placement[][]=[[],[],[]],flowers:Placement[]=[],bushes:Placement[]=[],planters:Placement[]=[];
  let i=0;
  for(let road=-360;road<=360;road+=120)for(let z=-330;z<=330;z+=60)for(const side of [-1,1]){
   const x=road+side*16;if(this.free(x,z,2)){trees[i%3].push({x,z,height:6+(i%4)*.8,y:.4,yaw:i*2.4});i++;}
   if(this.free(road+side*12,z+8,1))flowers.push({x:road+side*12,z:z+8,height:.6,y:.4,yaw:i});
  }
  for(let x=-330;x<=330;x+=60)for(const z of [-346,-134,134,346])if(this.free(x,z,2))bushes.push({x,z,height:1.25,y:.4,yaw:x});
  for(const [x,z]of [[-346,286],[-346,314],[14,-46],[14,-74],[254,166],[254,194]])if(this.free(x,z,1))planters.push({x,z,y:.4,height:1.3});
  ['tree_oak','tree_oak_dark','tree_pineRoundA'].forEach((n,i)=>this.batch(n,trees[i]));
  this.batch('plant_bushDetailed',bushes);this.batch('flower_yellowA',flowers);this.batch('planter',planters);
  const cars=['sedan','hatchback-sports','taxi','van'];
  cars.forEach((name,variant)=>{
   const indices=Array.from({length:18},(_,i)=>i).filter(i=>i%4===variant),source=this.source.getObjectByName('asset_'+name)!;
   const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=4.2/size.z;
   const meshes=this.batch(name,indices.map(()=>({x:0,z:0,y:.4,scale})));
   this.carBatches.push({meshes,indices,scale,center,minY:box.min.y});
  });
 }
 private batch(name:string,placements:Placement[]){
  const prefab=this.source.getObjectByName('asset_'+name);if(!prefab||!placements.length)return [];
  const bounds=new THREE.Box3().setFromObject(prefab),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),meshes:THREE.InstancedMesh[]=[];
  const normalization=new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z);
  prefab.traverse(child=>{
   if(!(child instanceof THREE.Mesh))return;
   const geometry=child.geometry.clone().applyMatrix4(child.matrixWorld).applyMatrix4(normalization);
   const mesh=new THREE.InstancedMesh(geometry,child.material,placements.length);mesh.castShadow=true;mesh.receiveShadow=true;
   placements.forEach((p,i)=>{
    let scale=p.scale??1;
    if(p.height)scale=p.height/size.y;
    if(p.width&&p.depth)scale=Math.min(p.width/size.x,p.depth/size.z);
    this.object.position.set(p.x,p.y??.4,p.z);this.object.rotation.set(0,p.yaw??0,0);this.object.scale.setScalar(scale);this.object.updateMatrix();mesh.setMatrixAt(i,this.object.matrix);
   });
   mesh.computeBoundingSphere();this.root.add(mesh);meshes.push(mesh);
  });
  return meshes;
 }
 attachPeople(sources:GLTF[]){
  if(!sources.length)return;
  for(let i=0;i<36;i++){
   const source=sources[i%sources.length],model=cloneSkeleton(source.scene),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   const root=new THREE.Group();root.scale.setScalar(2.4/size.y);model.position.set(-center.x,-bounds.min.y,-center.z);root.add(model);this.root.add(root);
   model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){if(m.map)this.textures.add(m.map);m.roughness=.85;}}});
   const mixer=new THREE.AnimationMixer(model),walk=source.animations.find(a=>a.name==='walk');
   if(walk){const action=mixer.clipAction(walk);action.time=i*.137;action.timeScale=.8+(i%4)*.12;action.play();mixer.update(0);}
   this.people.push({root,model,mixer,index:i});
  }
 }
 updatePeople(actors:TrafficPose[],dt:number){
  for(const person of this.people){const pose=actors[person.index];if(!pose)continue;person.root.position.set(pose.x,.8,pose.z);person.root.rotation.y=pose.yaw;person.mixer.update(dt);}
 }
 updateTraffic(actors:TrafficPose[]){
  for(const batch of this.carBatches){
   batch.indices.forEach((actor,i)=>{
    const pose=actors[actor];if(!pose)return;
    this.object.position.set(pose.x,.45,pose.z);this.object.rotation.set(0,pose.yaw+Math.PI,0);this.object.scale.setScalar(batch.scale);this.object.updateMatrix();
    for(const mesh of batch.meshes)mesh.setMatrixAt(i,this.object.matrix);
   });
   for(const mesh of batch.meshes){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  }
 }
 dispose(){
  for(const p of this.people){p.mixer.stopAllAction();p.mixer.uncacheRoot(p.model);p.model.traverse(o=>{if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();});}this.people=[];
  for(const t of this.textures)t.dispose();this.textures.clear();
  // Source geometries were cloned into instancing batches; they are not attached to the live scene.
  const geometries=new Set<THREE.BufferGeometry>();this.source.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});for(const g of geometries)g.dispose();
 }
}
