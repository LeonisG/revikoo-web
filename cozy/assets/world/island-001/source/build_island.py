"""Cozy City island 001. Blender 5.2; staged, seeded, non-destructive construction."""
import bpy,bmesh,math,random,json,os
from mathutils import Vector,Matrix
from math import sin,cos,pi
OUT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO=os.path.abspath(os.path.join(OUT,'../../..'))
rng=random.Random(147)
W=bpy.data.scenes.new('COZY_CITY_ISLAND_001');bpy.context.window.scene=W
W.unit_settings.system='METRIC';W.unit_settings.scale_length=1
L=bpy.data.scenes.new('COZY_CITY_ASSET_LIBRARY')
collections={}
for name in ['WORLD','PATHS','BUILDINGS','VEGETATION','DECORATION','FUTURE_PLOTS','CAMERAS','LIGHTING']:
    c=bpy.data.collections.new('CITY_'+name);W.collection.children.link(c);collections[name]=c
materials={};templates={};parts=[];placements=[]
def material(name,color,rough=.8,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    materials[name]=m;return m
grass=material('City_Grass',(.30,.41,.12));grass2=material('City_Meadow',(.40,.49,.20))
rock=material('City_Cliff',(.46,.37,.25));rock2=material('City_Cliff_Light',(.60,.49,.34));stone=material('City_Limestone',(.71,.61,.44));ivory=material('City_Cream',(.85,.77,.59))
pathmat=material('City_Paving',(.64,.55,.40));water=material('City_Water',(.055,.34,.38),.26);foam=material('City_Foam',(.65,.88,.79),.4)
wood=material('City_Wood',(.25,.12,.045));bark=material('City_Bark',(.18,.105,.045));gold=material('City_Brass',(.59,.34,.08),.36,.65);iron=material('City_Iron',(.055,.09,.07),.5,.45)
leaf=[material('City_Leaf_'+str(i),c) for i,c in enumerate([(.14,.29,.055),(.24,.37,.075),(.34,.43,.12),(.065,.19,.13)])]
white=material('City_Petal_White',(.96,.88,.70));pink=material('City_Petal_Pink',(.72,.26,.30));yellow=material('City_Petal_Yellow',(.95,.56,.10));lamp=material('City_Lamp_Glow',(1,.56,.15),.35,0,1)
def mesh(name,v,f,m,col=None,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(v,[],f);d.update();bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
    if m:d.materials.append(m)
    for p in d.polygons:p.use_smooth=smooth
    o=bpy.data.objects.new(name,d)
    if col:collections[col].objects.link(o)
    else:L.collection.objects.link(o);parts.append(o)
    return o
def cube(name,p,size,m,col=None,bevel=.06):
    x,y,z=p;a,b,c=[v/2 for v in size];v=[(x+i*a,y+j*b,z+k*c) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    o=mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m,col)
    if bevel:
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=1,affect='EDGES');bm.to_mesh(o.data);bm.free()
    return o
def sphere(name,p,s,m,col=None,detail=2):
    bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=detail,radius=1)
    for v in bm.verts:v.co=Vector(p)+Vector((v.co.x*s[0],v.co.y*s[1],v.co.z*s[2]))
    d=bpy.data.meshes.new(name);bm.to_mesh(d);bm.free();o=bpy.data.objects.new(name,d);d.materials.append(m)
    for f in d.polygons:f.use_smooth=True
    if col:collections[col].objects.link(o)
    else:L.collection.objects.link(o);parts.append(o)
    return o
def cylinder(name,a,b,r,m,col=None,r2=None,n=12):
    a,b=Vector(a),Vector(b);q=(b-a).to_track_quat('Z','Y');h=(b-a).length;v=[]
    for z,rr in [(0,r),(h,r if r2 is None else r2)]:
        v.extend([tuple(a+q@Vector((rr*cos(i*2*pi/n),rr*sin(i*2*pi/n),z))) for i in range(n)])
    o=mesh(name,v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],m,col,True)
    for p in o.data.polygons[:2]:p.use_smooth=False
    return o
