import {mkdir,copyFile} from 'node:fs/promises';
const output=new URL('./dist/',import.meta.url);
await mkdir(output,{recursive:true});
for(const filename of ['index.html','style.css','app.js'])await copyFile(new URL(filename,import.meta.url),new URL(filename,output));
console.log('Built static leaderboard: index.html, style.css, app.js');
