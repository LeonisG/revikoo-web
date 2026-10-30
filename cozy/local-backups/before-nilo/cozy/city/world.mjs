import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const base=new URL('../assets/world/island-001/',import.meta.url);
async function json(file){const r=await fetch(new URL(file,base));if(!r.ok)throw new Error(`No se pudo cargar ${file}`);return r.json();}
export async function loadWorld(scene,onProgress){
  const loader=new GLTFLoader();const [layout,placements]=await Promise.all([json('layout.json'),json('placements.json')]);
  onProgress('Dando forma a la isla…');const terrain=await loader.loadAsync(new URL('terrain.glb',base).href);terrain.scene.rotation.x=Math.PI/2;scene.add(terrain.scene);
  onProgress('Plantando los últimos árboles…');const library=await loader.loadAsync(new URL('environment-kit.glb',base).href);library.scene.updateMatrixWorld(true);
  const group=new THREE.Group();group.name='VegetationAndTownProps';scene.add(group);const instances=[],materials=new Set(),trees=placements.filter(p=>p.asset.startsWith('TREE')),lamps=placements.filter(p=>p.asset==='LAMP');
  const fix=new THREE.Matrix4().makeRotationX(Math.PI/2),dummy=new THREE.Object3D();
  library.scene.traverse(source=>{if(!source.isMesh)return;const asset=source.userData.asset||source.name.split('__')[0],items=placements.filter(p=>p.asset===asset);if(!items.length)return;
    const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld).applyMatrix4(fix);const mesh=new THREE.InstancedMesh(geometry,source.material,items.length);mesh.name=asset+'_'+source.material.name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.asset=asset;
    items.forEach((p,i)=>{dummy.position.fromArray(p.position);dummy.rotation.set(0,0,p.angle);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);instances.push(mesh);materials.add(source.material);
  });
  terrain.scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.name.includes('Water');o.receiveShadow=true;materials.add(o.material);}});
  onProgress('Abriendo el banco…');const bank=await loader.loadAsync(new URL('bank-island.glb',base).href);bank.scene.rotation.x=Math.PI/2;bank.scene.position.fromArray(layout.bank.position);bank.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;materials.add(o.material);}});scene.add(bank.scene);
  return {layout,placements,trees,lamps,instances,materials,terrain:terrain.scene,bank,dispose(){const geometries=new Set();for(const root of [terrain.scene,group,bank.scene]){root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});scene.remove(root);}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