def ring(name,p,r,t,height,m,col=None,n=48):
    x,y,z=p;v=[]
    for zz in [z,z+height]:
        for rr in [r,r+t]:v.extend([(x+rr*cos(i*2*pi/n),y+rr*sin(i*2*pi/n),zz) for i in range(n)])
    f=[]
    for i in range(n):
        j=(i+1)%n;f.extend([(i,j,j+n,i+n),(i+2*n,i+3*n,j+3*n,j+2*n),(i,i+2*n,j+2*n,j),(i+n,j+n,j+3*n,i+3*n)])
    return mesh(name,v,f,m,col)
def batch(objects,name,col=None):
    grouped={}
    for o in objects:
        if o.type!='MESH':continue
        for poly in o.data.polygons:
            ma=o.data.materials[poly.material_index];v,f,sm=grouped.setdefault(ma.name,([],[],[]));start=len(v);v.extend([tuple(o.matrix_world@o.data.vertices[i].co) for i in poly.vertices]);f.append(tuple(range(start,start+len(poly.vertices))));sm.append(poly.use_smooth)
    result=[]
    for ma,(v,f,sm) in grouped.items():
        o=mesh(name+'__'+ma,v,f,bpy.data.materials[ma],col)
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
        if 'Leaf' in ma or 'Petal' in ma:
            for p in o.data.polygons:p.use_smooth=True
        result.append(o)
    for o in objects:bpy.data.objects.remove(o,do_unlink=True)
    return result
def start_asset():parts.clear()
def end_asset(name):
    source=list(parts);parts.clear();objects=batch(source,name);templates[name]=objects
    for o in objects:o['asset']=name
    parts.clear()
def place(asset,x,y,z=1.85,scale=1,angle=0,col='VEGETATION'):
    placements.append({'asset':asset,'position':[x,y,z],'scale':scale,'angle':angle,'zone':col})
    for source in templates[asset]:
        o=bpy.data.objects.new(asset,source.data);collections[col].objects.link(o);o.location=(x,y,z);o.scale=(scale,)*3;o.rotation_euler.z=angle
def river_x(y):return -12+2.2*sin(y*.18)
def boundary(t):return 1+.065*sin(t*3+.7)+.045*cos(t*7)
def land_z(x,y):
    # Broad flat building surfaces with a real shallow channel carved into terrain.
    d=abs(x-river_x(y));return 1.8-.7*max(0,1-d/2.8) if y<14 else 1.8
def terrain():
    N=128;R=28;v=[(0,0,1.8)]
    for j in range(1,R+1):
        for i in range(N):
            a=2*pi*i/N;r=j/R*boundary(a);x=39*r*cos(a);y=26*r*sin(a);v.append((x,y,land_z(x,y)))
    f=[(0,1+i,1+(i+1)%N) for i in range(N)]
    for j in range(R-1):
        for i in range(N):k=1+j*N+i;kn=1+j*N+(i+1)%N;f.append((k,kn,kn+N,k+N))
    mesh('Terrain_Grass',v,f,grass,'WORLD',True)
    # Layered cliff perimeter, irregular in plan and height.
    for layer,(z,h,ma,factor) in enumerate([(-4.8,2.2,rock,.94),(-2.6,2.5,rock2,.99),(-.1,1.85,rock,1)]):
        v=[]
        for zz in [z,z+h]:
            for i in range(N):a=2*pi*i/N;r=boundary(a)*factor;v.append((39*r*cos(a),26*r*sin(a),zz+.18*sin(i*2.2)))
        mesh('Cliff_Stratum_'+str(layer),v,[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],ma,'WORLD')
    # Lower water surrounding the island is part of the diorama, not an infinite sea.
    lagoon=cylinder('LowerLagoon',(0,0,-4.95),(0,0,-4.85),46,water,'WORLD',n=96)
    for v in lagoon.data.vertices:
        a=math.atan2(v.co.y,v.co.x);f=1+.025*sin(5*a)+.02*cos(9*a);v.co.x*=f;v.co.y*=.76*f
    # Raised wooded terrace in the rear-left.
    for name,z0,z1,r,r2,ma in [('HighlandRock',1.5,5.05,10.5,9.4,rock2),('HighlandMeadow',5.05,5.25,9.6,9.6,grass2)]:
        o=cylinder(name,(-16,16,z0),(-16,16,z1),r,ma,'WORLD',r2=r2,n=64)
        for v in o.data.vertices:
            x,y=v.co.x+16,v.co.y-16;a=math.atan2(y,x);f=1+.07*sin(a*3)+.04*cos(a*5);v.co.x=-16+x*f;v.co.y=16+y*f
    cylinder('SpringPool',(-16,16,5.26),(-16,16,5.30),3.3,water,'WORLD',n=40)
    # Continuous shallow stream ribbon with two falls and an upper feeder.
    pts=[(river_x(-28+i*.65),-28+i*.65,1.84) for i in range(64)]
    v=[]
    for x,y,z in pts:v.extend([(x-1.7,y,z),(x+1.7,y,z)])
    mesh('Water_Stream',v,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(pts)-1)],water,'WORLD')
    x=river_x(8.5)
    mesh('Water_UpperChannel',[(-17.4,16,5.3),(-14.6,16,5.3),(x+1.4,8.5,5.3),(x-1.4,8.5,5.3)],[(0,1,2,3)],water,'WORLD')
    mesh('Water_UpperFall',[(x-1.6,8.5,5.3),(x+1.6,8.5,5.3),(x+1.6,7.8,1.82),(x-1.6,7.8,1.82)],[(0,1,2,3)],water,'WORLD')
    x=river_x(-28);mesh('Water_EdgeFall',[(x-1.7,-28,1.84),(x+1.7,-28,1.84),(x+1.7,-28.5,-4.8),(x-1.7,-28.5,-4.8)],[(0,1,2,3)],water,'WORLD')
