// Run only after visual review and validation. Originals remain in candidates/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../assets/', import.meta.url));
for (const id of process.argv.slice(2)) {
  if (!/^[a-z-]+$/.test(id)) throw new Error('Invalid asset id');
  const collection = id.startsWith('finance-') ? 'finance' : 'oak';
  const src = path.join(root, 'candidates', 'tripo-'+id), target = path.join(root, 'models', collection, id);
  const report = JSON.parse(fs.readFileSync(path.join(src,'validation.json')));
  if (report.issues.numErrors) throw new Error('Invalid glTF: '+id);
  const { PILOT_FRAMES } = await import(new URL('../assets/candidates/tripo-'+id+'/frames.mjs',import.meta.url));
  const { PILOT_GEOMETRY } = await import(new URL('../assets/candidates/tripo-'+id+'/geometry.mjs',import.meta.url));
  fs.mkdirSync(target,{recursive:true});
  for (const file of [id+'.glb','provenance.json','technical-summary.json',...Object.keys(PILOT_FRAMES).flatMap(a=>[`view-${a}.webp`,`shadow-${a}.webp`])]) fs.copyFileSync(path.join(src,file),path.join(target,file));
  const frames=Object.fromEntries(Object.entries(PILOT_FRAMES).map(([a,f])=>[a,{...f,src:`models/${collection}/${id}/view-${a}.webp`,shadowSrc:`models/${collection}/${id}/shadow-${a}.webp`,visualStatus:'RELEASED'}]));
  const geometry={...PILOT_GEOMETRY,visualStatus:'RELEASED'};
  fs.writeFileSync(path.join(target,'asset.mjs'),`// Reviewed release; generated from the preserved GLB.\nexport const asset = ${JSON.stringify({id,frames,geometry,model:`models/${collection}/${id}/${id}.glb`},null,2)};\n`);
  console.log('Promoted '+id);
}
