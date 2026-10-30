import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id),host=$('viewport'),status=$('status');
let renderer;
function fail(message){status.textContent='';$('fallback').hidden=false;$('error-message').textContent=message;$('doors').disabled=true;}
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{fail('La vista 3D no está disponible en este navegador. Puedes ver el banco en esta imagen.');}
if(renderer)start().catch(error=>{console.error(error);fail('No se ha podido cargar el banco. Comprueba tu conexión y vuelve a intentarlo.');});

async function start(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,150);camera.up.set(0,0,1);
  scene.add(new THREE.HemisphereLight(0xfff5df,0x7c8570,2.1));
  const key=new THREE.DirectionalLight(0xffe3b0,3.5);key.position.set(-10,-16,24);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:60});key.shadow.normalBias=.07;key.shadow.bias=-.0006;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xdde8ff,1.4);fill.position.set(10,5,15);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({opacity:.15}));ground.position.z=-.01;ground.receiveShadow=true;scene.add(ground);
  let azimuth=-2.15,elevation=.42,zoom=1,scheduled=0,mixer,playing=false,lastTime=0,opened=false,loaded=false;
  const target=new THREE.Vector3(0,0,3.6),pointers=new Map();let pinchDistance=0;
  function draw(){if(!scheduled)scheduled=requestAnimationFrame(t=>{scheduled=0;if(playing){mixer.update(Math.min((t-lastTime)/1000,.05));lastTime=t;}renderer.render(scene,camera);if(playing)draw();});}
  function aim(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h,span=aspect<1?20/aspect:18;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.zoom=zoom;camera.updateProjectionMatrix();camera.position.set(target.x+35*Math.cos(elevation)*Math.cos(azimuth),target.y+35*Math.cos(elevation)*Math.sin(azimuth),target.z+35*Math.sin(elevation));camera.lookAt(target);$('zoom').value=Math.round(zoom*100)+'%';draw();}
  function zoomBy(factor){zoom=THREE.MathUtils.clamp(zoom*factor,.55,3.5);aim();}
  function rotate(dx,dy=0){azimuth+=dx;elevation=THREE.MathUtils.clamp(elevation+dy,.12,1.35);aim();}
  function reset(){azimuth=-2.15;elevation=.42;zoom=1;aim();}
  new ResizeObserver(aim).observe(host);aim();
  host.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?host.clientHeight:1);zoomBy(Math.exp(-THREE.MathUtils.clamp(delta,-200,200)*.0015));},{passive:false});
  host.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;host.focus({preventScroll:true});host.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinchDistance=0;});
  host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){rotate(-(e.clientX-prev.x)*.007,(e.clientY-prev.y)*.005);}else{const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)zoomBy(distance/pinchDistance);pinchDistance=distance;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,e=>{pointers.delete(e.pointerId);pinchDistance=0;});
  host.addEventListener('keydown',e=>{const actions={ArrowLeft:()=>rotate(-.12),ArrowRight:()=>rotate(.12),ArrowUp:()=>rotate(0,.08),ArrowDown:()=>rotate(0,-.08),'+':()=>zoomBy(1.12),'=':()=>zoomBy(1.12),'-':()=>zoomBy(1/1.12),Home:reset};if(actions[e.key]){e.preventDefault();actions[e.key]();}});
  $('left').onclick=()=>rotate(-Math.PI/8);$('right').onclick=()=>rotate(Math.PI/8);$('reset').onclick=reset;$('in').onclick=()=>zoomBy(1.2);$('out').onclick=()=>zoomBy(1/1.2);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;fail('La vista 3D se ha pausado. Recarga la página para recuperarla.');});
  document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(!document.hidden)draw();});
  const gltf=await new GLTFLoader().loadAsync(new URL('../assets/buildings/bank/cozy_bank.glb',import.meta.url).href);
  const model=gltf.scene;model.rotation.x=Math.PI/2;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);loaded=true;
  mixer=new THREE.AnimationMixer(model);const clips=new Map(gltf.animations.map(c=>[c.name,c]));
  mixer.addEventListener('finished',()=>{playing=false;$('doors').disabled=false;draw();});
  $('doors').disabled=!(clips.has('DOORS_OPENING')&&clips.has('DOORS_CLOSING'));
  $('doors').onclick=()=>{mixer.stopAllAction();const clip=clips.get(opened?'DOORS_CLOSING':'DOORS_OPENING'),action=mixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();opened=!opened;$('doors').setAttribute('aria-pressed',String(opened));$('doors').innerHTML=(opened?'Cerrar las puertas':'Abrir las puertas')+' <span>↗</span>';
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){mixer.update(clip.duration);draw();}else{playing=true;$('doors').disabled=true;lastTime=performance.now();draw();}};
  status.textContent='Bienvenido a Cozy City.';draw();
  // Read-only diagnostics for regression checks; no access to room saved state.
  window.cozyCity={snapshot:()=>({loaded,azimuth,elevation,zoom,opened,playing,clips:[...clips.keys()],triangles:renderer.info.render.triangles,calls:renderer.info.render.calls}),doorPose:()=>{const result=[];model.traverse(o=>{if(o.name.startsWith('LeftDoor')||o.name.startsWith('RightDoor'))if(!o.isMesh)result.push({name:o.name,quaternion:o.quaternion.toArray()});});return result;}};
}
