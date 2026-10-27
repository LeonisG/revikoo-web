// Requires Khronos glTF-Validator as an authoring dependency, never in the app.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const validator=require(process.env.GLTF_VALIDATOR_MODULE || 'gltf-validator');
const dir=path.resolve(__dirname,'../assets/candidates/tripo-desk'),bytes=fs.readFileSync(path.join(dir,'desk.glb'));
(async()=>{
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:'desk.glb',maxIssues:100});
  fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString());
  const primitives=(gltf.meshes||[]).flatMap(m=>m.primitives);
  const stats={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
    nodes:gltf.nodes?.length,meshes:gltf.meshes?.length,materials:gltf.materials?.length,
    triangles:primitives.reduce((n,p)=>n+gltf.accessors[p.indices??p.attributes.POSITION].count/3,0),
    normals:primitives.every(p=>p.attributes.NORMAL!==undefined),uv:primitives.every(p=>p.attributes.TEXCOORD_0!==undefined),
    externalBuffers:(gltf.buffers||[]).filter(b=>b.uri).length,externalImages:(gltf.images||[]).filter(i=>i.uri).length,
    requiredExtensions:gltf.extensionsRequired||[],animations:gltf.animations?.length||0,
    errors:report.issues.numErrors,warnings:report.issues.numWarnings,hints:report.issues.numHints,
    structuralReview:'Single mesh/node. Drawer fronts and handles are geometry, not independently articulated parts.'};
  fs.writeFileSync(path.join(dir,'technical-summary.json'),JSON.stringify(stats,null,2)+'\n');
  console.log(JSON.stringify(stats));if(stats.errors)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
