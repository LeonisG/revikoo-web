"""Incremental Cozy City V2 art pass. Run against the saved V1 island master.

The bank collection, layout, island silhouette, plaza and cameras are retained.
Each family can be built and previewed before install(). No image-generation API.
"""
import bpy, bmesh, ast, math, os, json, random
from mathutils import Vector, Matrix
from math import sin, cos, pi

OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW=os.path.join(OUT,'v2-previews');os.makedirs(PREVIEW,exist_ok=True)
tree=ast.parse(open(os.path.join(OUT,'source/build_island.py'),encoding='utf-8').read())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))],type_ignores=[]),'v1_helpers','exec'))
W=bpy.data.scenes['COZY_CITY_ISLAND_001']
OLD=bpy.data.scenes['COZY_CITY_ASSET_LIBRARY']
L=bpy.data.scenes.new('COZY_CITY_ASSET_LIBRARY_V2')
collections={name:next(c for c in W.collection.children if c.name.startswith('CITY_'+name)) for name in ['WORLD','PATHS','BUILDINGS','VEGETATION','DECORATION','FUTURE_PLOTS','CAMERAS','LIGHTING']}
parts=[];templates={};materials={};rng=random.Random(202)
placements=json.load(open(os.path.join(OUT,'placements.json')))
old_templates={}
for o in OLD.objects:
    if o.get('asset'):old_templates.setdefault(o['asset'],[]).append(o)
# Reuse unchanged bridge, rock, pot and sign assets. References stay linked.
for asset,objects in old_templates.items():
    templates[asset]=[]
    for source in objects:
        o=source.copy();L.collection.objects.link(o);templates[asset].append(o)

stone=material('City_V2_Limestone',(.67,.52,.34));ivory=material('City_V2_Cream',(.84,.71,.51))
pavers=[material('City_V2_Paver_'+str(i),c) for i,c in enumerate([(.62,.49,.34),(.73,.60,.43),(.79,.65,.47)])]
gravel=material('City_V2_Gravel',(.35,.29,.17));wood=material('City_V2_HoneyWood',(.43,.19,.063));wood_light=material('City_V2_WoodLight',(.56,.28,.10))
iron=material('City_V2_Iron',(.045,.055,.052),.55,.48);gold=material('City_V2_Brass',(.43,.25,.08),.42,.55)
bark=material('City_V2_Bark',(.27,.12,.045));bark_light=material('City_V2_BarkLight',(.35,.17,.065))
leaf=[material('City_Leaf_V2_'+str(i),c) for i,c in enumerate([(.12,.25,.055),(.24,.38,.075),(.38,.48,.12),(.045,.19,.11)])]
blossom=[material('City_Leaf_Blossom_'+str(i),c) for i,c in enumerate([(.63,.22,.28),(.85,.39,.42),(.95,.56,.53)])]
white=material('City_Petal_V2_White',(.96,.88,.67));pink=material('City_Petal_V2_Pink',(.88,.29,.38));purple=material('City_Petal_V2_Lavender',(.38,.19,.57));yellow=material('City_Petal_V2_Gold',(.95,.55,.08))
water=material('City_Water_V2',(.045,.36,.43),.3);fallmat=material('City_Water_Cascade',(.25,.58,.66),.3);foam=material('City_Foam_V2',(.67,.88,.84),.5)
lamp=material('City_Lamp_Glow_V2',(1,.48,.09),.45,0,.7)

def begin(asset):
    for o in templates.get(asset,[]):bpy.data.objects.remove(o,do_unlink=True)
    templates[asset]=[];parts.clear()

def finish(asset):
    bpy.context.view_layer.update()
    source=list(parts);parts.clear();groups={}
    palette=globals().setdefault('palette_materials',{})
    for o in source:
        ma=o.data.materials[0];name=ma.name;key=name
        if not asset.startswith(('PATH','RIVER')):
            if name.startswith('City_Leaf_'):key='City_Leaf_V2_Palette'
            elif name.startswith('City_Petal_V2_'):key='City_Petal_V2_Palette'
            elif name in [wood.name,wood_light.name]:key='City_V2_WoodPalette'
            elif name in [stone.name,ivory.name]:key='City_V2_StonePalette'
        if key!=name and key not in palette:
            pm=material(key,(1,1,1));node=pm.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='CozyPalette';pm.node_tree.links.new(node.outputs['Color'],pm.node_tree.nodes['Principled BSDF'].inputs['Base Color']);palette[key]=pm
        groups.setdefault(key,[]).append(o)
    result=[]
    for name,items in groups.items():
        verts=[];faces=[];smooth=[];colors=[]
        for o in items:
            offset=len(verts);verts.extend([tuple(o.matrix_world@v.co) for v in o.data.vertices])
            color=o.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:];colors.extend([color]*len(o.data.vertices))
            faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons]);smooth.extend([p.use_smooth for p in o.data.polygons])
        o=mesh(asset+'__'+name,verts,faces,palette.get(name) or bpy.data.materials[name])
        if name in palette:
            attr=o.data.color_attributes.new(name='CozyPalette',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',[c for rgba in colors for c in rgba])
        for p,s in zip(o.data.polygons,smooth):p.use_smooth=s
        o['asset']=asset;o['art_version']=2;result.append(o)
    for o in source:bpy.data.objects.remove(o,do_unlink=True)
    templates[asset]=result;parts.clear()

def rounded(name,p,size,ma,bevel=.06):
    o=cube(name,p,size,ma,bevel=0)
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(bevel,min(size)*.35),segments=2,profile=.5,clamp_overlap=True,affect='EDGES');bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
    return o

