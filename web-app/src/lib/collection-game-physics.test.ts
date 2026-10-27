import {test} from 'node:test';
import assert from 'node:assert/strict';
import {physicsStep,sortingBonus,WORLD_WALLS,type Body} from './collection-game-physics';
const truck=(x=0,z=0,vx=0,vz=0):Body=>({x,z,vx,vz,mass:5,radius:1.35,capsule:1.6,yaw:0});
test('fast truck cannot tunnel through a thin wall and rebounds',()=>{
 const t=truck(0,0,26,0);for(let i=0;i<15;i++)physicsStep(t,[],[{x:6,z:0,hx:.1,hz:20}],.05);
 assert.ok(t.x<3);assert.ok(t.vx<=0);
});
test('diagonal impact preserves tangential motion instead of sticking',()=>{
 const t=truck(0,0,26,8);for(let i=0;i<10;i++)physicsStep(t,[],[{x:6,z:0,hx:.1,hz:50}],.05);
 assert.ok(t.x<3);assert.ok(t.z>1);assert.ok(t.vz>0);
});
test('truck transfers momentum to a light street prop',()=>{
 const t=truck(0,0,15,0),prop:Body={x:4,z:0,vx:0,vz:0,radius:.55,mass:.08};
 for(let i=0;i<12;i++)physicsStep(t,[prop],[],.05);
 assert.ok(prop.x>5);assert.ok(t.vx<15);assert.ok(prop.vx>0);
});
test('world boundary constrains entire capsule, including reverse and rotated truck',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI]){const t=truck(360,360,26,26);t.yaw=yaw;
 for(let i=0;i<40;i++)physicsStep(t,[],WORLD_WALLS,.05);
 assert.ok(t.x<=368.66);assert.ok(t.z<=368.66);assert.ok(Number.isFinite(t.vx));}
});
test('zero delta does not move unobstructed bodies',()=>{const t=truck(0,0,20,0);physicsStep(t,[],[],0);assert.equal(t.x,0);});
test('sorting bonuses require cargo, cannot repeat and never exceed round duration',()=>{
 const visited=new Set<string>();assert.equal(sortingBonus(visited,'a',0,250),0);assert.equal(visited.size,0);
 assert.equal(sortingBonus(visited,'a',1,295),5);assert.equal(sortingBonus(visited,'a',2,240),0);
 assert.equal(sortingBonus(visited,'b',2,240),10);
});
