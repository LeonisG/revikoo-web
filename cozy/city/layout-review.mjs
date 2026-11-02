// Development only: imported by city.mjs exclusively on localhost with ?layoutQA.
import * as THREE from 'three';
export const views={
  island:{target:[0,0,2],zoom:1,azimuth:-1.98,elevation:.67},
  plazaTop:{target:[1,-4,2],zoom:3.8,azimuth:-Math.PI/2,elevation:1.5707},
  plazaIso:{target:[1,-4,2],zoom:3.8,azimuth:-1.98,elevation:.67},
  paths:{target:[4,3,2],zoom:2.3,azimuth:-1.98,elevation:1.05},
  meadow:{target:[-16,15,2],zoom:2.8,azimuth:-1.98,elevation:.85},
  river:{target:[-13,0,1],zoom:1.5,azimuth:-Math.PI/2,elevation:1.2},
  waterfall:{target:[-10,-25,-.5],zoom:4.5,azimuth:-2.3,elevation:.5},
  bank:{target:[18,2,5.8],zoom:4.1,azimuth:-2.15,elevation:.42},
  alternative:{target:[0,0,2],zoom:1.1,azimuth:.7,elevation:.8}
};
export function installLayoutReview({world,scene,snapshot,view,draw}){
  const panel=document.createElement('aside');panel.id='layout-review';panel.style='position:fixed;top:4px;left:4px;z-index:35;background:#fffdf1;padding:6px;max-width:calc(100vw - 8px);font:12px monospace;';
  for(const [name,v] of Object.entries(views)){const b=document.createElement('button');b.textContent=name;b.onclick=()=>view(v);panel.append(b);}
  const metrics=document.createElement('output');metrics.id='layout-metrics';metrics.style='display:block';panel.append(metrics);document.body.append(panel);
  const tidy=document.createElement('style');tidy.textContent='body[data-scene="city"] header,body[data-scene="city"] footer,body[data-scene="city"] .intro,body[data-scene="city"] .hint{display:none!important}body[data-scene="city"] main{height:100vh!important}';document.head.append(tidy);
  const timer=setInterval(()=>{const s=snapshot();metrics.textContent=JSON.stringify({calls:s.calls,triangles:s.triangles,geometries:s.geometries,textures:s.textures,fps:+s.fps.toFixed(2),frames:s.frames,scene:s.bankState,quality:s.ambient.quality});},1000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  const b=document.createElement('button');b.textContent='Diagnóstico';panel.prepend(b);let overlay;
  b.onclick=async()=>{if(overlay){overlay.visible=!overlay.visible;draw();return;}const r=await fetch('../assets/world/island-001/spatial-audit.json');if(!r.ok)return;const a=await r.json();overlay=new THREE.Group();
    const line=(points,color,z=2.08)=>{const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p[0],p[1],z)));overlay.add(new THREE.Line(g,new THREE.LineBasicMaterial({color,depthTest:false})));};
    for(const o of a.objects)line([...o.footprint,o.footprint[0]],o.issues.length?0xff2430:0x204aaa);
    for(const r of a.reservations)for(const ring of r.rings)line(ring,0xdc8311);
    for(const z of world.layout.zones||[])line([...z.boundary,z.boundary[0]],0x4e9f58);
    for(const p of world.layout.paths?.edges||[])line(p.samples,0xffffff);
    if(world.layout.river)line(world.layout.river.samples.map(p=>p.position),0x00ffff);
    scene.add(overlay);view({...views.island,azimuth:-Math.PI/2,elevation:1.5707});draw();};
}