def tube(name,points,radii,ma,n=8):
    pts=[Vector(p) for p in points];verts=[];faces=[];side=None
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized();r=radii[i] if isinstance(radii,list) else radii
        if side is None:side=Vector((1,0,0) if abs(tangent.x)<.85 else (0,1,0))
        side=(side-tangent*side.dot(tangent)).normalized();up=tangent.cross(side).normalized()
        verts.extend([tuple(p+r*(side*cos(k*2*pi/n)+up*sin(k*2*pi/n))) for k in range(n)])
    faces.append(tuple(reversed(range(n))))
    for i in range(len(pts)-1):
        for k in range(n):j=i*n+k;l=i*n+(k+1)%n;faces.append((j,l,l+n,j+n))
    faces.append(tuple(range((len(pts)-1)*n,len(pts)*n)))
    return mesh(name,verts,faces,ma,smooth=True)

def lathe(name,profile,ma,n=32):
    verts=[(r*cos(i*2*pi/n),r*sin(i*2*pi/n),z) for r,z in profile for i in range(n)];faces=[]
    for j in range(len(profile)-1):
        for i in range(n):k=j*n+i;l=j*n+(i+1)%n;faces.append((k,l,l+n,k+n))
    return mesh(name,verts,faces,ma,smooth=True)

def smooth_tube(name,points,radii,ma,n=10):
    points=[Vector(p) for p in points];sampled=[];rr=[]
    for i in range(len(points)-1):
        a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
        for k in range(4):
            t=k/4;sampled.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t));rr.append(radii[i]*(1-t)+radii[i+1]*t)
    sampled.append(points[-1]);rr.append(radii[-1]);return tube(name,sampled,rr,ma,n)

def leaf_shape(name,p,direction,length,width,ma,normal=(0,0,1)):
    # Closed almond, 16 triangles, a broad ridge rather than a textured card.
    p=Vector(p);up=Vector(normal).normalized();axis=Vector(direction);axis=(axis-up*axis.dot(up)).normalized();side=up.cross(axis).normalized()
    outline=[(-.50,0),(-.22,-.72),(.08,-1),(.36,-.65),(.50,0),(.36,.65),(.08,1),(-.22,.72)]
    v=[tuple(p+axis*x*length+side*y*width) for x,y in outline]+[tuple(p+up*width*.32),tuple(p-up*width*.10)]
    return mesh(name,v,[(8,i,(i+1)%8) for i in range(8)]+[(9,(i+1)%8,i) for i in range(8)],ma,smooth=True)

def flower(p,ma,size=.24,normal=(0,-.45,1)):
    p=Vector(p);n=Vector(normal).normalized();u=n.cross(Vector((1,0,0))).normalized();v=n.cross(u)
    for k in range(5):
        d=u*cos(k*2*pi/5)+v*sin(k*2*pi/5);leaf_shape('RoundedPetal',p+d*size*.55,d,size*1.15,size*.33,ma,n)
    sphere('FlowerCenter',p+n*.045,(size*.27,)*3,yellow,detail=1)

def leafy_spray(p,scale=1,seed=0):
    r=random.Random(seed)
    for i in range(9):
        a=i*2.399;d=Vector((cos(a),sin(a),r.uniform(.2,.9))).normalized();q=Vector(p)+d*.25*scale
        leaf_shape('BroadLeaf',q,d,.65*scale,.18*scale,leaf[i%3],(0,0,1))

