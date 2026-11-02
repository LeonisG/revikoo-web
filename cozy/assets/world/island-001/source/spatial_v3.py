"""Shared authoring geometry. Python 3.13 + Shapely 2.1.2; no Blender side effects."""
import json, math
from pathlib import Path
from shapely.geometry import Point, Polygon, LineString, box
from shapely.ops import unary_union, nearest_points
from shapely import affinity, constrained_delaunay_triangles

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'source'
def read(name): return json.loads((SOURCE/name).read_text(encoding='utf-8'))
def write(path,value): path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def parts(g): return list(g.geoms) if hasattr(g,'geoms') else [g]
def polygons(g): return [p for p in parts(g) if p.geom_type=='Polygon' and p.area>1e-7]
def rings(g): return [list(p.exterior.coords) for p in polygons(g)]
def smooth(points,steps=18):
    out=[]
    for i in range(len(points)-1):
        a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
        for j in range(steps):
            t=j/steps
            out.append([.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) for k in range(2)])
    return out+[list(points[-1])]
def rectangle(bounds): return list(box(*bounds).exterior.coords)[:-1]
def footprint(p,metrics,access=False):
    m=metrics[p['asset']];lo,hi=m['min'],m['max']
    g=box(lo[0],-2.1 if access else lo[1],hi[0],-.68 if access else hi[1])
    g=affinity.scale(g,p['scale'],p['scale'],origin=(0,0))
    g=affinity.rotate(g,p['angle'],origin=(0,0),use_radians=True)
    return affinity.translate(g,*p['position'][:2])
def collision_footprints(p,q,metrics):
    """Low planting below a deciduous canopy is intentional, trunk overlap isn't."""
    a,b=footprint(p,metrics),footprint(q,metrics)
    low=lambda o:o['asset'].startswith(('FLOWER','GRASS','BUSH'))
    if p['asset'] in ['TREE_01','TREE_02'] and low(q):a=Point(p['position'][:2]).buffer(.48*p['scale'])
    if q['asset'] in ['TREE_01','TREE_02'] and low(p):b=Point(q['position'][:2]).buffer(.48*q['scale'])
    return a,b
def vertical_overlap(p,q,metrics):
    def interval(o):
        m=metrics[o['asset']];return [o['position'][2]+m[k][2]*o['scale'] for k in ['min','max']]
    a,b=interval(p),interval(q)
    return min(a[1],b[1])-max(a[0],b[0])>.03
def zone_at(p,world):
    point=Point(p)
    for z in world.config['zones']:
        if z['id'] in ['FUTURE_PLOTS','PATH_NETWORK','GARDENS']:continue
        if box(*z['bounds']).covers(point):return z['id']
    return 'GARDENS'