def paths():
    cylinder('CentralPlaza',(1,-4,1.8),(1,-4,1.91),8.6,pathmat,'PATHS',n=64)
    for radius in [3.5,5.5,8.5]:ring('PlazaInlay',(1,-4,1.915),radius,.12,.025,ivory,'PATHS')
    for row in range(7):
        radius=3.1+row*.75;n=int(2*pi*radius/.85)
        for j in range(n):
            a=(j+.5*(row%2))*2*pi/n;p=Vector((1+radius*cos(a),-4+radius*sin(a),1.93))
            o=cube('PlazaStone',p,(.69,.76,.06),stone if (row+j)%7==0 else pathmat,'PATHS',.035)
            o.data.transform(Matrix.Translation(p)@Matrix.Rotation(a,4,'Z')@Matrix.Translation(-p))
    def path(points,width=3):
        for a,b in zip(points,points[1:]):
            a,b=Vector(a),Vector(b);d=b-a;length=d.length
            for j in range(max(1,int(length/.75))):
                p=a+d*(j+.5)/max(1,int(length/.75))
                if (p.x-1)**2+(p.y+4)**2<8.4**2:continue
                p.z+=.008*(j%3);angle=-math.atan2(d.x,d.y)
                for k in range(4):
                    offset=(k-1.5)*width/4;pp=p+Vector((cos(angle)*offset,sin(angle)*offset,0))
                    o=cube('PathPaver',pp,(width/4-.045,.69,.12),stone if (j+k)%6==0 else pathmat,'PATHS',.04)
                    o.data.transform(Matrix.Translation(pp)@Matrix.Rotation(angle,4,'Z')@Matrix.Translation(-pp))
    path([(1,-4,1.9),(15,-4,1.9),(18,-3,1.9)],3.8)
    path([(1,-4,1.9),(-8,-6,1.9),(-16,-6,1.9),(-24,-5,1.9)],3)
    path([(1,-4,1.9),(3,7,1.9),(17,13,1.9)],3)
    path([(3,7,1.9),(-1,13,1.9),(-1,15,1.9)],2.7)
    path([(4,-9,1.9),(10,-17,1.9),(21,-16,1.9)],3)
    for i in range(12):cube('HighlandStair',(-1-i*.50,15,1.9+i*.28),(.65,3,.28),stone,'PATHS',.04)
    cube('BankTerrace',(18,2,1.79),(14.5,11,.25),pathmat,'PATHS')
    for x,y,w,d in [(-24,-4,12,10),(21,-15,12,9),(20,14,12,9)]:
        cube('FuturePlotMeadow',(x,y,1.83),(w,d,.08),grass2,'FUTURE_PLOTS',.1)
        for side in [-1,1]:cube('PlotLowWall',(x+side*w/2,y,2.1),(.35,d,.55),stone,'FUTURE_PLOTS',.05)
    plots=[{'id':id,'position':[x,y,1.85],'dimensions':[w,d],'rotation':0,'buildable':True,'entrance':[x,y-d/2,1.85]} for id,x,y,w,d in [('town-hall',-24,-4,11,9),('studio',21,-15,11,8),('library-garden',20,14,11,8)]]
    json.dump({'version':1,'units':'meters','up':'Z','seed':147,'bank':{'position':[18,2,1.92],'rotation':0},'plots':plots},open(os.path.join(OUT,'layout.json'),'w'),indent=2)