def build_bench():
    begin('BENCH')
    for i in range(4):rounded('SeatSlat',(0,-.36+i*.23,.69),(2.65,.215,.14),wood if i%2 else wood_light,.05)
    for i in range(3):
        o=rounded('BackSlat',(0,.40+i*.055,1.01+i*.27),(2.65,.16,.22),wood_light if i==2 else wood,.055)
        for x in [-1.16,1.16]:sphere('IronBolt',(x,.30+i*.055,1.01+i*.27),(.038,.027,.038),iron,detail=1)
    for x in [-1.12,1.12]:
        tube('FrontSweptLeg',[(x,-.49,.06),(x,-.54,.25),(x,-.43,.47),(x,-.42,.69)], [.105,.085,.07,.08],iron)
        tube('BackSweptLeg',[(x,.55,.06),(x,.38,.4),(x,.40,.8),(x,.52,1.68)], [.09,.07,.09,.075],iron)
        arm=[(x,-.42+.19*cos(a),.94+.19*sin(a)) for a in [i*pi/10 for i in range(18)]]
        arm += [(x,-.1,1.12),(x,.18,1.17),(x,.38,1.39)]
        tube('ScrollArm',arm,.065,iron,n=8)
        tube('SideSupport',[(x,-.5,.56),(x,0,.49),(x,.45,.65)],.065,iron)
        for y in [-.5,.52]:rounded('Foot',(x,y,.04),(.28,.30,.08),iron,.025)
    finish('BENCH')

def build_fountain():
    begin('FOUNTAIN')
    lathe('BasinStone',[(0,0),(2.18,0),(2.28,.15),(2.22,.29),(2.16,.34),(2.12,.75),(1.88,.75),(1.84,.34),(0,.34)],stone,48)
    for i in range(20):
        a=i*2*pi/20;p=Vector((2.04*cos(a),2.04*sin(a),.76));o=rounded('RimStone',p,(.59,.43,.20),ivory,.06);o.data.transform(Matrix.Translation(p)@Matrix.Rotation(a+pi/2,4,'Z')@Matrix.Translation(-p))
    cylinder('BasinWater',(0,0,.59),(0,0,.61),1.88,water,n=48)
    lathe('Pedestal',[(.66,.33),(.68,.48),(.55,.61),(.36,.74),(.31,1.11),(.41,1.37),(.70,1.49),(.95,1.67),(1.04,1.9),(.88,2.02),(.60,1.86),(.27,1.77)],ivory)
    for i in range(14):
        a=i*2*pi/14;p=Vector((.96*cos(a),.96*sin(a),2.00));o=rounded('UpperRim',p,(.39,.24,.16),stone,.045);o.data.transform(Matrix.Translation(p)@Matrix.Rotation(a+pi/2,4,'Z')@Matrix.Translation(-p))
    cylinder('UpperWater',(0,0,1.93),(0,0,1.95),.88,water,n=40)
    lathe('Finial',[(.25,1.9),(.26,2.05),(.18,2.14),(.14,2.35),(.30,2.45),(.34,2.54),(.23,2.65),(.15,2.76),(0,2.92)],ivory,24)
    for a in [-pi/2,0,pi/2,pi]:
        points=[(cos(a)*(.94+.30*t),sin(a)*(.94+.30*t),1.99-1.36*t*t) for t in [i/8 for i in range(9)]]
        tube('WaterSpill',points,[.08+i*.007 for i in range(9)],fallmat,8)
        ring('LandingRipple',(1.24*cos(a),1.24*sin(a),.63),.22,.035,.012,foam,n=24)
    for a in [.6,2.5,3.6]:
        x,y=1.5*cos(a),1.5*sin(a);sphere('LilyPad',(x,y,.635),(.23,.20,.018),leaf[1],detail=2)
    finish('FOUNTAIN')

def build_lamp():
    begin('LAMP');rounded('StoneFoot',(0,0,.20),(.68,.68,.4),stone,.075);rounded('StoneCap',(0,0,.43),(.76,.76,.12),ivory,.04)
    lathe('TurnedPost',[(0,.48),(.29,.48),(.30,.57),(.22,.66),(.16,.85),(.11,1.02),(.10,2.8),(.17,2.86),(.17,2.95),(.11,3.05),(.23,3.14)],iron,16)
    for z,r in [(.6,.25),(1.0,.15),(2.85,.15),(3.12,.24)]:ring('BrassCollar',(0,0,z),r,.035,.06,gold,n=16)
    cylinder('LanternGlass',(0,0,3.18),(0,0,3.86),.24,lamp,r2=.40,n=6)
    for i in range(6):
        a=i*2*pi/6;tube('LanternRib',[(.25*cos(a),.25*sin(a),3.16),(.41*cos(a),.41*sin(a),3.88)],.037,iron,n=6)
    lathe('LanternCap',[(.45,3.85),(.49,3.94),(.40,4.02),(.27,4.17),(.20,4.32),(.06,4.38)],iron,6)
    ring('CapRim',(0,0,3.94),.46,.035,.04,gold,n=6);sphere('Finial',(0,0,4.46),(.08,.08,.13),iron)
    tube('IvyStem',[(.15*cos(i*.6),.15*sin(i*.6),.65+i*.15) for i in range(11)],.018,bark,n=5)
    for i in range(7):a=i*1.2;leaf_shape('IvyLeaf',(.20*cos(a),.20*sin(a),.8+i*.22),(cos(a),sin(a),.5),.28,.10,leaf[1])
    finish('LAMP')

