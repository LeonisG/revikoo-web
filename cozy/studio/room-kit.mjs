import * as THREE from 'three';

// Parametric Oak joinery: one kit for all sizes, with real window/door openings.
// Units match the furniture contract. Everything is geometry in the same scene.
export function createRoomKit(layout) {
  const group=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();
  group.add(left,right);
  const texture=woodTexture(),wood=new THREE.MeshStandardMaterial({color:0xc4935a,map:texture,roughness:.82});
  const dark=new THREE.MeshStandardMaterial({color:0x53604b,roughness:.95});
  const wall=new THREE.MeshStandardMaterial({color:layout.color,roughness:1});
  const cream=new THREE.MeshStandardMaterial({color:0xe7dfc7,roughness:.9});
  const brass=new THREE.MeshStandardMaterial({color:0xa8844d,metalness:.45,roughness:.45});
  const w=layout.width,d=layout.depth,h=236;
  function block(parent,x,y,z,sx,sy,sz,material,bevel=.7) {
    const shape=new THREE.Shape();shape.moveTo(-sx/2,-sy/2);shape.lineTo(sx/2,-sy/2);shape.lineTo(sx/2,sy/2);shape.lineTo(-sx/2,sy/2);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:sz,steps:1,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2});
    geo.translate(0,0,-sz/2);
    const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,-y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  block(group,w/2,d/2,-14,w+14,d+14,16,dark,3);
  // Staggered plank joins and restrained grain provide scale at every room size.
  const rows=Math.ceil(d/31),step=d/rows;
  for(let row=0;row<rows;row++){
    const split=row%2===0?w*.43:w*.66;
    for(const [a,b] of [[0,split],[split,w]]){
      const material=wood.clone();material.color.offsetHSL(0,0,((row*7)%5-2)*.012);
      block(group,(a+b)/2,(row+.5)*step,-.8,b-a-1.1,step-1,2,material,.3);
    }
  }
  // Left wall has a door opening; right wall has a window opening.
  const doorY=d*.72,doorW=66,doorH=174;
  for(const [a,b] of [[0,doorY-doorW/2],[doorY+doorW/2,d]])block(left,-4,(a+b)/2,h/2,8,b-a,h,wall);
  block(left,-4,doorY,(h+doorH)/2,8,doorW,h-doorH,wall);
  const winX=w*layout.window,winW=100,winZ=105,winH=94;
  for(const [a,b] of [[0,winX-winW/2],[winX+winW/2,w]])block(right,(a+b)/2,-4,h/2,b-a,8,h,wall);
  block(right,winX,-4,winZ/2,winW,8,winZ,wall);
  block(right,winX,-4,(winZ+winH+h)/2,winW,8,h-winZ-winH,wall);
  // Lower wall panels, baseboard, picture rail and cornice.
  for(let y=22;y<d;y+=42){if(Math.abs(y-doorY)<doorW/2+8)continue;block(left,1.2,y,36,2,32,53,dark,.3);block(left,3,y,36,2,27,47,wall,.3);}
  for(let x=22;x<w;x+=42){block(right,x,1.2,36,32,2,53,dark,.3);block(right,x,3,36,27,2,47,wall,.3);}
  for(const [a,b] of [[0,doorY-doorW/2],[doorY+doorW/2,d]]){
    block(left,3,(a+b)/2,7,6,b-a,12,cream);block(left,2,(a+b)/2,68,5,b-a,4,cream);
  }
  for(const [z,thick,height] of [[7,6,12],[68,5,4],[h-5,10,9],[h+1,13,4]]){
    block(right,w/2,2,z,w,thick,height,cream);
    if(z>h-10)block(left,2,d/2,z,thick,d,height,cream);
  }
  block(left,3,d,116,8,8,232,cream);block(right,w,3,116,8,8,232,cream);
  // Door leaf set back in its opening; recessed panels and handle are independent.
  block(left,-3,doorY,doorH/2,3,doorW-4,doorH-2,cream,.5);
  for(const z of [42,121]){block(left,-.3,doorY,z,2,doorW-16,65,dark,.3);block(left,1,doorY,z,2,doorW-20,60,wall,.5);}
  for(const y of [doorY-doorW/2,doorY+doorW/2])block(left,3,y,doorH/2,7,6,doorH+5,wood);
  block(left,3,doorY,doorH+3,7,doorW+12,7,wood);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,8),brass);knob.position.set(7,-(doorY-doorW*.3),86);left.add(knob);
  const sky=new THREE.MeshBasicMaterial({map:skyTexture(layout.light,layout.weather),side:THREE.DoubleSide});
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(winW,winH),sky);pane.rotation.x=Math.PI/2;pane.position.set(winX,8,winZ+winH/2);right.add(pane);
  for(const x of [winX-winW/2,winX+winW/2])block(right,x,0,winZ+winH/2,7,12,winH+13,wood);
  for(const z of [winZ,winZ+winH])block(right,winX,0,z,winW+12,12,7,wood);
  block(right,winX,1,winZ+winH/2,3,6,winH,cream,.3);
  block(right,winX,1,winZ+winH*.52,winW,6,3,cream,.3);
  block(right,winX,6,winZ-5,winW+20,23,5,wood,1.2);
  // A small restrained curtain rail frames the opening without baking scenery.
  block(right,winX,5,winZ+winH+13,winW+30,3,3,brass,.5);
  const curtain=new THREE.MeshStandardMaterial({color:0xe5d6ad,roughness:1});
  for(const x of [winX-winW/2-5,winX+winW/2+5])for(let i=0;i<4;i++)block(right,x+i*3-4,6+(i%2)*2,winZ+winH/2,3,2,winH+14,curtain,.7);
  group.userData={left,right};
  return group;
}
function woodTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');
  c.fillStyle='#eee1bd';c.fillRect(0,0,256,128);
  let seed=19;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<100;i++){const y=random()*128;c.strokeStyle=`rgba(111,76,32,${.015+random()*.065})`;c.lineWidth=.3+random()*.8;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(75,y+random()*7,175,y-random()*7,256,y+2);c.stroke();}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.007,.025);return t;
}
function skyTexture(light,weather){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,0,128);
  const colors=light==='night'?['#283c59','#718491']:light==='sunset'?['#d89b85','#efc89c']:['#a7c6bd','#e9e3bd'];
  g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);c.fillStyle=g;c.fillRect(0,0,128,128);
  c.fillStyle=light==='night'?'#e3dfbf':'#fff1c5';c.beginPath();c.arc(85,31,10,0,Math.PI*2);c.fill();
  c.fillStyle='#7d9477';c.beginPath();c.moveTo(0,115);c.bezierCurveTo(40,50,68,135,128,85);c.lineTo(128,128);c.lineTo(0,128);c.fill();
  if(weather==='rain'){c.fillStyle='#40596a33';c.fillRect(0,0,128,128);c.strokeStyle='#edf3e9a0';c.lineWidth=.8;for(let i=0;i<35;i++){const x=(i*31)%128,y=(i*47)%128;c.beginPath();c.moveTo(x,y);c.lineTo(x-2,y+8);c.stroke();}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function disposeKit(group){
  const materials=new Set(),textures=new Set();group.traverse(n=>{n.geometry?.dispose();if(n.material)materials.add(n.material);});
  for(const m of materials){if(m.map)textures.add(m.map);m.dispose();}for(const t of textures)t.dispose();
}
