// Continuous placement belongs to a separate versioned sketch, never game v2.
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
export function fits(p,layout,assets) {
  if (!assets[p.id]) return false;
  const c=corners(p,assets[p.id].geometry.modelBounds);
  if(c.some(v=>v.x<4||v.y<4||v.x>layout.width-4||v.y>layout.depth-4))return false;
  return !layout.items.some(other=>other.key!==p.key&&assets[other.id]&&overlaps(c,corners(other,assets[other.id].geometry.modelBounds)));
}
export function validLayout(v,assets) {
  if(!v||v.version!==1||![352,440,528].includes(v.width)||![352,440,528].includes(v.depth)||!/^#[0-9a-f]{6}$/i.test(v.color)||!Number.isFinite(v.window)||v.window<.32||v.window>.75||!['day','sunset','night'].includes(v.light)||typeof v.snap!=='boolean'||!Array.isArray(v.items)||v.items.length>30)return false;
  if(v.items.some(p=>!p||!assets[p.id]||typeof p.key!=='string'||![p.x,p.y,p.angle].every(Number.isFinite)||p.angle<0||p.angle>=360))return false;
  if(new Set(v.items.map(p=>p.key)).size!==v.items.length)return false;
  return v.items.every(p=>fits(p,v,assets));
}