def fence_posts():
    for x in [-1.35,1.35]:
        rounded('PostBase',(x,0,.16),(.43,.43,.32),stone,.06)
        o=rounded('TimberPost',(x,0,.83),(.27,.29,1.35),wood,.07)
        rounded('PostCap',(x,0,1.53),(.31,.33,.12),wood_light,.045)

def build_fences():
    begin('FENCE');fence_posts()
    for z in [.52,1.10]:
        o=rounded('TimberRail',(0,0,z),(2.7,.15,.20),wood_light,.045)
        for v in o.data.vertices:v.co.z+=.045*sin(v.co.x*1.4+z)
    leafy_spray((-1.3,-.18,.44),.60,5);finish('FENCE')
    begin('GATE');fence_posts()
    for i in range(7):
        x=-1.03+i*.345;height=1.05+.30*cos(x*1.35);rounded('GateBoard',(x,0,.26+height/2),(.32,.17,height),wood if i%2 else wood_light,.055)
    for z in [.48,1.0]:rounded('GateHinge',(-.76,-.12,z),(.52,.07,.10),iron,.02)
    handle=ring('GateHandle',(0,0,0),.13,.035,.04,iron,n=16);handle.data.transform(Matrix.Translation((.80,-.16,.90))@Matrix.Rotation(pi/2,4,'X'))
    finish('GATE')

def bush_body(scale=1,flowering=False):
    for i,(x,y,z,s) in enumerate([(-.4,0,.48,.6),(.36,.05,.55,.65),(0,.22,.85,.65),(0,-.34,.35,.48)]):
        sphere('ShrubMass',(x*scale,y*scale,z*scale),(s*scale,s*.82*scale,s*.8*scale),leaf[i%3])
        for j in range(6):
            a=j*2.399+i;d=Vector((cos(a),sin(a),.55));p=Vector((x,y,z))+d*s*.7
            leaf_shape('ShrubLeaf',p*scale,d,.48*scale,.14*scale,leaf[(i+j)%3])
    if flowering:
        for i in range(5):a=i*2.399;flower((cos(a)*.56,sin(a)*.56,.65+.3*(i%2)),pink if i%2 else white,.22)

def build_gardens():
    for name,flow in [('BUSH',False),('BUSH_FLOWERING',True)]:begin(name);bush_body(flowering=flow);finish(name)
    for name,ma in [('FLOWER_WHITE',white),('FLOWER_PINK',pink),('FLOWER_YELLOW',yellow),('FLOWER_PURPLE',purple)]:
        begin(name);leafy_spray((0,0,.17),.9,22)
        for i in range(4):
            a=i*2.399;x=.32*cos(a);y=.32*sin(a);z=.35+.15*(i%2)
            cylinder('FlowerStem',(x,y,.06),(x,y,z),.022,leaf[0],n=5);flower((x,y,z),ma,.20)
        finish(name)
    begin('BUSH_LAVENDER');leafy_spray((0,0,.25),1.3,11)
    for i in range(5):
        a=i*2.399;x=.3*cos(a);y=.3*sin(a);h=.9+.13*(i%2);cylinder('LavenderStem',(x,y,0),(x,y,h),.023,leaf[0],n=5)
        for k in range(4):sphere('LavenderBud',(x+.025*sin(k),y,h-.1*k),(.09,.08,.12),purple,detail=1)
    finish('BUSH_LAVENDER')
    begin('GRASS')
    for i in range(9):
        a=i*2.399;l=.45+.15*(i%3);d=Vector((cos(a),sin(a),.7));leaf_shape('GrassBlade',d*l*.35,d,l,.07,leaf[i%3])
    finish('GRASS')

