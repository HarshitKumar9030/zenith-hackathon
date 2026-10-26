import {test} from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {fingerprintScan} from './scan-fingerprint';
import {perceptualDistance} from './discovery-policy';
test('decoded-pixel identity ignores metadata; perceptual matches cannot imply object identity',async()=>{
 const pixels=Buffer.alloc(96*64*3);for(let y=0;y<64;y++)for(let x=0;x<96;x++){const i=(y*96+x)*3;pixels[i]=(x*19+y*7)%256;pixels[i+1]=(x*7+y*11)%256;pixels[i+2]=(x*13+y*23)%256;}
 const image=sharp(pixels,{raw:{width:96,height:64,channels:3}});
 const first=await image.clone().png().toBuffer(),metadata=await image.clone().withMetadata({density:300}).png().toBuffer(),jpeg=await image.clone().jpeg({quality:95}).toBuffer();
 const inspect=(buffer:Buffer,type='png')=>fingerprintScan(`data:image/${type};base64,${buffer.toString('base64')}`);
 const [a,b,c]=await Promise.all([inspect(first),inspect(metadata),inspect(jpeg,'jpeg')]);
 assert.equal(a.fingerprint.exact,b.fingerprint.exact);assert.notEqual(a.fingerprint.exact,c.fingerprint.exact);assert.equal(a.fingerprint.perceptual.length,64);assert.equal(perceptualDistance(a.fingerprint.perceptual,b.fingerprint.perceptual),0);assert.ok(a.thumbnail.startsWith('data:image/jpeg;base64,'));
 await assert.rejects(()=>fingerprintScan('data:image/svg+xml;base64,abc'));
 await assert.rejects(()=>fingerprintScan('data:image/jpeg;base64,YWJj'));
});
