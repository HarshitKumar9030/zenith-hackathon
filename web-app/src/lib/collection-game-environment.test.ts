import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CityEnvironment} from '../app/game/city-environment';
test('building replacement preserves ground, pickups and collision footprints',()=>{
 const pack=new THREE.Group(),prefab=new THREE.Group();prefab.name='asset_building-type-a';
 const source=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),new THREE.MeshStandardMaterial());source.position.y=1.5;prefab.add(source);pack.add(prefab);
 const city=new THREE.Group(),old=new THREE.Mesh(new THREE.BoxGeometry(20,10,20),new THREE.MeshStandardMaterial());old.name='district__ivory';old.position.y=5.4;city.add(old);
 const rim=new THREE.Mesh(new THREE.BoxGeometry(21.5,1,21.5),new THREE.MeshStandardMaterial());rim.name='district__roof';rim.position.y=11;city.add(rim);
 const window=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.5,.18),new THREE.MeshStandardMaterial());window.name='district__window';window.position.set(0,7,10.08);city.add(window);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(800,800),new THREE.MeshStandardMaterial());ground.name='district__grass';ground.rotation.x=-Math.PI/2;ground.position.y=.4;city.add(ground);
 const pickup=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());pickup.name='Pickup_001';pickup.position.set(0,1,0);city.add(pickup);
 const colliders=[{center:[0,5.4,0],size:[20,10,20]}],before=JSON.stringify(colliders),pickupIndex=pickup.geometry.index!.count,groundIndex=ground.geometry.index!.count;
 const environment=new CityEnvironment(pack,colliders);environment.upgradeBuildings(city);
 assert.equal(rim.geometry.index!.count,0);assert.equal(window.geometry.index!.count,0);assert.equal(old.geometry.index!.count,6); // The ground-facing base remains; walls and roof are replaced.
 assert.equal(ground.geometry.index!.count,groundIndex);assert.equal(pickup.geometry.index!.count,pickupIndex);assert.equal(JSON.stringify(colliders),before);
 const box=new THREE.Box3().setFromObject(environment.root),size=box.getSize(new THREE.Vector3());assert.ok(size.x<=20&&size.z<=20);assert.ok(size.x>19);assert.ok(Math.abs(box.min.y-.4)<.001);environment.dispose();
});
