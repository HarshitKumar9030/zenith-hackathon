import { z } from "zod";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { finalScore, ROUND_SECONDS, TOTAL_TARGET, WASTE, WASTE_TYPES } from "./collection-game-rules";
const cargoSchema = z.object({
 organic:z.number().int().min(0).max(3),plastic:z.number().int().min(0).max(3),paper:z.number().int().min(0).max(2),
 metal:z.number().int().min(0).max(1),glass:z.number().int().min(0).max(2),ewaste:z.number().int().min(0).max(1),
}).strict();
export const gameResultSchema = z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),cargo:cargoSchema,remainingSeconds:z.number().min(0).max(ROUND_SECONDS)}).strict();
export type GameResultInput=z.infer<typeof gameResultSchema>;
export function resultSummary(input:GameResultInput){
 const count=WASTE_TYPES.reduce((n,t)=>n+input.cargo[t],0);
 return {count,complete:count===TOTAL_TARGET,score:finalScore(input.cargo,input.remainingSeconds)};
}
/** Generate the attachment from validated counts. Never accept arbitrary HTML, files or scores. */
export async function gameResultAttachment(input:GameResultInput){
 const {score,count,complete}=resultSummary(input);
 const rows=WASTE_TYPES.map((t,i)=>`<text x="${80+(i%3)*310}" y="${1535+Math.floor(i/3)*100}" fill="${WASTE[t].color}" font-size="30" font-weight="700">${WASTE[t].label}  ${input.cargo[t]}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#132e25"/><g font-family="sans-serif" fill="#f2f3dd"><text x="80" y="120" font-size="34" fill="#b9eb7c" font-weight="600">ECOMITRA / CIRCULAR CITY</text><text x="80" y="280" font-size="80" font-weight="700">${complete?'City. Cleaned.':'Every pickup'}</text><text x="80" y="380" font-size="80" font-weight="700">${complete?'Mission. Complete.':'makes a difference.'}</text><rect x="80" y="450" width="920" height="650" rx="40" fill="#ced7c5"/><text x="80" y="1290" font-size="150" fill="#b9eb7c" font-weight="700">${score.toLocaleString('en-IN')}</text><text x="84" y="1340" font-size="30">COLLECTION SCORE</text><text x="80" y="1440" font-size="34" font-weight="700">${count} / ${TOTAL_TARGET} pickups</text>${rows}<text x="80" y="1790" font-size="28">Drive. Discover. Collect.</text><text x="80" y="1840" font-size="22">EcoMitra game result · simulated waste collection</text></g></svg>`;
 const truck=await readFile(path.join(process.cwd(),'public/game/truck-preview.png'));
 const mask=Buffer.from('<svg width="920" height="650"><rect width="920" height="650" rx="40" fill="white"/></svg>');
 const image=await sharp(truck).resize(920,650,{fit:'cover'}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 return sharp(Buffer.from(svg)).composite([{input:image,left:80,top:450}]).png().toBuffer();
}