def asset_library():
    for name,height,size,count in [('TREE_01',6.5,2.5,20),('TREE_02',4.1,1.7,15)]:
        start_asset();cylinder('Trunk',(0,0,0),(.24,0,height*.7),.24,bark,r2=.12)
        for k in range(5):a=k*2*pi/5;cylinder('Branch',(.12,0,height*.45),(cos(a)*size*.6,sin(a)*size*.6,height*.78),.12,bark,r2=.045)
        for k in range(count):
            a=k*2.399;r=size*math.sqrt((k+.5)/count);z=height-1+.65*cos(k*1.8)
            sphere('Canopy',(cos(a)*r,sin(a)*r,z),(size*.48,size*.42,.85),leaf[k%3],detail=2)
        end_asset(name)
    start_asset();cylinder('Trunk',(0,0,0),(0,0,5.5),.20,bark,r2=.06)
    for i in range(5):
        z=1.2+i*.9;r=1.6-i*.25;cylinder('Conifer',(0,0,z),(0,0,z+2),r,leaf[3],r2=.05,n=12)
    end_asset('TREE_03')
    start_asset()
    for i in range(9):a=i*2.399;sphere('Shrub',(cos(a)*.6,sin(a)*.6,.48+.22*sin(i)),(.55,.5,.6),leaf[i%3])
    end_asset('BUSH')
    for name,ma in [('FLOWER_WHITE',white),('FLOWER_PINK',pink),('FLOWER_YELLOW',yellow)]:
        start_asset()
        for i in range(5):
            x=sin(i*2.4)*.35;y=cos(i*2.4)*.35;z=.45+i*.035;cylinder('Stem',(x,y,0),(x,y,z),.025,leaf[0],n=6)
            sphere('FlowerCenter',(x,y,z),(.08,.08,.05),yellow,detail=1)
            for j in range(5):a=j*2*pi/5;sphere('Petal',(x+.11*cos(a),y+.11*sin(a),z),(.13,.08,.045),ma,detail=1)
        end_asset(name)
    start_asset()
    for i in range(7):a=i*2.4;x=sin(a)*.2;y=cos(a)*.2;mesh('GrassBlade',[(x-.06,y,0),(x+.06,y,0),(x+.18,y,.5+i*.045)],[(0,1,2)],leaf[1])
    end_asset('GRASS')
    start_asset();sphere('Boulder',(0,0,.8),(1.5,1.1,1.25),rock2,detail=1);sphere('Moss',(0,.1,1.7),(1,.8,.23),grass,detail=1);end_asset('ROCK')
    start_asset()
    for i in range(4):cube('BenchSlat',(0,-.34+i*.22,.62),(2.4,.18,.12),wood)
    for i in range(3):cube('BenchBack',(0,.36,.92+i*.18),(2.4,.13,.13),wood)
    for x in [-.9,.9]:
        for y in [-.3,.3]:cylinder('BenchLeg',(x,y,0),(x,y,.72),.06,iron)
        cylinder('BenchArm',(x,-.32,1),(x,.4,1),.055,iron)
    end_asset('BENCH')
    start_asset();cylinder('LampFoot',(0,0,0),(0,0,.25),.3,iron);cylinder('LampPole',(0,0,.2),(0,0,3.5),.07,iron)
    cube('LampLight',(0,0,3.5),(.42,.42,.65),lamp)
    for x in [-.25,.25]:
        for y in [-.25,.25]:cylinder('LampCage',(x,y,3.15),(x,y,3.87),.028,iron,n=6)
    cylinder('LampHat',(0,0,3.85),(0,0,4.15),.45,iron,r2=.03,n=4);end_asset('LAMP')
    start_asset()
    for x in [-1.3,1.3]:cube('FencePost',(x,0,.58),(.16,.18,1.16),wood)
    for z in [.4,.9]:cube('FenceRail',(0,0,z),(2.8,.12,.12),wood)
    end_asset('FENCE')
    start_asset();cylinder('Pot',(0,0,0),(0,0,.7),.35,stone,r2=.5);ring('PotLip',(0,0,.62),.45,.09,.14,ivory,n=20);sphere('PotPlant',(0,0,1),(.6,.6,.6),leaf[1]);end_asset('POT')
    for name,ma in [('BRIDGE_STONE',stone),('BRIDGE_WOOD',wood)]:
        start_asset()
        for i in range(18):
            x=-4+i*.47;z=.2+.9*cos(x*pi/8);cube('BridgeDeck',(x,0,z),(.48,3,.22),ma)
            if i%3==0:
                for y in [-1.4,1.4]:cylinder('BridgePost',(x,y,z),(x,y,z+1),.09,ma)
        for y in [-1.4,1.4]:
            for i in range(17):x=-4+i*.47;xx=x+.47;cylinder('BridgeRail',(x,y,1.2+.9*cos(x*pi/8)),(xx,y,1.2+.9*cos(xx*pi/8)),.09,ma,n=8)
        end_asset(name)
    start_asset();cylinder('FountainBase',(0,0,0),(0,0,.3),2.2,stone,n=48);ring('FountainBasin',(0,0,.28),1.85,.28,.5,ivory)
    cylinder('FountainWater',(0,0,.56),(0,0,.60),1.85,water,n=40);cylinder('FountainStem',(0,0,.55),(0,0,2.5),.25,stone,r2=.16)
    ring('UpperBasin',(0,0,1.85),.75,.18,.27,ivory,n=32);cylinder('UpperWater',(0,0,1.95),(0,0,1.98),.75,water,n=32);sphere('Finial',(0,0,2.65),(.22,.22,.3),ivory)
    end_asset('FOUNTAIN')
    start_asset();cylinder('SignPost',(0,0,0),(0,0,1.6),.07,wood);cube('SignBoard',(0,0,1.4),(1.1,.1,.32),wood);end_asset('SIGN')