def canopy(center,size,colors,seed=0,flowers=False):
    c=Vector(center);r=random.Random(seed);sphere('CrownMass',c,(size,size*.9,size*.72),colors[0],detail=2)
    for i in range(24):
        a=i*2.399;z=.92-1.40*(i+.5)/24;d=Vector((cos(a)*math.sqrt(1-z*z),sin(a)*math.sqrt(1-z*z),z))
        p=c+Vector((d.x*size*1.025,d.y*size*.925,d.z*size*.76))
        axis=Vector((-sin(a),cos(a),.2))
        if not flowers:leaf_shape('CrownLeaf',p,axis,size*.83,size*.29,colors[i%len(colors)],d)
        elif i%4==0:flower(p+d*.07,blossom[1+(i//4)%2],size*.29,d)

def build_trees():
    for name,h,colors,flow in [('TREE_01',6.5,leaf[:3],False),('TREE_02',4.8,blossom,True)]:
        begin(name);s=h/6.5
        trunk=[(0,0,0),(-.23,.07,.65),(-.36,.08,1.3),(-.05,0,2.05),(.20,.08,2.7),(.05,.15,3.5)]
        smooth_tube('CurvedTrunk',[tuple(Vector(p)*s) for p in trunk],[v*s for v in [.52,.43,.35,.32,.26,.14]],bark,n=10)
        for i in range(4):
            a=i*2*pi/4+.4;end=Vector((1.6*cos(a),1.6*sin(a),4.1+.3*(i%2)))*s
            smooth_tube('SweptBranch',[(0,0,2.1*s),tuple(end*.6+Vector((0,0,.65*s))),tuple(end)],[.22*s,.15*s,.07*s],bark,n=8)
        clusters=[(0,0,5.55,1.60),(-1.6,.4,4.65,1.30),(1.5,.65,4.45,1.35),(.35,-1.5,4.3,1.25),(-1.1,-.75,3.75,1.05),(1.6,-.8,3.75,.98)]
        for i,(x,y,z,size) in enumerate(clusters):canopy((x*s,y*s,z*s),size*s,colors,i,flow)
        for i in range(4):a=i*pi/2;tube('Root',[(0,0,.3*s),(.5*cos(a)*s,.5*sin(a)*s,.12),(.86*cos(a)*s,.86*sin(a)*s,.04)],[.2*s,.12*s,.035],bark,n=7)
        finish(name)
    begin('TREE_03');tube('ConiferTrunk',[(0,0,0),(.08,0,1.4),(0,0,4.8)],[.30,.23,.06],bark,n=10)
    for j in range(5):
        radius=1.65-j*.28;z=1.15+j*.9;n=24;verts=[]
        for r,h in [(.12,1.65),(.48,.87),(1,0),(.55,.10)]:
            for i in range(n):
                a=i*2*pi/n+j*.3;rr=radius*r*(1+.11*(i%2));verts.append((rr*cos(a),rr*sin(a),z+h+.10*(i%2)))
        faces=[]
        for k in range(3):
            for i in range(n):a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
        faces.append(tuple(reversed(range(n))));faces.append(tuple(range(3*n,4*n)))
        mesh('ScallopedBoughs',verts,faces,leaf[3],smooth=True)
        for i in range(8):a=i*pi/4+j*.3;leaf_shape('FirTip',(radius*.72*cos(a),radius*.72*sin(a),z+.3),(cos(a),sin(a),-.35),radius*.73,.20*radius,leaf[3])
    finish('TREE_03')

FAMILIES={'bench':build_bench,'fountain':build_fountain,'lamp':build_lamp,'fences':build_fences,'gardens':build_gardens,'trees':build_trees}

def bezier(points,step=.30):
    a,b,c,d=[Vector(p) for p in points];length=sum((y-x).length for x,y in zip([a,b,c],[b,c,d]));n=max(8,int(length/step))
    return [a*(1-t)**3+b*3*(1-t)**2*t+c*3*(1-t)*t*t+d*t**3 for t in [i/n for i in range(n+1)]]

def paver(p,radius=.43,ma=None):
    p=Vector(p);n=6;rr=[radius*rng.uniform(.95,1.04) for i in range(n)];v=[]
    for z,f in [(-.07,.94),(0,1),(.06,.86)]:
        for i in range(n):a=i*2*pi/n;v.append(tuple(p+Vector((rr[i]*f*cos(a),rr[i]*f*sin(a),z))))
    faces=[tuple(reversed(range(n))),tuple(range(2*n,3*n))]
    for j in range(2):
        for i in range(n):k=j*n+i;l=j*n+(i+1)%n;faces.append((k,l,l+n,k+n))
    return mesh('SoftCobble',v,faces,ma or pavers[rng.randrange(3)])

def path_geometry(routes,exclude_plaza=False):
    # Union the footprints before paving so forks have no overlapping tile grids.
    lines=[(bezier(points),width) for points,width in routes]
    def plaza(p):return exclude_plaza and (p.x-1)**2+(p.y+4)**2<8.3**2
    def inside(p,skip=-1,margin=0):
        return any(i!=skip and any((q-p).length_squared<(width/2+margin)**2 for q in line) for i,(line,width) in enumerate(lines))
    for j,(line,width) in enumerate(lines):
        verts=[]
        for i,p in enumerate(line):
            tangent=(line[min(i+1,len(line)-1)]-line[max(0,i-1)]).normalized();side=Vector((-tangent.y,tangent.x,0))
            verts.extend([tuple(p-side*width/2+Vector((0,0,-.075))),tuple(p+side*width/2+Vector((0,0,-.075)))])
        mesh('PathBed',verts,[(2*i,2*i+2,2*i+3,2*i+1) for i in range(len(line)-1)],gravel)
        previous=-1e6;distance=0
        for i,p in enumerate(line):
            if i:distance+=(p-line[i-1]).length
            if distance-previous<.80:continue
            previous=distance;tangent=(line[min(i+1,len(line)-1)]-line[max(0,i-1)]).normalized();side=Vector((-tangent.y,tangent.x,0));angle=math.atan2(tangent.y,tangent.x)
            for sign in [-1,1]:
                q=p+side*(width/2+.06)*sign
                if plaza(q) or inside(q,j,.08):continue
                o=rounded('SoftCurb',q+Vector((0,0,.10)),(.79,.24,.24),ivory,.075);o.data.transform(Matrix.Translation(q)@Matrix.Rotation(angle,4,'Z')@Matrix.Translation(-q))
    allp=[p for line,w in lines for p in line];lo=Vector((min(p.x for p in allp)-3,min(p.y for p in allp)-3,allp[0].z));hi=Vector((max(p.x for p in allp)+3,max(p.y for p in allp)+3,lo.z))
    for row in range(int((hi.y-lo.y)/.75)+1):
        for col in range(int((hi.x-lo.x)/.87)+1):
            p=Vector((lo.x+col*.87+(row%2)*.435,lo.y+row*.75,lo.z))
            if not plaza(p) and inside(p,margin=-.18):paver(p)

def build_paths():
    z=1.92
    routes=[
      ([(6,-4,z),(11,-7,z),(17,-6,z),(18,-3,z)],3.3),
      ([(-5,-4,z),(-8,-3,z),(-9,-6,z),(-10,-6,z)],2.8),
      ([(-18,-6,z),(-21,-6,z),(-23,-9,z),(-24,-8.5,z)],2.8),
      ([(3,2,z),(2,9,z),(13,7,z),(20,10,z)],2.9),
      ([(3,7,z),(.1,9,z),(-1,12,z),(-1,15,z)],2.7),
      ([(5,-10,z),(7,-18,z),(16,-22,z),(21,-19,z)],2.8),
      ([(3,7,z),(-1,8,z),(-5,6,z),(-6,6,z)],2.5),
      ([(-14,6,z),(-19,4,z),(-24,5,z),(-24,1,z)],2.5)]
    begin('PATH_NETWORK');path_geometry(routes,True);finish('PATH_NETWORK')
    begin('PATH_CURVE');path_geometry([([(-4,-3,0),(-1,-3,0),(1,3,0),(4,3,0)],2.4)]);finish('PATH_CURVE')
    begin('PATH_FORK');path_geometry([([(0,-4,0),(0,-1,0),(0,0,0),(0,1,0)],2.4), ([(0,0,0),(-1,1,0),(-2,2,0),(-4,2,0)],2.4), ([(0,0,0),(1,1,0),(2,2,0),(4,2,0)],2.4)]);finish('PATH_FORK')
    return routes

def river_width(y):return 1.70+.22*sin(y*.46)+.12*cos(y*.93)

def ribbon(points,widths,ma,name):
    verts=[]
    for i,p in enumerate(points):
        p=Vector(p);d=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)]);side=Vector((d.y,-d.x,0)).normalized()
        verts.extend([tuple(p-side*widths[i]),tuple(p+side*widths[i])])
    return mesh(name,verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)],ma,smooth=False)