class World:
    def __init__(self,config=None):
        self.config=config or read('layout-v3.json');c=self.config;t=c['terrain'];self.metrics=read('asset-metrics-v3.json')
        rx,ry=t['radius'];a,n,phase,b,m=t['harmonics']
        self.boundary=Polygon([(rx*(1+a*math.sin(n*i*math.tau/256+phase)+b*math.cos(m*i*math.tau/256))*math.cos(i*math.tau/256),ry*(1+a*math.sin(n*i*math.tau/256+phase)+b*math.cos(m*i*math.tau/256))*math.sin(i*math.tau/256)) for i in range(256)])
        r=c['river'];raw=LineString(smooth(r['knots'],40));self.river_line=raw.intersection(self.boundary)
        assert self.river_line.geom_type=='LineString'
        self.river_samples=[];left=[];right=[]
        for i in range(201):
            distance=self.river_line.length*i/200;p=self.river_line.interpolate(distance);v=self.tangent(distance)
            w=r['halfWidth']+r['widthVariation']*math.sin(i/200*math.tau*1.6)
            z=r['sourceHeight']+(r['exitHeight']-r['sourceHeight'])*i/200
            self.river_samples.append({'position':[p.x,p.y,z],'halfWidth':w,'normal':[-v[1],v[0]],'distance':distance})
            left.append((p.x-v[1]*w,p.y+v[0]*w));right.append((p.x+v[1]*w,p.y-v[0]*w))
        self.water_samples=[dict(s) for s in self.river_samples]
        for index,sign in [(0,-1),(-1,1)]:
            s=dict(self.river_samples[index]);dx,dy=self.tangent(s['distance']);x,y,z=s['position'];s['position']=[x+dx*sign*2,y+dy*sign*2,z]
            if index==0:self.water_samples.insert(0,s)
            else:self.water_samples.append(s)
        left=[];right=[]
        for s in self.water_samples:
            x,y,z=s['position'];nx,ny=s['normal'];w=s['halfWidth'];left.append((x+nx*w,y+ny*w));right.append((x-nx*w,y-ny*w))
        self.water=Polygon(left+right[::-1]).intersection(self.boundary)
        s=self.river_samples[-1];x,y,z=s['position'];nx,ny=s['normal'];dx,dy=self.tangent(self.river_line.length);self.fall_lip=[]
        for i in range(33):
            side=(i/32*2-1)*s['halfWidth'];cx,cy=x+nx*side,y+ny*side
            cut=LineString([(cx-dx*3,cy-dy*3),(cx+dx*3,cy+dy*3)]).intersection(self.boundary.boundary)
            hits=[p for p in parts(cut) if p.geom_type=='Point'];p=max(hits,key=lambda p:(p.x-cx)*dx+(p.y-cy)*dy)
            self.fall_lip.append([p.x,p.y,self.river_at(p.x,p.y)[2]])
        self.nodes={k:list(v) for k,v in c['nodes'].items()};self.bridges=[]
        for bridge in c['bridges']:
            sample=min(self.river_samples,key=lambda s:abs(s['position'][1]-bridge['nearY']))
            x,y,z=sample['position'];nx,ny=sample['normal'];angle=math.atan2(ny,nx)
            if nx<0:angle+=math.pi;nx,ny=-nx,-ny
            scale=bridge['scale'];end=4.16*scale
            b={**bridge,'position':[x,y,c['plaza']['elevation']-.31*scale],'angle':angle,'zone':'RIVERSIDE','placementRole':'crossing','support':'bridge-abutments'}
            self.bridges.append(b);self.nodes[b['id']+'-east']=[x+nx*end,y+ny*end];self.nodes[b['id']+'-west']=[x-nx*end,y-ny*end]
        self.edges=[];corridors=[]
        for edge in c['edges']:
            samples=smooth([self.nodes[edge['from']]]+edge['via']+[self.nodes[edge['to']]])
            line=LineString(samples);self.edges.append({**edge,'samples':samples,'line':line});corridors.append(line.buffer(edge['width']/2,quad_segs=8))
        self.plaza=Point(c['plaza']['center']).buffer(c['plaza']['radius'],quad_segs=64)
        self.terrace=box(*c['bank']['terrace']);self.plot_polys=[box(p['position'][0]-p['dimensions'][0]/2,p['position'][1]-p['dimensions'][1]/2,p['position'][0]+p['dimensions'][0]/2,p['position'][1]+p['dimensions'][1]/2) for p in c['plots']]
        self.bridge_polys=[footprint(b,self.metrics) for b in self.bridges]
        self.walkable=unary_union(corridors+[self.plaza,self.terrace]+self.bridge_polys)
        # One non-overlapping surface, including junctions and shared plaza boundary.
        self.paving=unary_union(corridors+[self.plaza,self.terrace]).difference(unary_union(self.bridge_polys)).intersection(self.boundary).difference(self.water)
        self.path_clearance=unary_union(corridors).difference(self.plaza.buffer(-.15)).buffer(.18)
        self.reservations=[('BANK_ENTRANCE_CLEARANCE',box(*c['bank']['clearance'])),('FOUNTAIN_WALKWAY',Point(c['plaza']['center']).buffer(c['plaza']['walkway'][1])),('PATH_CLEARANCE',self.path_clearance),('RIVER_BUFFER',self.water.buffer(.65))]
        self.reservations.extend(('FUTURE_BUILDING_PLOTS:'+p['id'],g.buffer(.3)) for p,g in zip(c['plots'],self.plot_polys))
        self.reservations.append(('OPEN_MEADOW',box(*next(z['reserveBounds'] for z in c['zones'] if z['id']=='OPEN_MEADOW'))))
    def tangent(self,d):
        a=self.river_line.interpolate(max(0,d-.05));b=self.river_line.interpolate(min(self.river_line.length,d+.05));dx,dy=b.x-a.x,b.y-a.y;l=math.hypot(dx,dy);return dx/l,dy/l
    def river_at(self,x,y):
        p=Point(x,y);d=self.river_line.project(p);u=d/self.river_line.length
        r=self.config['river'];return self.river_line.distance(p),r['halfWidth']+r['widthVariation']*math.sin(u*math.tau*1.6),r['sourceHeight']+(r['exitHeight']-r['sourceHeight'])*u
    def height(self,x,y):
        c=self.config;t=c['terrain'];m=t['meadow'];r=math.hypot(x-m['center'][0],y-m['center'][1])/m['radius'];bump=m['height']*max(0,1-r*r)**2
        # Smooth fade at engineered walking surfaces; no abrupt plateau edge.
        dpath=self.walkable.distance(Point(x,y));base=t['base']+bump*min(1,dpath/2)
        dist,width,z=self.river_at(x,y);q=max(0,min(1,(dist-width)/c['river']['bankWidth']));q=q*q*(3-2*q)
        return (z-c['river']['depth'])*(1-q)+base*q
    def support(self,x,y):
        return self.config['plaza']['elevation'] if self.paving.buffer(.001).covers(Point(x,y)) else self.height(x,y)
    def resolved(self,spec):
        p=dict(spec);x,y=p.pop('xy');p['position']=[x,y,0];p.setdefault('scale',1);p.setdefault('angle',0)
        if p.get('facingTarget'):
            target=self.config['plaza']['center'] if p['facingTarget']=='central-fountain' else self.nodes[p['facingTarget']]
            p['angle']=math.atan2(target[1]-y,target[0]-x)+math.pi/2 # Bench front is local -Y.
        p.setdefault('zone',zone_at((x,y),self));p.setdefault('placementRole','planting');p['support']='paving' if self.paving.covers(Point(x,y)) else 'terrain'
        m=self.metrics[p['asset']];embed=.16*p['scale'] if p['asset']=='ROCK' else .025 if p['asset'].startswith('TREE') else 0
        p['position'][2]=round(self.support(x,y)-m['min'][2]*p['scale']-embed,6)
        if 'cliffElevation' in p:
            p['position'][2]=min(p['cliffElevation'],self.config['terrain']['base']-.3-m['max'][2]*p['scale']);p['support']='cliff-embedded';p['zone']='RIVERSIDE'
        return p
    def reject(self,p,existing):
        f=footprint(p,self.metrics);a=p['asset'];reasons=[]
        if p.get('support')=='cliff-embedded':
            if not f.intersects(self.boundary.boundary):reasons.append('UNSUPPORTED_CLIFF')
            return reasons
        if not self.boundary.buffer(-.35).covers(f):reasons.append('OUTSIDE_TERRAIN')
        if a.startswith('BRIDGE'):return reasons
        for name,g in self.reservations:
            if name=='FOUNTAIN_WALKWAY' and a=='FOUNTAIN':continue
            if name=='RIVER_BUFFER' and a=='ROCK':g=self.water.buffer(-.15)
            if f.intersection(g).area>.015:reasons.append(name)
        if a!='FOUNTAIN' and f.intersects(self.terrace.buffer(.35)):reasons.append('BANK_ARCHITECTURE')
        for q in existing:
            if not vertical_overlap(p,q,self.metrics):continue
            if a=='FOUNTAIN' and q['asset']=='FOUNTAIN':continue
            pair,other=collision_footprints(p,q,self.metrics)
            soft=lambda asset:asset.startswith(('FLOWER','GRASS','BUSH'))
            # Low planting may overlap another planting clump intentionally.
            if not(soft(a) and soft(q['asset'])) and pair.buffer(.12).intersection(other).area>.015:reasons.append('COLLISION:'+q['id'])
            if q['asset']=='BENCH' and f.intersection(footprint(q,self.metrics,True)).area>.01:reasons.append('BENCH_ACCESS:'+q['id'])
        return reasons
    def layout(self):
        c=self.config
        return {**{k:c[k] for k in ['version','units','up','seed','bank','plots','plaza']},'source':'source/layout-v3.json','terrain':{**c['terrain'],'boundary':list(self.boundary.exterior.coords)},'zones':[{**z,'boundary':rectangle(z['bounds'])} for z in c['zones']], 'paths':{'nodes':[{'id':k,'position':[v[0],v[1],c['plaza']['elevation']]} for k,v in self.nodes.items()],'edges':[{k:v for k,v in e.items() if k!='line'} for e in self.edges]+[{'id':b['id'],'from':b['id']+'-west','to':b['id']+'-east','width':3,'bridge':b['id'],'samples':[self.nodes[b['id']+'-west'],self.nodes[b['id']+'-east']]} for b in self.bridges]},'river':{**c['river'],'samples':self.river_samples},'anchors':{'FOUNTAIN_CENTER':{'position':[*c['plaza']['center'],c['plaza']['elevation']],'scale':c['plaza']['fountainScale']},'RIVER_SOURCE':self.river_samples[0]['position'],'WATERFALL_EXIT':{'top':self.river_samples[-1]['position'],'bottom':[*self.river_samples[-1]['position'][:2],c['terrain']['lagoon']+.03],'normal':self.river_samples[-1]['normal'],'direction':self.tangent(self.river_line.length),'halfWidth':self.river_samples[-1]['halfWidth'],'lip':self.fall_lip}}}
