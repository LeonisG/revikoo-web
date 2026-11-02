"""Compile authored JSON into shared terrain/path meshes and runtime data.

Run with the pinned authoring requirements; then run build_layout_v3.py in Blender.
Never imports or executes a V1/V2 generator. geometry-v3.json is an intermediate.
"""
import math, hashlib
from spatial_v3 import *

def prepare():
    w=World();c=w.config;meshes={}
    def faces(name,poly,height):
        v,f=meshes.setdefault(name,([],[]))
        for p in polygons(poly):
            for tri in constrained_delaunay_triangles(p).geoms:
                coords=list(tri.exterior.coords)[:-1];start=len(v)
                v.extend([[x,y,height(x,y) if callable(height) else height] for x,y in coords]);f.append(list(range(start,start+3)))
    def quad(name,points):
        v,f=meshes.setdefault(name,([],[]));n=len(v);v.extend(points);f.append(list(range(n,n+len(points))))
    # Grid-clipped surface shares the single height function with all placements.
    x0,y0,x1,y1=w.boundary.bounds;step=.6
    for i in range(math.ceil((x1-x0)/step)):
        for j in range(math.ceil((y1-y0)/step)):
            cell=box(x0+i*step,y0+j*step,x0+(i+1)*step,y0+(j+1)*step).intersection(w.boundary)
            faces('City_Grass',cell,w.height)
    rim=list(w.boundary.exterior.coords)
    for i,(a,b) in enumerate(zip(rim,rim[1:])):
        for layer,(lo,hi,material) in enumerate([(-4.8,-2.6,'City_Cliff'),(-2.6,-.1,'City_Cliff_Light'),(-.1,None,'City_Cliff')]):
            za=w.height(*a) if hi is None else hi+.18*math.sin(i*1.1);zb=w.height(*b) if hi is None else hi+.18*math.sin((i+1)*1.1)
            quad(material,[[*a,lo+.18*math.sin(i*1.1)],[*b,lo+.18*math.sin((i+1)*1.1)],[*b,zb],[*a,za]])
    lagoon=Polygon([(46*(1+.025*math.sin(5*a)+.02*math.cos(9*a))*math.cos(a),46*.76*(1+.025*math.sin(5*a)+.02*math.cos(9*a))*math.sin(a)) for a in [i*math.tau/192 for i in range(192)]])
    faces('City_Water_V2',lagoon,c['terrain']['lagoon'])
    for a,b in zip(w.water_samples,w.water_samples[1:]):
        pts=[]
        for s,side in [(a,-1),(a,1),(b,1),(b,-1)]:
            x,y,z=s['position'];nx,ny=s['normal'];width=s['halfWidth'];pts.append([x+side*nx*width,y+side*ny*width,z])
        poly=Polygon([v[:2] for v in pts]).intersection(w.boundary)
        faces('City_Water_V2',poly,lambda x,y:w.river_at(x,y)[2])
    anchor=w.layout()['anchors']['WATERFALL_EXIT'];x,y,z=anchor['top'];nx,ny=anchor['normal'];dx,dy=anchor['direction'];width=anchor['halfWidth'];bottom=anchor['bottom'][2]
    for lane,(a,b) in enumerate(zip(anchor['lip'],anchor['lip'][1:])):
        for i in range(18):
            def edge(t,p):return [p[0]+dx*(.015+.55*t),p[1]+dy*(.015+.55*t),p[2]+(bottom-p[2])*t]
            quad('City_Water_Cascade',[edge(i/18,a),edge(i/18,b),edge((i+1)/18,b),edge((i+1)/18,a)])
    # Main substrate is a boolean union. Decorative pavers are partitioned and clipped,
    # never stacked through intersections or on top of the plaza boundary.
    top=c['plaza']['elevation'];faces('City_V2_Gravel',w.paving,top-.025)
    tile_polys=[];occupied=Polygon()
    def tile(poly,index):
        nonlocal occupied
        g=poly.intersection(w.paving).difference(occupied)
        if g.area<.035:return
        for p in polygons(g):faces('City_V2_Paver_'+str(index%3),p,top)
        tile_polys.extend(polygons(g));occupied=unary_union([occupied,g.buffer(.025,join_style=2)])
    cx,cy=c['plaza']['center']
    for row in range(12):
        inner=.18+row*.7;outer=inner+.66;n=max(8,int(math.tau*(inner+.33)/.8))
        for k in range(n):
            a=(k+.03+.5*(row%2))*math.tau/n;b=(k+.97+.5*(row%2))*math.tau/n
            tile(Polygon([(cx+r*math.cos(t),cy+r*math.sin(t)) for r,t in [(inner,a),(outer,a),(outer,b),(inner,b)]]),k+row)
    # Regular forecourt tiles stop at the same shared union boundary.
    bx0,by0,bx1,by1=c['bank']['terrace']
    for i in range(math.ceil((bx1-bx0)/.8)):
        for j in range(math.ceil((by1-by0)/.8)):
            tile(box(bx0+i*.8+.025,by0+j*.8+.025,bx0+(i+1)*.8-.025,by0+(j+1)*.8-.025),i+j)
    for e in w.edges:
        line=e['line'];count=max(1,round(line.length/.72));columns=max(3,round(e['width']/.7));cw=e['width']/columns
        for i in range(count+1):
            d=min(line.length,(i+.5)*line.length/count);p=line.interpolate(d);a=line.interpolate(max(0,d-.05));b=line.interpolate(min(line.length,d+.05));angle=math.atan2(b.y-a.y,b.x-a.x)
            for j in range(columns):
                g=box(-.335,(j-columns/2)*cw+.025,.335,(j+1-columns/2)*cw-.025);g=affinity.rotate(g,angle,origin=(0,0),use_radians=True);tile(affinity.translate(g,p.x,p.y),i+j)
    # Narrow cream edging is a planar ring, not duplicate path slabs.
    faces('City_V2_Cream',w.paving.buffer(.13).difference(w.paving).intersection(w.boundary).difference(w.water),top-.01)
    # Preserve readable future development pads without walls across their entrances.
    for plot in w.plot_polys:
        faces('City_Meadow',plot.difference(w.paving),lambda x,y:w.height(x,y)+.018)
    placements=[w.resolved(p) for p in read('placement-design-v3.json')]+w.bridges
    write(ROOT/'layout.json',w.layout());write(ROOT/'placements.json',placements)
    geometry={'version':3,'meshes':[{'material':k,'vertices':v,'faces':f} for k,(v,f) in meshes.items()],'checks':{'pavingComponents':len(polygons(w.paving)),'tileCount':len(tile_polys),'tileOverlapArea':round(sum(p.area for p in tile_polys)-unary_union(tile_polys).area,8),'pavingArea':w.paving.area,'pavingRings':rings(w.paving),'bridgeDeckContactHeight':top},'sourceSha256':hashlib.sha256((SOURCE/'layout-v3.json').read_bytes()+(SOURCE/'placement-design-v3.json').read_bytes()).hexdigest()}
    write(SOURCE/'geometry-v3.json',geometry)
    write(ROOT/'geometry-checks.json',{**geometry['checks'],'sourceSha256':geometry['sourceSha256']})
    print(json.dumps({'placements':len(placements),'meshes':len(meshes),'triangles':sum(sum(len(f)-2 for f in fs) for vs,fs in meshes.values()),'tileCount':len(tile_polys),'overlap':geometry['checks']['tileOverlapArea']}))
    return w

if __name__=='__main__':prepare()