def waterfall(x,y,top,bottom,width):
    points=[(x,y-.70*t,top-(top-bottom)*t**1.3) for t in [i/16 for i in range(17)]]
    ribbon(points,[width*(1+.06*sin(i*.8)) for i in range(17)],fallmat,'WaterfallCurtain')
    for k in range(5):
        xx=x+(k-2)*width*.34
        tube('FoamStream',[(xx+.035*sin(i*.9+k),y-.70*t-.035,top-(top-bottom)*t**1.3+.025) for i,t in enumerate([j/12 for j in range(13)])],.028,foam,n=5)
    for i in range(9):
        a=i*2.399;rr=.25+.12*(i%3);sphere('SoftSplash',(x+sin(a)*width*.8,y-.8+cos(a)*.45,bottom+.05),(rr,rr*.75,rr*.50),foam,detail=1)
    for r in [.6,1.1,1.6]:
        o=ring('FallRipple',(x,y-1,bottom+.045),r,.025,.012,foam,n=32)
        for v in o.data.vertices:v.co.y=y-1+(v.co.y-(y-1))*.55

def build_river():
    begin('RIVER_WORLD')
    points=[(river_x(y),y,1.84) for y in [-28+i*.4 for i in range(94)]]
    ribbon(points,[river_width(p[1]) for p in points],water,'OrganicRiver')
    feeder=bezier([(-16,16,5.30),(-13,15,5.30),(-13,10,5.30),(river_x(8.5),8.5,5.30)],.30)
    ribbon(feeder,[1.35+.13*sin(i*.5) for i in range(len(feeder))],water,'SpringFeeder')
    waterfall(river_x(8.5),8.5,5.3,1.85,1.5);waterfall(river_x(-28),-28,1.84,-4.80,1.7)
    finish('RIVER_WORLD')

