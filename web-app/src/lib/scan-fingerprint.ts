import sharp from 'sharp';
import {createHash} from 'node:crypto';
export type ScanFingerprint={exact:string;perceptual:string;width:number;height:number};
/** Pixel identity is evidence of a reused frame, not proof of physical-object identity. */
export async function fingerprintScan(dataUrl:string):Promise<{fingerprint:ScanFingerprint;thumbnail:string}>{
 const match=dataUrl.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
 if(!match)throw new Error('Unsupported scan image');
 const buffer=Buffer.from(match[1],'base64');
 if(buffer.length>6*1024*1024)throw new Error('Scan image is too large');
 const pipeline=sharp(buffer,{limitInputPixels:20_000_000}).rotate().toColourspace('srgb').flatten({background:'#fff'});
 const {data,info}=await pipeline.clone().resize(1024,1024,{fit:'inside',withoutEnlargement:true}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const exact=createHash('sha256').update(`${info.width}:${info.height}:`).update(data).digest('hex');
 const small=await pipeline.clone().resize(17,16,{fit:'fill'}).greyscale().extractChannel(0).raw().toBuffer();
 let bits='';for(let y=0;y<16;y++)for(let x=0;x<16;x++)bits+=small[y*17+x]>small[y*17+x+1]?'1':'0';
 let perceptual='';for(let i=0;i<bits.length;i+=4)perceptual+=parseInt(bits.slice(i,i+4),2).toString(16);
 const thumbnail='data:image/jpeg;base64,'+(await pipeline.clone().resize(256,256,{fit:'inside',withoutEnlargement:true}).jpeg({quality:65}).toBuffer()).toString('base64');
 return {fingerprint:{exact,perceptual,width:info.width,height:info.height},thumbnail};
}
