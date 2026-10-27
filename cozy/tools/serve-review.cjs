// Optional local review server: no build, no backend, loopback only.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.glb':'model/gltf-binary','.json':'application/json','.ttf':'font/ttf'};
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  let file=path.resolve(root,'.'+pathname);
  if((file!==root&&!file.startsWith(root+path.sep))||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return;}
  try {
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    const stat=fs.statSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404).end();}
}).listen(Number(process.env.PORT||8767),'127.0.0.1',()=>console.log('Cozy review: http://127.0.0.1:'+(process.env.PORT||8767)+'/cozy/'));