def build_river_preview():
    begin('RIVER_PREVIEW')
    pts=[(sin(y*.45)*.6,y,.12) for y in [-5+i*.3 for i in range(20)]]
    ribbon(pts,[1.3+.2*sin(i*.5) for i in range(len(pts))],water,'Pool')
    upper=[(sin(y*.45)*.6,y,2.6) for y in [1+i*.3 for i in range(14)]];ribbon(upper,[1.2+.15*sin(i*.5) for i in range(len(upper))],water,'UpperStream')
    waterfall(sin(.45)*.6,1,2.6,.12,1.2)
    for i in range(10):
        y=-4.5+i*.9
        for sign in [-1,1]:
            sphere('RiverRock',(sign*(1.6+.1*sin(i)),y,(.05 if y<1 else 1.6)),(.6,.7,.5 if y<1 else 1.4),stone,detail=1)
            if i%2==0:leafy_spray((sign*1.95,y,.40 if y<1 else 2.9),.8,i)
    finish('RIVER_PREVIEW')

def install():
    bpy.context.window.scene=W
    # Replace only generated environment instances; preserve architecture and terrain.
    for group in ['WORLD','PATHS','VEGETATION','DECORATION']:
        for o in list(collections[group].objects):
            if o.type=='MESH' and (o.name.split('.')[0] in templates or o.get('asset') in templates):bpy.data.objects.remove(o,do_unlink=True)
    for o in list(collections['PATHS'].objects):
        if o.name.startswith('PathPaver'):bpy.data.objects.remove(o,do_unlink=True)
    for o in list(collections['WORLD'].objects):
        if o.name.startswith(('Water_Stream','Water_UpperChannel','Water_UpperFall','Water_EdgeFall')):bpy.data.objects.remove(o,do_unlink=True)
    # Existing river centerline is retained: bridges and carved bed stay aligned.
    for o in collections['WORLD'].objects:
        if o.name.startswith('Terrain_Grass'):
            for v in o.data.vertices:
                x,y=v.co.x,v.co.y;d=abs(x-river_x(y));v.co.z=1.8-.7*max(0,1-d/(river_width(y)+1)) if y<14 else 1.8
    for asset,col in [('PATH_NETWORK','PATHS'),('RIVER_WORLD','WORLD')]:
        for source in templates[asset]:o=source.copy();collections[col].objects.link(o)
    current=json.load(open(os.path.join(OUT,'source/placements-v1.json')));placements.clear()
    bush_index=0
    for p in current:
        p=dict(p);asset=p['asset'];x,y,z=p['position']
        if asset=='BUSH':
            p['asset']=['BUSH','BUSH_FLOWERING','BUSH_LAVENDER'][bush_index%3];bush_index+=1
        if asset=='FLOWER_YELLOW' and int(x+y)%2==0:p['asset']='FLOWER_PURPLE'
        if asset=='FENCE':
            if (abs(x+24)<.1 and abs(y-1)<.1) or (abs(x-21)<.1 and abs(y+10)<.1):p['asset']='GATE'
            else:p['angle']=.09*sin(x*.5+y*.8)
        if asset=='ROCK' and z>0 and abs(x-river_x(y))<4:
            sign=1 if x>river_x(y) else -1;p['position'][0]=river_x(y)+sign*(river_width(y)+.6)
        # Existing flower positions remain; clumps have compact ground silhouettes.
        place(p['asset'],*p['position'],p['scale'],p['angle'],p['zone'])
    # A few purposeful shoreline clusters and stones frame both falls.
    for y,top in [(8.8,5.18),(-27.8,1.55)]:
        x=river_x(y)
        for side in [-1,1]:
            place('ROCK',x+side*2.15,y,top-.7,.75,.3*side,'WORLD')
            place('BUSH_FLOWERING',x+side*2.8,y+.6,top,.7,side,'VEGETATION')
    for x,y,a in [(9,-6,-.4),(12,-7,0),(-20,-7,0),(8,-16,.4),(14,-20,.4),(-2,10,0),(-20,4,0)]:place('FLOWER_PURPLE',x,y,1.82,1.1,a,'VEGETATION')
    json.dump(placements,open(os.path.join(OUT,'placements.json'),'w'),indent=2)