def dress():
    # Deliberately composed trees: framing edges, riverbanks, and a rear woodland.
    points=[(-32,-13),(-30,4),(-29,13),(-25,17),(-21,22),(-17,23),(-10,22),(-5,23),(2,21),(7,18),(12,23),(25,19),(30,12),(34,3),(30,-5),(31,-13),(26,-21),(14,-22),(5,-20),(-3,-19),(-19,-19),(-27,-17),(-4,6),(-3,12),(9,9),(28,2),(-19,8),(-23,10)]
    for i,(x,y) in enumerate(points):
        z=5.25 if (x+16)**2+(y-16)**2<83 else 1.8
        place(['TREE_01','TREE_02','TREE_03'][i%3],x,y,z,rng.uniform(.78,1.2),rng.random()*6.28)
    for i in range(36):
        a=i*2*pi/36;r=boundary(a);x=38.6*r*cos(a);y=25.7*r*sin(a)
        place('ROCK',x,y,-1.8,rng.uniform(1.2,2.3),rng.random()*6.28,'WORLD')
        if i%2==0:place('BUSH',x*.94,y*.94,1.8,rng.uniform(.8,1.4),rng.random()*6.28)
    for i in range(40):
        y=-23+i*.85;x=river_x(y)
        for side in [-1,1]:
            if abs(y+6)<2 or abs(y-6)<2:continue
            place('ROCK',x+side*2.4,y,1.25,rng.uniform(.3,.65),rng.random()*6.28,'WORLD')
            if i%3==0:place('FLOWER_WHITE' if i%2 else 'GRASS',x+side*3,y,1.8,1.3,rng.random()*6.28)
    for x,y in [(-7,-10),(8,-9),(7,1),(-6,2),(12,-4),(24,-4),(-30,-8),(-18,-9),(15,-20),(26,-10),(14,10),(27,14)]:
        place('BUSH',x,y,1.8,1.2)
        for j in range(5):place(['FLOWER_PINK','FLOWER_WHITE','FLOWER_YELLOW'][j%3],x+sin(j*2.4)*1.3,y+cos(j*2.4)*1.2,1.82,1.15)
    for x,y,a in [(-3,-10,0),(6,-8,0),(5,2,pi),(-5,0,pi/2),(-22,9,0)]:place('BENCH',x,y,1.9,1,a,'DECORATION')
    for x,y in [(-5,-9),(7,-9),(-5,2),(7,2),(12,-4),(24,-4),(-18,-6),(-29,-9),(12,-17),(27,-17),(13,13),(26,10),(-5,15),(-21,16)]:
        place('LAMP',x,y,5.25 if (x+16)**2+(y-16)**2<70 else 1.9,1,0,'DECORATION')
    for x,y in [(-24,1),(-21,1),(-27,1),(18,-10),(21,-10),(24,-10),(18,19),(21,19),(24,19),(-22,21),(-19,23),(-13,24)]:place('FENCE',x,y,5.25 if (x+16)**2+(y-16)**2<85 else 1.85,1,0,'DECORATION')
    for x,y in [(-4,-8),(6,-8),(-4,0),(6,0),(13,-3),(24,-3)]:place('POT',x,y,1.9,1,0,'DECORATION')
    place('FOUNTAIN',1,-4,1.92,1.15,0,'DECORATION');place('BRIDGE_STONE',river_x(-6),-6,1.88,1,0,'PATHS');place('BRIDGE_WOOD',river_x(6),6,1.88,.85,0,'PATHS');place('SIGN',8,-13,1.9,1,0,'DECORATION')
    json.dump(placements,open(os.path.join(OUT,'placements.json'),'w'),indent=2)
