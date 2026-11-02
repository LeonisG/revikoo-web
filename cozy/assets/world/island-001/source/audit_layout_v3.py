"""Oriented spatial audit, real mesh contact checks, and walkable connectivity."""
import math,sys
from collections import Counter
from spatial_v3 import *

def connections(layout):
    graph={n['id']:set() for n in layout['paths']['nodes']}
    for e in layout['paths']['edges']:
        graph[e['from']].add(e['to']);graph[e['to']].add(e['from'])
    # Plaza entrances share one traversable annulus around the fountain.
    plaza=[n for n in graph if n.startswith('plaza-')]
    for n in plaza:graph[n].update(set(plaza)-{n})
    visited=set();pending=['bank']
    while pending:
        n=pending.pop()
        if n not in visited:visited.add(n);pending.extend(graph[n]-visited)
    return sorted(set(graph)-visited)

def audit(before=False):
    w=World();layout=w.layout();items=read('placements-v2.json') if before else json.loads((ROOT/'placements.json').read_text())
    support=read('support-v2.json') if before else json.loads((ROOT/'support-checks.json').read_text())
    support={p['id']:p for p in support};metrics=w.metrics;polys={p['id']:footprint(p,metrics) for p in items}
    issues=[];objects=[];reservations=list(w.reservations)
    if before:
        oldpaths=read('path-triangles-v2.json');paving=unary_union([Polygon([v[:2] for v in t]) for t in oldpaths]).buffer(0)
        # Baseline uses its actual exported paving, old plot bounds and old raised terrain.
        reservations=[('BANK_ENTRANCE_CLEARANCE',box(*w.config['bank']['clearance'])),('FOUNTAIN_WALKWAY',Point(1,-4).buffer(4.4)),('PATH_CLEARANCE',paving.difference(w.plaza.buffer(.2)).difference(w.terrace)),*[(f'FUTURE_BUILDING_PLOTS:{p[0]}',box(*p[1])) for p in [('town-hall',[-29.5,-8.5,-18.5,.5]),('studio',[15.5,-19,26.5,-11]),('library-garden',[14.5,10,25.5,18])]]]
    else:paving=w.paving
    def flag(p,kind,other=None,detail=None):
        row={'id':p['id'],'type':kind,'position':p['position']}
        if other:row['other']=other
        if detail is not None:row['detail']=detail
        issues.append(row)
    for p in items:
        a=p['asset'];f=polys[p['id']];s=support[p['id']];z=s.get('surface',s.get('supportHeight'));contact=s.get('contact',s.get('contactHeight'));own=[]
        cliff=p.get('support')=='cliff-embedded' or (before and a=='ROCK' and p['position'][2]<0)
        if cliff:
            if not f.intersects(w.boundary.boundary):flag(p,'UNSUPPORTED_CLIFF')
        elif not w.boundary.buffer(.05 if before else -.25).covers(f):flag(p,'OUTSIDE_TERRAIN')
        if not a.startswith('BRIDGE') and not cliff:
            if z is None:flag(p,'UNSUPPORTED')
            else:
                delta=contact-z;tolerance=.3*p['scale'] if a=='ROCK' else .12
                if abs(delta)>tolerance:flag(p,'FLOATING' if delta>0 else 'BURIED',detail=round(delta,3))
            for name,g in reservations:
                if a=='FOUNTAIN' and name=='FOUNTAIN_WALKWAY':continue
                if a=='ROCK' and name=='RIVER_BUFFER':g=w.water.buffer(-.15)
                if f.intersection(g).area>.02:flag(p,name)
        if a=='BENCH':
            access=footprint(p,metrics,True);reservations.append(('BENCH_ACCESS:'+p['id'],access))
            target=w.config['plaza']['center'] if p.get('facingTarget')=='central-fountain' or before else w.nodes[p['facingTarget']]
            dx,dy=target[0]-p['position'][0],target[1]-p['position'][1];angle=math.atan2(dy,dx)+math.pi/2;error=abs(math.atan2(math.sin(p['angle']-angle),math.cos(p['angle']-angle)))
            if error>.035:flag(p,'WRONG_FACING',detail=round(math.degrees(error),2))
        m=metrics[a];neighbors=[(f.distance(g),ident) for ident,g in polys.items() if ident!=p['id']];nearest=min(neighbors)
        x0,y0,x1,y1=f.bounds
        objects.append({**p,'dimensions':[round(d*p['scale'],5) for d in m['dimensions']],'boundingBox':[[x0,y0,p['position'][2]+m['min'][2]*p['scale']],[x1,y1,p['position'][2]+m['max'][2]*p['scale']]],'footprint':list(f.exterior.coords)[:-1],'supportHeight':z,'contactHeight':contact,'pathDistance':round(f.distance(paving),4),'nearestObject':{'id':nearest[1],'distance':round(nearest[0],4)},'functionalFront':[math.sin(p['angle']),-math.cos(p['angle'])] if a=='BENCH' else None,'issues':[]})
    for i,p in enumerate(items):
        for q in items[i+1:]:
            if not vertical_overlap(p,q,metrics):continue
            if p.get('support')=='cliff-embedded' and q.get('support')=='cliff-embedded':continue
            if before and p['asset']==q['asset']=='ROCK' and max(p['position'][2],q['position'][2])<0:continue
            a,b=collision_footprints(p,q,metrics);soft=lambda o:o['asset'].startswith(('BUSH','FLOWER','GRASS'))
            if not (soft(p) and soft(q)) and a.intersection(b).area>.025:flag(p,'OBJECT_COLLISION',q['id'],round(a.intersection(b).area,3))
        if p['asset']=='BENCH':
            access=footprint(p,metrics,True)
            for q in items:
                if q['id']!=p['id'] and access.intersection(polys[q['id']]).area>.02:flag(p,'BENCH_ACCESS_BLOCKED',q['id'])
    # Explicit per-object visibility estimate: orthographic projection and occlusion by
    # conservative projected boxes. Screenshot suite is the authoritative visual check.
    for o in objects:
        visibility={}
        for name,az,el in [('main',-1.98,.67),('alternative',.7,.8),('top',-math.pi/2,math.pi/2)]:
            def project(v):
                x,y,z=v;return [-math.sin(az)*x+math.cos(az)*y,-math.sin(el)*(math.cos(az)*x+math.sin(az)*y)+math.cos(el)*(z-2),math.cos(el)*(math.cos(az)*x+math.sin(az)*y)+math.sin(el)*(z-2)]
            center=[(a+b)/2 for a,b in zip(*o['boundingBox'])];p=project(center);obscurers=[]
            for q in objects:
                if q['id']==o['id']:continue
                lo,hi=q['boundingBox'];corners=[project([x,y,z]) for x in [lo[0],hi[0]] for y in [lo[1],hi[1]] for z in [lo[2],hi[2]]]
                if min(v[0] for v in corners)<p[0]<max(v[0] for v in corners) and min(v[1] for v in corners)<p[1]<max(v[1] for v in corners) and project([(a+b)/2 for a,b in zip(lo,hi)])[2]>p[2]:obscurers.append(q['id'])
            visibility[name]={'inFrame':abs(p[0])<64 and abs(p[1])<45,'potentialOccluders':obscurers,'method':'conservative projected boxes, not pixel visibility'}
        o['visibility']=visibility;o['issues']=[r['type'] for r in issues if r['id']==o['id'] or r.get('other')==o['id']]
    checks={}
    if not before:
        checks['disconnectedNodes']=connections(layout)
        # Real polygon connectivity in addition to abstract graph connectivity.
        walk=unary_union([paving]+w.bridge_polys).buffer(.04)
        components=polygons(walk);checks['walkableComponents']=len(components)
        checks['nodesOffWalkable']=[n['id'] for n in layout['paths']['nodes'] if not walk.covers(Point(n['position'][:2]))]
        checks['riverContinuous']=w.river_line.is_simple and w.water.geom_type=='Polygon'
        checks['riverDownhill']=all(a['position'][2]>=b['position'][2] for a,b in zip(w.river_samples,w.river_samples[1:]))
        checks['riverEndsAtBoundary']=all(w.boundary.boundary.distance(Point(s['position'][:2]))<.001 for s in [w.river_samples[0],w.river_samples[-1]])
        checks['waterfallDrop']=layout['anchors']['WATERFALL_EXIT']['top'][2]-layout['anchors']['WATERFALL_EXIT']['bottom'][2]
        checks['bridgeConnections']=[{'id':b['id'],'bankEndpointsOnLand':all(w.height(*w.nodes[b['id']+side])>1.7 for side in ['-east','-west']),'waterClearance':b['position'][2]+1.1-w.river_at(*b['position'][:2])[2],'endpointStep':abs((b['position'][2]+.31)-w.config['plaza']['elevation'])} for b in w.bridges]
        checks['tileOverlapArea']=json.loads((ROOT/'geometry-checks.json').read_text())['tileOverlapArea']
        checks['futurePlots']=len(w.plot_polys)
        checks['maximumMeadowHeight']=max(w.height(x,y) for x in range(-28,-17) for y in range(12,20))
        assert not checks['disconnectedNodes'] and not checks['nodesOffWalkable'] and checks['walkableComponents']==1,checks
        assert checks['riverContinuous'] and checks['riverDownhill'] and checks['riverEndsAtBoundary'] and checks['waterfallDrop']>5
        assert checks['tileOverlapArea']<1e-6 and checks['futurePlots']==3 and checks['maximumMeadowHeight']<2.2
        assert all(b['bankEndpointsOnLand'] and b['waterClearance']>.5 and b['endpointStep']<.02 for b in checks['bridgeConnections'])
    report={'version':2 if before else 3,'objects':objects,'issues':issues,'counts':dict(Counter(i['type'] for i in issues)),'reservations':[{'id':k,'rings':rings(g)} for k,g in reservations],'checks':checks}
    dest=SOURCE/'spatial-audit-v2.json' if before else ROOT/'spatial-audit.json';write(dest,report)
    print(json.dumps({'version':report['version'],'objects':len(items),'issues':len(issues),'counts':report['counts'],'checks':checks}))
    return report
if __name__=='__main__':
    result=audit('--before' in sys.argv)
    if '--strict' in sys.argv and result['issues']:raise SystemExit(1)
