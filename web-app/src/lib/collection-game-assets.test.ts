import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
function asset(name:string){
 const bytes=readFileSync(join(process.cwd(),'public/game',name));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
 const model=JSON.parse(bytes.subarray(20,20+length).toString());
 assert.ok(bytes.length<2*1024*1024);
 for(const item of [...(model.images??[]),...(model.buffers??[])])if(item.uri)assert.ok(item.uri.startsWith('data:'),'Assets must not need missing or external texture files');
 return model;
}
test('packed city assets are self-contained glTF with all requested prefab roots',()=>{
 const model=asset('city-assets.glb'),names=new Set(model.nodes.map((n:{name?:string})=>n.name));
 for(const name of ['building-type-a','building-type-b','building-type-f','building-type-i','building-type-p','tree_oak','tree_oak_dark','tree_pineRoundA','plant_bushDetailed','flower_yellowA','planter','sedan','hatchback-sports','taxi','van'])assert.ok(names.has('asset_'+name),name);
});
test('pedestrian assets include embedded textures, skins and walking animation',()=>{
 for(const name of ['character-male-a.glb','character-female-a.glb']){const model=asset(name);assert.ok(model.skins?.length);assert.ok(model.animations.some((a:{name:string})=>a.name==='walk'));}
});