def export_v2():
    # Selection protects V1 archive scenes and excludes review-only path/river assets.
    bpy.context.window.scene=L;bpy.ops.object.select_all(action='DESELECT')
    used={p['asset'] for p in placements}
    for asset in used:
        for o in templates[asset]:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'environment-kit.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_extras=True,export_animations=False)
    bpy.ops.object.select_all(action='DESELECT')
    for asset in ['PATH_CURVE','PATH_FORK']:
        for o in templates[asset]:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'path-kit.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_extras=True,export_animations=False)
    bpy.context.window.scene=W;bpy.ops.object.select_all(action='DESELECT');sources=[]
    instanced={s.data for a in used for s in templates[a]}
    for group in ['WORLD','PATHS','FUTURE_PLOTS']:
        for o in list(collections[group].objects):
            if o.type!='MESH' or o.data in instanced:continue
            clone=o.copy();clone.data=o.data.copy();collections['WORLD'].objects.link(clone);sources.append(clone)
    merged=batch(sources,'V2_TerrainBatch','WORLD')
    for o in merged:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'terrain.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_animations=False)
    for o in merged:bpy.data.objects.remove(o,do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source/cozy_city_island_v2.blend'))

def build_family(name):
    bpy.context.window.scene=L;FAMILIES[name]();return {k:sum(len(o.data.polygons) for o in v) for k,v in templates.items()}

def preview(asset,name=None,iso=True,old=False):
    source=(old_templates if old else templates)[asset]
    scene=bpy.data.scenes.new('V2_PREVIEW');bpy.context.window.scene=scene
    for o in source:scene.collection.objects.link(o)
    scene.view_layers[0].update();points=[o.matrix_world@Vector(v) for o in source for v in o.bound_box]
    low=Vector(tuple(min(v[i] for v in points) for i in range(3)));high=Vector(tuple(max(v[i] for v in points) for i in range(3)));center=(low+high)/2;size=max(high-low)
    d=bpy.data.cameras.new('PreviewCamera');cam=bpy.data.objects.new('PreviewCamera',d);scene.collection.objects.link(cam);cam.location=center+Vector((-.9,-1.4,1.05) if iso else (0,-1.7,.35))*size;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=size*1.40;scene.camera=cam
    scene.world=bpy.data.worlds.new('PreviewWorld');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.72,.60,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    ground=bpy.data.meshes.new('PreviewGround');ground.from_pydata([(-100,-100,low.z-.035),(100,-100,low.z-.035),(100,100,low.z-.035),(-100,100,low.z-.035)],[],[(0,1,2,3)]);g=bpy.data.objects.new('PreviewGround',ground);scene.collection.objects.link(g);ground.materials.append(pavers[1])
    for pos,power,color in [((-1.5,-2,3),110*size*size,(1,.88,.68)),((1,1,2),60*size*size,(.77,.88,1))]:
        ld=bpy.data.lights.new('PreviewLight','AREA');ld.energy=power;ld.size=size*2;ld.color=color;lo=bpy.data.objects.new('PreviewLight',ld);scene.collection.objects.link(lo);lo.location=center+Vector(pos)*size;lo.rotation_euler=(center-lo.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
    scene.render.filepath=os.path.join(PREVIEW,(name or asset)+('_v1' if old else '_v2')+('_iso' if iso else '_front')+'.png')
    bpy.ops.render.render(write_still=True)
    bpy.context.window.scene=W
    for o in list(scene.objects):
        if o not in source:bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(scene)
    return scene.render.filepath if False else 'preview saved'

if __name__=='__main__':
    for family in FAMILIES:build_family(family)
    build_paths()
    build_river()
    build_river_preview()
    install()
    export_v2()
