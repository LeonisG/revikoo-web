/* SOFT ISOMETRIC PIXEL DIORAMA: offline, four real world-space orientations.
 * Each box is transformed before culling and projection. Light stays in world
 * space. No CSS image rotations or mirrored light sources. */
import { CELL, TILT, SYM, MAT, polygon } from './lib.mjs';
export const FAMILIES = {
  'oak-study': { wood: MAT.oak, trim: MAT.walnut, cloth: MAT.sage },
  'green-retro': { wood: MAT.pine, trim: MAT.walnut, cloth: MAT.sage },
  'soft-cream': { wood: MAT.pine, trim: MAT.oak, cloth: MAT.cream },
};
export function furnitureSprite(item, rotation) {
  const W = item.w * CELL, D = item.h * CELL, boxes = [];
  const b = (x,y,z,w,d,h,mat = MAT.oak) => boxes.push({x,y,z,w,d,h,mat});
  const legs = (h, inset=10, thick=12, mat=MAT.walnut) => {
    for (const x of [inset,W-inset-thick]) for (const y of [inset,D-inset-thick]) b(x,y,0,thick,thick,h,mat);
  };
  const drawer = (x,y,z,w,d,h,mat=MAT.oak) => {
    b(x,y,z,w,d,h,mat); b(x+4,y+d,z+4,w-8,3,h-8,MAT.pine);
    b(x+w*.33,y+d+3,z+h*.48,w*.34,4,4,MAT.walnut);
  };
  if (item.id.startsWith('desk')) {
    legs(128); b(5,5,128,W-10,D-10,14);
    b(12,9,83,W-24,8,38,MAT.walnut);
    drawer(W-66,12,63,52,D-25,55);
    b(14,14,142,W-92,D-28,2,MAT.sage);
  } else if (item.id === 'chair') {
    legs(63,17,10); b(12,12,60,W-24,D-24,12,MAT.walnut);
    b(14,14,72,W-28,D-28,12,MAT.sage);
    b(13,9,77,W-26,10,71,MAT.walnut); b(19,19,86,W-38,6,52,MAT.sage);
    b(10,25,94,8,D-37,9); b(W-18,25,94,8,D-37,9);
    b(10,D-22,72,8,8,24); b(W-18,D-22,72,8,8,24);
  } else if (item.id === 'bed-cream') {
    legs(31,12,17); b(7,7,24,W-14,D-14,25,MAT.pine);
    b(8,8,46,W-16,D-16,25,MAT.cream);
    b(6,5,35,15,D-10,112,MAT.oak);
    b(21,15,73,47,D/2-21,13,MAT.white); b(21,D/2+6,73,47,D/2-21,13,MAT.white);
    b(83,8,72,W-91,D-16,8,MAT.sage);
    b(W-71,8,80,47,D-16,4,MAT.cream);
    for (let y=17;y<D-12;y+=16) b(W-70,y,75,46,3,6,MAT.white);
  } else if (item.id === 'drawers') {
    legs(18,12,13); b(7,7,16,W-14,D-14,104,MAT.walnut);
    for (let i=0;i<3;i++) drawer(10,10,22+i*30,W-20,D-20,27);
    b(5,5,114,W-10,D-10,8,MAT.pine);
  } else if (item.id.includes('wardrobe')) {
    const mat=item.id==='wardrobe-dark'?MAT.walnut:MAT.oak;
    legs(18,12,14,mat);
    if (item.id==='wardrobe-rack') {
      b(8,8,16,W-16,D-16,10,mat);
      for(const x of [10,W-20]) b(x,D/2-5,26,10,10,228,MAT.charcoal);
      b(10,D/2-5,250,W-20,10,10,mat);
      [MAT.sage,MAT.cream,MAT.coral,MAT.slate].forEach((m,i)=>{
        b(27+i*31,D/2-14,244,18,28,4,MAT.brass);
        b(22+i*31,D/2-12,91,27,24,145,m);
      });
      b(7,7,260,W-14,D-14,9,mat);
    } else {
      b(7,7,18,W-14,D-14,278,mat);
      for(let i=0;i<2;i++) {
        b(13+i*(W-26)/2,D-7,26,(W-30)/2,3,258,item.id==='wardrobe-dark'?MAT.walnut:MAT.pine);
        b(W/2+(i?8:-12),D-3,135,4,5,28,MAT.charcoal);
      }
      b(5,5,296,W-10,D-10,8,mat);
    }
  } else if (item.id==='bookshelf'||item.id==='shelf-small') {
    const H=item.top, levels=item.id==='bookshelf'?4:2;
    b(8,8,10,W-16,7,H-10,MAT.walnut);
    b(7,8,6,9,D-16,H-6); b(W-16,8,6,9,D-16,H-6);
    const palette=[MAT.sage,MAT.coral,MAT.cream,MAT.teal,MAT.burgundy];
    for(let k=0;k<levels;k++) {
      const z=12+k*(H-18)/levels; b(8,8,z,W-16,D-16,7);
      let x=20;
      for(let i=0;x<W-25;i++,x+=17) {
        const height=Math.min((H-18)/levels-13,34+(i*7+k*5)%18);
        b(x,18,z+7,12,D-39,height,palette[(i+k)%palette.length]);
        b(x+2,D-20,z+14,8,2,3,MAT.cream);
      }
    }
    b(5,5,H-5,W-10,D-10,7,MAT.pine);
  }
  const turn = (x,y,z) => {
    x-=W/2; y-=D/2;
    if(rotation===90) [x,y]=[-y,x];
    if(rotation===180) [x,y]=[-x,-y];
    if(rotation===270) [x,y]=[y,-x];
    return [x,y,z];
  };
  const project = ([x,y,z]) => [SYM.ax+x-y,SYM.ay+(x+y)*TILT-z].map(v=>+v.toFixed(2));
  const faces=[];
  for(const {x,y,z,w,d,h,mat} of boxes) {
    const points=[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z],[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]].map(p=>turn(...p));
    // Visibility after rotation; top plus the two faces toward the camera.
    const quads=[[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
    for(let i=0;i<quads.length;i++) {
      const q=quads[i].map(j=>points[j]);
      if(i) {
        const a=q[0],c=q[1], nx=c[1]-a[1], ny=-(c[0]-a[0]);
        if(nx+ny<=0) continue;
      }
      const isX=i && Math.abs(q[0][0]-q[1][0])<.01;
      const fill=mat[i===0?0:isX?2:1];
      const axis = i === 0 ? 2 : isX ? 0 : 1;
      faces.push({ q, original: q, fill, axis, plane: q[0][axis] });
    }
  }
  // Painted shadow offset to lower right, independent of furniture orientation.
  const corners=[[8,8,0],[W-8,8,0],[W-8,D-8,0],[8,D-8,0]].map(p=>project(turn(...p))).map(([x,y])=>[x+7,y+6]);
  return polygon(corners,'#302a23','opacity=".22" stroke="none"')+painter(faces).map(face => {
    // BSP cuts are invisible. Only the original face boundaries get an outline.
    const edges = face.q.map((a,i) => {
      const b=face.q[(i+1)%face.q.length];
      const boundary=face.original.some((c,j)=>{
        const d=face.original[(j+1)%face.original.length];
        return [0,1,2].filter(k=>Math.abs(c[k]-d[k])<.001).every(k=>Math.abs(a[k]-c[k])<.001&&Math.abs(b[k]-c[k])<.001);
      });
      return boundary ? `M${project(a)}L${project(b)}` : '';
    }).join('');
    return polygon(face.q.map(project),face.fill,`stroke="${face.fill}" stroke-width=".6" stroke-linejoin="round"`)+`<path d="${edges}" fill="none" stroke="#493d32" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"/>`;
  }).join('');
}

// Axis-aligned BSP painter: faces of a tall cabinet must occlude books at every
// height. Sorting by average depth alone makes rear-facing shelves transparent.
function painter(faces) {
  if (faces.length < 2) return faces;
  const pivot=faces[Math.floor(faces.length/2)], {axis,plane}=pivot;
  const back=[],front=[],same=[];
  for(const face of faces) {
    const values=face.q.map(p=>p[axis]-plane);
    if(values.every(v=>Math.abs(v)<.001)) { same.push(face); continue; }
    if(values.every(v=>v<=.001)) { back.push(face); continue; }
    if(values.every(v=>v>=-.001)) { front.push(face); continue; }
    const clip=sign=> {
      const out=[];
      face.q.forEach((a,i)=>{
        const b=face.q[(i+1)%face.q.length], da=(a[axis]-plane)*sign, db=(b[axis]-plane)*sign;
        if(da>=0)out.push(a);
        if((da<0&&db>0)||(da>0&&db<0)) { const t=da/(da-db); out.push(a.map((v,k)=>v+(b[k]-v)*t)); }
      });
      return {...face,q:out};
    };
    back.push(clip(-1)); front.push(clip(1));
  }
  return [...painter(back),...same,...painter(front)];
}
