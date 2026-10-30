const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../assets/world/island-001'),manifest={units:'meters',authoringUp:'Z',gltfUp:'Y',files:{}};
for(const file of ['terrain.glb','environment-kit.glb','bank-island.glb','path-kit.glb']){
 const b=fs.readFileSync(path.join(dir,file));assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(j.scenes.length,1,'Only the intended scene must be exported');assert.equal(j.buffers.length,1);assert.ok(!j.buffers[0].uri);
 for(const v of j.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=j.buffers[0].byteLength);
 const triangles=j.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+j.accessors[p.indices??p.attributes.POSITION].count/3,0),0);
 const clips=(j.animations||[]).map(a=>({name:a.name,duration:Math.max(...a.samplers.map(s=>j.accessors[s.input].max[0])),targets:[...new Set(a.channels.map(c=>j.nodes[c.target.node].name))]}));
 if(file==='bank-island.glb'){assert.deepEqual(clips.map(c=>c.name).sort(),['DOORS_CLOSED','DOORS_CLOSING','DOORS_OPENING']);for(const c of clips){assert.ok(Math.abs(c.duration-.8)<.001);assert.equal(c.targets.length,2);}}
 manifest.files[file]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),meshes:j.meshes.length,materials:j.materials.length,triangles,clips};
 if(file==='bank-island.glb')assert.equal(manifest.files[file].sha256,'7e37897593a84b9e97bdd60b72e829ffc5d09dca9529b2572b455f74c11e908d','V2 must preserve the bank and its door clips');
 if(file==='environment-kit.glb'){assert.ok(j.meshes.length<=60,'Shared palettes must keep the library compact');assert.ok(j.meshes.some(m=>m.primitives.some(p=>p.attributes.COLOR_0!==undefined)),'Palette vertex colors must survive GLB export');}
 if(file==='environment-kit.glb')manifest.assets=[...new Set(j.nodes.map(n=>n.extras?.asset).filter(Boolean))].sort();
}
const placements=JSON.parse(fs.readFileSync(path.join(dir,'placements.json'))),layout=JSON.parse(fs.readFileSync(path.join(dir,'layout.json')));for(const p of placements){assert.ok(manifest.assets.includes(p.asset));assert.ok(p.scale>0);assert.ok(p.position.every(Number.isFinite));}assert.equal(layout.plots.length,3);
manifest.placements=placements.length;manifest.plots=layout.plots;fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest,null,2));
