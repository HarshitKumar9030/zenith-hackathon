import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const port=Number(process.env.PORT||3002);
const files=new Map([['/',['index.html','text/html; charset=utf-8']],['/style.css',['style.css','text/css; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']]]);
http.createServer(async(req,res)=>{
  const route=files.get(new URL(req.url,'http://localhost').pathname);
  if(!route){res.writeHead(404);res.end('Not found');return;}
  try{const body=await readFile(fileURLToPath(new URL(route[0],import.meta.url)));res.writeHead(200,{'Content-Type':route[1],'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(body);}
  catch{res.writeHead(500);res.end('Unable to load page');}
}).listen(port,'0.0.0.0',()=>console.log(`Discovery leaderboard: http://localhost:${port}`));
