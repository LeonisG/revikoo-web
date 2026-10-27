import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RELEASED } from '../assets/released.mjs';
import { CATALOG } from '../logic/catalog.mjs';
import { createRoomKit, disposeKit } from './room-kit.mjs';
import { KEY, initialLayout, validLayout, fits, corners } from './layout.mjs';

const $=id=>document.getElementById(id),status=$('status'),host=$('viewport');
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
catch(error){fail('Tu navegador no ha podido iniciar WebGL. Puedes seguir usando la habitación ilustrada.');}
function fail(message){$('fallback').hidden=false;$('fallback-message').textContent=message;status.textContent='';}
if(renderer)start().catch(()=>fail('No se han podido cargar los muebles. Comprueba tu conexión y vuelve a abrir el estudio.'));

async function start(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('La vista 3D se ha pausado. Recarga para recuperarla; tu boceto está guardado.');});
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-500,500,500,-500,.1,4000);camera.up.set(0,0,1);
  const ambient=new THREE.HemisphereLight(0xfff5dc,0x485842,2.3);ambient.position.set(0,0,700);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffe4b3,3.4);key.position.set(-200,-500,700);scene.add(key);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-700,right:700,top:700,bottom:-700,near:1,far:2000});key.shadow.normalBias=.35;key.shadow.bias=-.0001;key.shadow.radius=4;
  const fill=new THREE.DirectionalLight(0xd2e8ec,.65);fill.position.set(700,150,380);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.ShadowMaterial({opacity:.12}));ground.position.z=-23;ground.receiveShadow=true;scene.add(ground);
  const selectionLine=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf5d5a0}));scene.add(selectionLine);
  let layout=initialLayout(),saving=true;
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(validLayout(saved,RELEASED))layout=saved;else if(saved)status.textContent='El boceto anterior no es compatible; se muestra una sala nueva.';}catch{saving=false;}
  const templates=new Map(),instances=new Map(),history=[];let selected=layout.items[0]?.key||null,kit,azimuth=-Math.PI/4,elevation=.58,zoom=1,pointer=null,pending=0;
  function announce(text){status.textContent=text;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(layout));}catch{saving=false;announce('El navegador no permite guardar este boceto. Puedes seguir probando.');}}
  function checkpoint(){history.push(structuredClone(layout));if(history.length>30)history.shift();}
  function draw(){if(pending)return;pending=requestAnimationFrame(()=>{pending=0;renderer.render(scene,camera);});}
  function aim(){
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h);const span=Math.max(layout.width,layout.depth)*1.8,aspect=w/h;
    const vertical=aspect<1?span/aspect:span;
    camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.zoom=zoom;camera.updateProjectionMatrix();
    const centre=new THREE.Vector3(layout.width/2,-layout.depth/2,90);
    camera.position.set(centre.x+1200*Math.cos(elevation)*Math.cos(azimuth),centre.y+1200*Math.cos(elevation)*Math.sin(azimuth),centre.z+1200*Math.sin(elevation));camera.lookAt(centre);
    if(kit){kit.userData.left.visible=camera.position.x>0;kit.userData.right.visible=camera.position.y<0;}
    draw();
  }
  function buildRoom(){
    if(kit){scene.remove(kit);disposeKit(kit);}kit=createRoomKit(layout);scene.add(kit);
    key.intensity=layout.light==='night'?.7:layout.light==='sunset'?2.5:3.4;
    key.color.set(layout.light==='sunset'?0xffbb79:layout.light==='night'?0xa9c5ec:0xffe4b3);
    ambient.intensity=layout.light==='night'?1.1:2.3;fill.intensity=layout.light==='night'?.3:.65;
    syncControls();aim();
  }
  for(const id of Object.keys(RELEASED)){
    const asset=RELEASED[id],button=document.createElement('button');button.type='button';button.dataset.add=id;button.disabled=true;
    const img=document.createElement('img');img.src=new URL('../assets/'+asset.frames[0].src,import.meta.url);img.alt='';
    const label=document.createElement('span');label.textContent=CATALOG[id].name;const plus=document.createElement('b');plus.textContent='+';label.append(plus);button.append(img,label);$('catalog').append(button);
    button.addEventListener('click',()=>add(id));
  }
  buildRoom();new ResizeObserver(aim).observe(host);
  const loader=new GLTFLoader();
  // Sequential loading bounds decode peaks on mobile; a model is cached per type.
  for(const [id,asset] of Object.entries(RELEASED)){
    const gltf=await loader.loadAsync(new URL('../assets/'+asset.model,import.meta.url).href),model=gltf.scene;
    model.rotation.x=Math.PI/2;model.updateMatrixWorld(true);
    let bounds=new THREE.Box3().setFromObject(model);model.scale.setScalar(asset.geometry.modelBounds[0]/(bounds.max.x-bounds.min.x));model.updateMatrixWorld(true);
    bounds=new THREE.Box3().setFromObject(model);const centre=bounds.getCenter(new THREE.Vector3());model.position.set(-centre.x,-centre.y,-bounds.min.z);
    model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.material.roughness=.85;}});
    templates.set(id,model);document.querySelector(`[data-add="${id}"]`).disabled=false;syncObjects();
  }
  announce(saving?'Arrastra una pieza para colocarla. Tu boceto se guarda automáticamente.':'Puedes probar el estudio; el guardado no está disponible.');

  function syncControls(){for(const [id,key] of [['width','width'],['depth','depth'],['wall-color','color'],['window-position','window'],['light','light']])$(id).value=layout[key];$('snap').checked=layout.snap;}
  function syncObjects(){
    for(const [id,object] of instances)if(!layout.items.some(p=>p.key===id)){scene.remove(object);instances.delete(id);}
    for(const p of layout.items){
      let object=instances.get(p.key);
      if(!object&&templates.has(p.id)){object=new THREE.Group();object.add(templates.get(p.id).clone(true));object.userData.instance=p.key;instances.set(p.key,object);scene.add(object);}
      if(object){object.position.set(p.x,-p.y,0);object.rotation.z=-p.angle*Math.PI/180;}
    }
    $('selection').replaceChildren(new Option('Ninguna',''),...layout.items.map((p,i)=>new Option(`${CATALOG[p.id].name} · ${i+1}`,p.key)));
    $('selection').value=selected||'';details();draw();
  }
  function details(){const p=layout.items.find(p=>p.key===selected);for(const id of ['rotate','quarter','remove'])$(id).disabled=!p;$('undo').disabled=!history.length;
    selectionLine.visible=!!p;if(p){selectionLine.geometry.dispose();selectionLine.geometry=new THREE.BufferGeometry().setFromPoints(corners(p,RELEASED[p.id].geometry.modelBounds).map(v=>new THREE.Vector3(v.x,-v.y,2)));}
    $('coordinates').textContent=p?`${CATALOG[p.id].name} · ${p.angle}° · ${Math.round(p.x)} / ${Math.round(p.y)}`:'Selecciona una pieza para colocarla.';
    host.style.cursor=p?'grab':'default';
  }
  function change(p,next){const candidate={...p,...next};if(!fits(candidate,layout,RELEASED)){announce('Ahí no cabe: deja espacio entre las piezas y las paredes.');return false;}Object.assign(p,candidate);syncObjects();return true;}
  function rotate(amount){const p=layout.items.find(p=>p.key===selected);if(!p)return;const next={...p,angle:(p.angle+amount+360)%360};if(!fits(next,layout,RELEASED)){announce('No hay espacio para ese giro. Mueve la pieza un poco.');return;}checkpoint();Object.assign(p,next);syncObjects();save();announce(`Giro de ${p.angle}°.`);}
  function add(id){if(!templates.has(id)||layout.items.length>=30){announce('Este boceto admite hasta 30 piezas.');return;}for(let y=65;y<layout.depth;y+=22)for(let x=65;x<layout.width;x+=22){const p={key:crypto.randomUUID(),id,x,y,angle:0};if(fits(p,layout,RELEASED)){checkpoint();layout.items.push(p);selected=p.key;syncObjects();save();announce('Pieza añadida. Arrástrala o utiliza las flechas.');return;}}announce('No queda un lugar libre para esta pieza.');}
  $('rotate').onclick=()=>rotate(15);$('quarter').onclick=()=>rotate(90);
  $('remove').onclick=()=>{if(!selected)return;checkpoint();layout.items=layout.items.filter(p=>p.key!==selected);selected=null;syncObjects();save();};
  $('undo').onclick=()=>{if(!history.length)return;layout=history.pop();if(!layout.items.some(p=>p.key===selected))selected=null;buildRoom();syncObjects();save();announce('Último cambio deshecho.');};
  $('selection').onchange=()=>{selected=$('selection').value||null;details();draw();};
  $('snap').onchange=()=>{layout.snap=$('snap').checked;save();};
  for(const [id,key] of [['width','width'],['depth','depth'],['wall-color','color'],['window-position','window'],['light','light']])$(id).addEventListener('change',()=>{
    const candidate={...layout,[key]:['width','depth','window'].includes(key)?Number($(id).value):$(id).value};
    if(!validLayout(candidate,RELEASED)){announce('Mueve las piezas hacia el centro antes de reducir la habitación.');syncControls();return;}checkpoint();layout=candidate;buildRoom();details();save();
  });
  $('orbit-left').onclick=()=>{azimuth-=Math.PI/4;aim();};$('orbit-right').onclick=()=>{azimuth+=Math.PI/4;aim();};$('home').onclick=()=>{azimuth=-Math.PI/4;elevation=.58;zoom=1;$('zoom').value=1;aim();};$('zoom').oninput=()=>{zoom=Number($('zoom').value);aim();};
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  function rayAt(event){const r=host.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);}
  function floorPoint(event){rayAt(event);const point=ray.ray.intersectPlane(plane,new THREE.Vector3());return point?{x:point.x,y:-point.y}:null;}
  host.addEventListener('pointerdown',event=>{
    if(event.button!==0||pointer)return;host.focus({preventScroll:true});rayAt(event);scene.updateMatrixWorld(true);
    const hit=ray.intersectObjects([...instances.values()],true)[0];let object=hit?.object;while(object&&!object.userData.instance)object=object.parent;
    selected=object?.userData.instance||null;const p=layout.items.find(p=>p.key===selected),floor=floorPoint(event);
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,azimuth,elevation,before:structuredClone(layout),selected,offset:p&&floor?{x:p.x-floor.x,y:p.y-floor.y}:null,moved:false};
    host.setPointerCapture(event.pointerId);syncObjects();
  });
  host.addEventListener('pointermove',event=>{
    if(!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
    if(Math.abs(dx)+Math.abs(dy)<3&&!pointer.moved)return;pointer.moved=true;
    if(pointer.selected&&pointer.offset){const p=layout.items.find(p=>p.key===pointer.selected),floor=floorPoint(event);if(!floor)return;let x=floor.x+pointer.offset.x,y=floor.y+pointer.offset.y;if(layout.snap){x=Math.round(x/22)*22;y=Math.round(y/22)*22;}change(p,{x,y});}
    else{azimuth=pointer.azimuth-dx*.007;elevation=THREE.MathUtils.clamp(pointer.elevation+dy*.004,.25,1.18);aim();}
  });
  function finish(cancel=false){if(!pointer)return;const previous=pointer;pointer=null;if(host.hasPointerCapture(previous.id))host.releasePointerCapture(previous.id);
    if(cancel){layout=previous.before;syncObjects();announce('Movimiento cancelado.');}
    else if(previous.selected&&previous.moved&&JSON.stringify(previous.before)!==JSON.stringify(layout)){history.push(previous.before);if(history.length>30)history.shift();save();details();announce('Pieza colocada.');}
  }
  host.addEventListener('pointerup',()=>finish());host.addEventListener('pointercancel',()=>finish(true));host.addEventListener('lostpointercapture',()=>finish(true));
  host.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();finish(true);return;}if(pointer)return;
    if(event.key.toLowerCase()==='r'){event.preventDefault();rotate(event.shiftKey?90:15);return;}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key],p=layout.items.find(p=>p.key===selected);
    if(delta&&p){event.preventDefault();const step=layout.snap?22:event.shiftKey?22:5;const next={...p,x:p.x+delta[0]*step,y:p.y+delta[1]*step};if(fits(next,layout,RELEASED)){checkpoint();Object.assign(p,next);syncObjects();save();}else announce('No hay espacio en esa dirección.');}
  });
  // Read-only diagnostics for acceptance tests; no bypass of placement or budget.
  window.oakStudio={snapshot:()=>structuredClone(layout),metrics:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,models:templates.size,instances:instances.size}),project:(x,y,z=0)=>{const v=new THREE.Vector3(x,-y,z).project(camera),r=host.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};}};
  syncObjects();save();
}
