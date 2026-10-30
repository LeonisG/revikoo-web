const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),report={};
for(const file of ['assets/characters/nilo/nilo.glb','assets/interiors/bank-office/bank-office.glb']){
 const b=fs.readFileSync(path.join(root,file));assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(j.scenes.length,1);assert.equal(j.buffers.length,1);assert.ok(!j.buffers[0].uri);
 for(const view of j.bufferViews)assert.ok((view.byteOffset||0)+view.byteLength<=j.buffers[0].byteLength);
 const triangles=j.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+j.accessors[p.indices].count/3,0),0),clips=(j.animations||[]).map(a=>({name:a.name,duration:Math.max(...a.samplers.map(s=>j.accessors[s.input].max[0])),channels:a.channels.length}));
 if(file.includes('nilo.glb')){assert.deepEqual(clips.map(c=>c.name).sort(),['NILO_GREET','NILO_IDLE','NILO_STAMP','NILO_WRITE']);assert.ok(triangles>=10000&&triangles<=25000);assert.ok(j.nodes.some(n=>n.name==='Nilo_Body'));assert.ok(j.nodes.some(n=>n.name==='Nilo_Blink_L'));for(const c of clips)assert.ok(c.channels>=3&&c.duration>0);}
 else{assert.ok(triangles<100000);assert.ok(!j.animations?.length);for(const name of ['VaultDoor','NiloChair','Ledger','DeskLamp','DocumentTray'])assert.ok(j.nodes.some(n=>n.name===name),name);assert.ok(!j.nodes.some(n=>n.name==='Nilo_Body'));}
 report[file]={bytes:b.length,triangles,meshes:j.meshes.length,materials:j.materials.map(m=>m.name),clips,sha256:crypto.createHash('sha256').update(b).digest('hex')};
}
const bank=fs.readFileSync(path.join(root,'assets/world/island-001/bank-island.glb'));assert.equal(crypto.createHash('sha256').update(bank).digest('hex'),'7e37897593a84b9e97bdd60b72e829ffc5d09dca9529b2572b455f74c11e908d');
fs.writeFileSync(path.join(root,'docs/qa/bank-office/models.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