def load_bank():
    bpy.context.window.scene=W;W.render.fps=30;before=set(W.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,'assets/buildings/bank/cozy_bank.glb'))
    global bank_objects,bank_root
    bank_objects=list(set(W.objects)-before);bank_root=next(o for o in bank_objects if o.parent is None)
    for o in bank_objects:
        for c in list(o.users_collection):c.objects.unlink(o)
        collections['BUILDINGS'].objects.link(o)
    bank_root.location=(18,2,1.92)
def camera():
    d=bpy.data.cameras.new('CityMainCamera');o=bpy.data.objects.new('CityMainCamera',d);collections['CAMERAS'].objects.link(o);o.location=(-72,-110,90);o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=100;W.camera=o
    W.world=bpy.data.worlds.new('CityWorld');W.world.use_nodes=True;W.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.72,.72,1);W.world.node_tree.nodes['Background'].inputs[1].default_value=.55
    for name,pos,power,size,color in [('CitySun',(-30,-40,60),18000,25,(1,.82,.57)),('CityFill',(35,20,50),14000,35,(.7,.83,1))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);collections['LIGHTING'].objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    W.render.engine='CYCLES';W.cycles.samples=24;W.cycles.use_denoising=True;W.render.resolution_x=1400;W.render.resolution_y=1100;W.render.resolution_percentage=70;W.render.image_settings.file_format='PNG';W.view_settings.view_transform='AgX'
