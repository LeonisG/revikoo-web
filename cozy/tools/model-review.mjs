// Authoring/QA only. Three is never imported by the production app.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(1); renderer.setSize(768,768); renderer.setClearColor(0x000000,0);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#viewport').append(renderer.domElement);
const scene = new THREE.Scene();
const t = .44742, elevation = Math.asin(t), frustum = 420 / Math.SQRT2;
const camera = new THREE.OrthographicCamera(-frustum/2,frustum/2,frustum*.825,-frustum*.175,.1,4000);
camera.up.set(0,0,1);
const target = new THREE.Vector3(0,0,0);
// The grid's second floor axis is opposite real Y: (X,Y,Z)=(x,-y,z).
// This handedness conversion is essential; a (+,+,+) camera mirrors grid X/Y.
function canonical() { camera.position.set(Math.cos(elevation)*1800/Math.SQRT2, -Math.cos(elevation)*1800/Math.SQRT2, Math.sin(elevation)*1800); camera.lookAt(target); }
canonical();
scene.add(new THREE.AmbientLight(0xffffff,.7));
const key = new THREE.DirectionalLight(0xffeedb,2); key.position.set(-70,-350,600); scene.add(key);
key.castShadow = true; key.shadow.mapSize.set(1024,1024);
Object.assign(key.shadow.camera,{left:-260,right:260,top:260,bottom:-260,near:1,far:1200});
key.shadow.bias=-.00015; key.shadow.normalBias=.2; key.shadow.radius=3;
const fill = new THREE.DirectionalLight(0xdbe6ec,.3); fill.position.set(350,200,250); scene.add(fill);
const root = new THREE.Group(); scene.add(root);
const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.ShadowMaterial({opacity:.25}));
shadowFloor.receiveShadow=true;shadowFloor.position.z=-.02;shadowFloor.visible=false;scene.add(shadowFloor);
const gltf = await new GLTFLoader().loadAsync('../assets/candidates/tripo-desk/desk.glb');
const model = gltf.scene;
// glTF Y-up -> Cozy Z-up. Uniform scale preserves the generated proportions.
model.rotation.x = Math.PI/2; model.updateMatrixWorld(true);
const rawBox = new THREE.Box3().setFromObject(model), rawSize = rawBox.getSize(new THREE.Vector3());
const scale = 176 / rawSize.x; model.scale.setScalar(scale); model.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(model), centre = bounds.getCenter(new THREE.Vector3());
model.position.set(-centre.x,-centre.y,-bounds.min.z); root.add(model); model.updateMatrixWorld(true);
const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
let triangles=0, meshes=0; const materials = [], textures = [];
model.traverse(node => {
  if(!node.isMesh)return; meshes++; triangles+=(node.geometry.index?.count || node.geometry.attributes.position.count)/3;
  node.castShadow=true;node.receiveShadow=true;
  const original = node.material; node.userData.originalMaterial = original;
  node.userData.albedoMaterial = new THREE.MeshBasicMaterial({map:original.map,color:original.color,side:THREE.FrontSide});
  node.userData.clayMaterial = new THREE.MeshStandardMaterial({color:0xcfcac0,roughness:.85});
  node.userData.wireMaterial = new THREE.MeshBasicMaterial({color:0x94c7a0,wireframe:true});
  node.userData.shadowMaterial = new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});
  materials.push({name:original.name,metalness:original.metalness,roughness:original.roughness});
  if(original.map)textures.push({width:original.map.image.width,height:original.map.image.height});
});
const metrics = {three:THREE.REVISION,meshes,triangles,materials,textures,rawSize:rawSize.toArray(),scale,
  normalizedSize:size.toArray(),pivot:[0,0,0],footprint:[2,1],projectedTop:size.z*Math.SQRT2*Math.cos(elevation),
  existingSurfaceHeight:132,camera:{t,elevationDegrees:elevation*180/Math.PI,position:camera.position.toArray(),target:target.toArray(),frustum:[camera.left,camera.right,camera.top,camera.bottom]},
  shadow:{type:'PCFSoftShadowMap',mapSize:1024,key:key.position.toArray(),opacity:.25,separatePass:true},
  warning:'Single generated mesh; independent drawers/doors not provided. DRAFT until geometry and style review.'};

function draw({angle=0,material='albedo',view='canonical'}={}) {
  root.rotation.z=-angle*Math.PI/180;
  model.traverse(node=>{if(node.isMesh)node.material=node.userData[material==='lit'?'originalMaterial':material+'Material'];});
  shadowFloor.visible=material==='shadow';
  canonical();
  if(view==='back') {camera.position.set(-900,900,600);camera.lookAt(0,0,20);}
  if(view==='underside') {camera.position.set(700,700,-800);camera.lookAt(0,0,50);}
  renderer.render(scene,camera); return metrics;
}
function controls() {draw({angle:Number(document.querySelector('#angle').value),material:document.querySelector('#material').value,view:document.querySelector('#view').value});}
for(const id of ['angle','material','view'])document.querySelector('#'+id).addEventListener('change',controls);
let spin=0;document.querySelector('#spin').addEventListener('click',()=>{spin+=15;draw({angle:spin,material:document.querySelector('#material').value});});
document.querySelector('#report').textContent=JSON.stringify(metrics,null,2);
window.cozyModelReview={draw,metrics,canvas:renderer.domElement};
draw();
