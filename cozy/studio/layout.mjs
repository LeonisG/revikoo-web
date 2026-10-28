// Continuous placement belongs to a separate versioned sketch, never game v2.
import { CATALOG } from '../logic/catalog.mjs';
import { geometryProfile } from '../logic/geometry-profile.mjs';
export const KEY = 'cozy-oak-studio:v1';
export const initialLayout = () => ({version:1,width:440,depth:440,color:'#63715a',window:.62,light:'day',snap:false,items:[{key:'first-desk',id:'desk',x:210,y:170,angle:0}]});
export function corners(p, bounds) {
  const a=p.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),[w,d]=bounds;
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,y])=>({x:p.x+x*c-y*s,y:p.y+x*s+y*c}));
}
export function overlaps(a,b) {
  return [a,b].every(poly=>poly.every((p,i)=>{
    const q=poly[(i+1)%4],axis={x:-(q.y-p.y),y:q.x-p.x};
    const range=points=>points.map(v=>v.x*axis.x+v.y*axis.y);
    const x=range(a),y=range(b);
    return Math.min(...x)<Math.max(...y)-.01 && Math.min(...y)<Math.max(...x)-.01;
  }));
}
export function supports(p, assets) {
  const item=CATALOG[p.id], asset=assets[p.id];
  if(!item?.surface||!asset)return [];
  if(asset.geometry.studioSurfaces)return asset.geometry.studioSurfaces;
  const profile=geometryProfile(item),factor=Math.SQRT2*Math.sqrt(1-asset.geometry.projectionTilt**2);
  return profile.surfaces.map(s=>({x:(s.x-item.w/2)*88,y:(s.y-item.h/2)*88,z:(s.z??profile.top)/factor}));
}
export function pose(p,layout,assets) {
  if(!p.parentSurfaceId)return {...p,z:0};
  const parent=layout.items.find(v=>v.key===p.parentSurfaceId);
  if(!parent||parent.parentSurfaceId)return null;
  const slot=supports(parent,assets)[p.surfaceSlot];if(!slot)return null;
  const a=parent.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return {...p,x:parent.x+slot.x*c-slot.y*s,y:parent.y+slot.x*s+slot.y*c,z:slot.z,angle:(parent.angle+p.angle)%360};
}
export function fits(p,layout,assets) {
  if (!assets[p.id]) return false;
  const surface=CATALOG[p.id]?.placement==='surface';
  if(surface!==!!p.parentSurfaceId)return false;
  const resolved=pose(p,layout,assets);if(!resolved)return false;
  if(surface){
    if(!Number.isInteger(p.surfaceSlot)||layout.items.some(o=>o.key!==p.key&&o.parentSurfaceId===p.parentSurfaceId&&o.surfaceSlot===p.surfaceSlot))return false;
    const parent=layout.items.find(v=>v.key===p.parentSurfaceId),slot=supports(parent,assets)[p.surfaceSlot];
    if(slot.clearance!=null&&assets[p.id].geometry.modelBounds[2]>slot.clearance)return false;
    const [w,d]=assets[parent.id].geometry.modelBounds;
    if(corners({x:slot.x,y:slot.y,angle:p.angle},assets[p.id].geometry.modelBounds).some(v=>Math.abs(v.x)>w/2||Math.abs(v.y)>d/2))return false;
  }
  const c=corners(resolved,assets[p.id].geometry.modelBounds);
  if(c.some(v=>v.x<4||v.y<4||v.x>layout.width-4||v.y>layout.depth-4))return false;
  return !layout.items.some(other=>{
    if(other.key===p.key||other.key===p.parentSurfaceId||other.parentSurfaceId===p.key||!assets[other.id])return false;
    const q=pose(other,layout,assets);if(!q)return true;
    if(resolved.z+assets[p.id].geometry.modelBounds[2]<=q.z+.1||q.z+assets[other.id].geometry.modelBounds[2]<=resolved.z+.1)return false;
    return overlaps(c,corners(q,assets[other.id].geometry.modelBounds));
  });
}
export function validLayout(v,assets) {
  if(!v||v.version!==1||![352,440,528].includes(v.width)||![352,440,528].includes(v.depth)||!/^#[0-9a-f]{6}$/i.test(v.color)||!Number.isFinite(v.window)||v.window<.32||v.window>.75||!['day','sunset','night'].includes(v.light)||typeof v.snap!=='boolean'||!Array.isArray(v.items)||v.items.length>30)return false;
  if(v.items.some(p=>!p||!assets[p.id]||typeof p.key!=='string'||![p.x,p.y,p.angle].every(Number.isFinite)||p.angle<0||p.angle>=360))return false;
  if(new Set(v.items.map(p=>p.key)).size!==v.items.length)return false;
  return v.items.every(p=>fits(p,v,assets));
}