def render(name):W.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
def improve_bank():
    # Enhance the imported existing bank, retaining meshes, hinge nodes and animation tracks.
    for o in bank_objects:
        if o.type!='MESH':continue
        for ma in o.data.materials:
            p=ma.node_tree.nodes.get('Principled BSDF') if ma.use_nodes else None
            if not p:continue
            if 'Sage' in ma.name:p.inputs['Roughness'].default_value=.55;p.inputs['Base Color'].default_value=(.06,.16,.115,1)
            if 'Gold' in ma.name:p.inputs['Metallic'].default_value=.72;p.inputs['Roughness'].default_value=.32
            if 'Window_Glass' in ma.name:p.inputs['Base Color'].default_value=(1,.52,.12,1);p.inputs['Emission Strength'].default_value=.7
    before=set(W.objects)
    # Additional cornice bead, roof cap detailing and gold seal rim.
    rim=ring('Bank_Seal_Bead',(0,0,0),.96,.055,.08,gold,'BUILDINGS',64)
    rim.data.transform(Matrix.Translation((0,-4.27,6.43))@Matrix.Rotation(pi/2,4,'X'))
    for x in [-4.85,4.85]:
        for z in [1.3,3.7,4.65]:cube('Bank_Quoin_Accent',(x,-3.65,z),(.58,.18,.13),ivory,'BUILDINGS',.035)
    for x in [-2,2]:
        o=cube('Bank_Sign_Diamond',(x,-4.31,4.86),(.18,.08,.18),gold,'BUILDINGS',.02)
        o.data.transform(Matrix.Translation((x,-4.31,4.86))@Matrix.Rotation(pi/4,4,'Y')@Matrix.Translation((-x,4.31,-4.86)))
    # Window shutters and flower sprays on the side facade.
    for y in [-1.75,1.25]:
        for sign in [-1,1]:
            for j in range(5):cube('Bank_ShutterSlat',(-5.13,y+sign*.83,1.8+j*.3),(.11,.33,.23),wood,'BUILDINGS',.025)
        cube('Bank_SideFlowerBox',(-5.25,y,1.14),(.50,1.4,.30),wood,'BUILDINGS')
        for i in range(12):
            yy=y+rng.uniform(-.6,.6);zz=rng.uniform(1.4,1.7)
            sphere('Bank_FlowerLeaf',(-5.35,yy,zz),(.16,.19,.11),leaf[i%3],'BUILDINGS')
            if i%2==0:
                for j in range(5):a=j*2*pi/5;sphere('Bank_FlowerPetal',(-5.48,yy+.07*cos(a),zz+.07*sin(a)),(.035,.07,.065),pink if i%4 else white,'BUILDINGS',1)
    for y in [-3.4,2.8]:
        for i in range(22):
            z=4.8-i*.13;yy=y+.2*sin(i*.9)
            sphere('Bank_IvyLeaf',(-5.16,yy,z),(.06,.16,.13),leaf[i%3],'BUILDINGS')
    for j in range(10):cube('Bank_RidgeAccent',(-4.4+j*.9,0,7.67),(.13,.55,.08),gold,'BUILDINGS',.02)
    extras=batch(list(set(W.objects)-before),'Bank_Ornament','BUILDINGS')
    for o in extras:o.parent=bank_root
    bank_objects.extend(extras)
    W.render.fps=30
    # Imported glTF objects use quaternion animation. NLA names survive a second export.
    bpy.ops.object.select_all(action='DESELECT');bank_root.location=(0,0,0)
    for o in bank_objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'bank-island.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_anim_slide_to_zero=True,export_optimize_animation_size=False,export_optimize_animation_keep_anim_object=True)
    bank_root.location=(18,2,1.92)
def export():
    bpy.context.window.scene=L;L.render.fps=30;bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'environment-kit.glb'),export_format='GLB',use_active_scene=True,export_extras=True,export_animations=False)
    bpy.context.window.scene=W;bpy.ops.object.select_all(action='DESELECT')
    sources=[]
    for group in ['WORLD','PATHS','FUTURE_PLOTS']:
        for o in list(collections[group].objects):
            if o.name.startswith(('ROCK','BRIDGE')):continue
            clone=o.copy();clone.data=o.data.copy();collections['WORLD'].objects.link(clone);sources.append(clone)
    merged=batch(sources,'TerrainBatch','WORLD')
    for o in merged:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'terrain.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_animations=False)
    for o in merged:bpy.data.objects.remove(o,do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'source/cozy_city_island_master.blend'))
if __name__=='__main__':
    terrain();paths();load_bank();camera();render('01_world_blockout');asset_library();dress();improve_bank();render('02_nature');export()
