import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NiloController } from './nilo-controller.mjs';

function disposeRoot(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
async function loadGLB(file,signal){const url=new URL(file,import.meta.url);const response=await fetch(url,{signal});if(!response.ok)throw new Error(`Office resource ${response.status}`);return new GLTFLoader().parseAsync(await response.arrayBuffer(),new URL('.',url).href);}

export async function loadBankOffice(){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),20000);let office,nilo;
 try{
  const results=await Promise.allSettled([loadGLB('../assets/interiors/bank-office/bank-office.glb',abort.signal),loadGLB('../assets/characters/nilo/nilo.glb',abort.signal)]);
  [office,nilo]=results.map(r=>r.status==='fulfilled'?r.value:null);if(results.some(r=>r.status==='rejected'))throw new Error('Office resources unavailable');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xdcd1b8);
  for(const asset of [office,nilo]){asset.scene.rotation.x=Math.PI/2;asset.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(asset.scene);}
  nilo.scene.position.set(0,1.04,1.01);
  const camera=new THREE.PerspectiveCamera(46,1,.08,35);camera.up.set(0,0,1);
  const hemi=new THREE.HemisphereLight(0xfff4dd,0x74654e,1.6);hemi.position.set(0,0,5);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffe7c2,2.7);key.position.set(-3,-2,4.1);key.target.position.set(0,1,1.7);key.castShadow=true;Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:14});key.shadow.normalBias=.018;key.shadow.bias=-.0001;scene.add(key,key.target);
  const fill=new THREE.DirectionalLight(0xd6e5ee,1.6);fill.position.set(3,-2,3.4);scene.add(fill);
  const lamp=new THREE.PointLight(0xffda8d,2.2,3,2);lamp.position.set(-1.42,-.15,2.03);scene.add(lamp);
  const controller=new NiloController(nilo.scene,nilo.animations);let disposed=false;
  return {scene,camera,controller,
   resize(width,height){const aspect=width/height;camera.aspect=aspect;if(aspect<.8){camera.fov=48;camera.position.set(0,-4.10,2.48);camera.lookAt(0,1.04,2.15);}else{camera.fov=46;camera.position.set(0,-3.25,2.40);camera.lookAt(0,1.04,2.12);}camera.updateProjectionMatrix();},
   setQuality(quality){key.castShadow=quality!=='low';const size=quality==='high'?2048:1024;key.shadow.mapSize.set(size,size);key.shadow.map?.setSize(size,size);scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;});},
   setMotion(enabled){controller.setMotion(enabled);},update(dt){controller.update(dt);},
   dispose(){if(disposed)return;disposed=true;controller.dispose();disposeRoot(office.scene);disposeRoot(nilo.scene);key.shadow.map?.dispose();}
  };
 }catch(error){if(office)disposeRoot(office.scene);if(nilo)disposeRoot(nilo.scene);throw error;}finally{clearTimeout(timeout);}
}
