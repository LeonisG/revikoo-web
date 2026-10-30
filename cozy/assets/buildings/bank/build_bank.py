"""Reproducible Cozy Bank. Run in Blender; stages 1..4 and finish()."""
import bpy, bmesh, math, random, os, json
from mathutils import Vector
from math import sin, cos, pi
random.seed(41)
OUT=os.path.dirname(os.path.abspath(__file__))
S=bpy.data.scenes.new('COZY_BANK'); bpy.context.window.scene=S
C={}
for name in ['STRUCTURE','ROOF','ENTRANCE','WINDOWS','BRANDING','DECORATION','OPTIONAL_PROPS','CAMERAS','LIGHTING']:
    C[name]=bpy.data.collections.new(name); S.collection.children.link(C[name])
root=bpy.data.objects.new('COZY_BANK',None); C['STRUCTURE'].objects.link(root)
def mat(name,h,rough=.65,metal=0,emit=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*h,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*h,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    if emit: p.inputs['Emission Color'].default_value=(*h,1); p.inputs['Emission Strength'].default_value=emit
    return m
stone=mat('Cozy_Cream_Stone',(.76,.65,.48)); trim=mat('Cozy_Ivory_Moulding',(.9,.79,.6))
stones=[mat('Cozy_Stone_Variant_'+str(i),(.70+i*.025,.59+i*.023,.44+i*.018)) for i in range(4)]
roof=mat('Cozy_Dark_Sage_Roof',(.065,.16,.12)); tiles=[mat('Cozy_Sage_Tile_'+str(i),(.065+i*.012,.14+i*.014,.105+i*.011)) for i in range(4)]
gold=mat('Cozy_Gold_Brass',(.65,.36,.085),.3,.72); wood=mat('Cozy_Warm_Wood',(.22,.105,.045)); dark=mat('Cozy_Lantern_Metal',(.075,.065,.045),.38,.65)
glass=mat('Cozy_Window_Glass',(1,.48,.065),.24,0,.65); glow=mat('Cozy_Warm_Emission',(1,.58,.12),.3,0,3)
leaves=[mat('Cozy_Leaf_Green_'+str(i),(.09+i*.025,.19+i*.026,.025+i*.008)) for i in range(3)]
white=mat('Cozy_Flower_White',(.98,.91,.72)); soil=mat('Cozy_Soil',(.08,.045,.023))
def link(o,name,m,group):
    o.name=name
    for c in list(o.users_collection): c.objects.unlink(o)
    C[group].objects.link(o); o.parent=root
    if m:o.data.materials.append(m)
    return o
def bevel(o,b=.04):
    if b:
        a=o.modifiers.new('Soft crafted edges','BEVEL'); a.width=b; a.segments=2
        a=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o
def box(n,p,d,m=stone,g='STRUCTURE',b=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=link(bpy.context.object,n,m,g);o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return bevel(o,b)
def cyl(n,p,r,h,m=trim,g='STRUCTURE',r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=h,location=p);o=link(bpy.context.object,n,m,g);return bevel(o,.025)
def ball(n,p,sc,m,g='DECORATION',sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=p);o=link(bpy.context.object,n,m,g);o.scale=sc
    for f in o.data.polygons:f.use_smooth=True
    return o
def mesh(n,verts,faces,m,g):
    d=bpy.data.meshes.new(n);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(n,d);C[g].objects.link(o);o.parent=root
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
    if m:d.materials.append(m)
    return o
def profile(n,pts,y,depth,m,g='STRUCTURE',b=.025):
    N=len(pts);v=[(x,y+s*depth/2,z) for s in [-1,1] for x,z in pts];f=[tuple(reversed(range(N))),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
    return bevel(mesh(n,v,f,m,g),b)
def archpts(x,z,w,h):
    r=w/2; spring=z+h-r
    return [(x-r,z),(x+r,z)]+[(x+r*cos(a*pi/24),spring+r*sin(a*pi/24)) for a in range(25)]
def arc(n,x,y,z,r,t,m,g='STRUCTURE',start=0,end=pi):
    v=[]
    for yy in [y-.115,y+.115]:
        for rr in [r,r+t]:
            v.extend([(x+rr*cos(start+(end-start)*i/32),yy,z+rr*sin(start+(end-start)*i/32)) for i in range(33)])
    f=[]
    for i in range(32):
        f.extend([(i,i+1,i+34,i+33),(i+66,i+99,i+100,i+67),(i,i+66,i+67,i+1),(i+33,i+34,i+100,i+99)])
    f.extend([(0,33,99,66),(32,98,131,65)])
    return mesh(n,v,f,m,g)
def rod(n,a,b,r,m=gold,g='DECORATION'):
    v=Vector(b)-Vector(a);o=cyl(n,(Vector(a)+Vector(b))/2,r,v.length,m,g);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def camera(n,p,target,scale):
    d=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,d);C['CAMERAS'].objects.link(o);o.location=p;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale;return o
def light(n,p,power,size,color):
    d=bpy.data.lights.new(n,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(n,d);C['LIGHTING'].objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
S.render.engine='CYCLES';S.cycles.samples=32;S.cycles.use_denoising=True
S.render.resolution_x=1200;S.render.resolution_y=1100;S.render.resolution_percentage=65
S.world=bpy.data.worlds.new('Cozy_Studio');S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(.58,.53,.43,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.45
S.view_settings.view_transform='AgX';S.render.image_settings.file_format='PNG';S.render.film_transparent=True
iso=camera('COZY_MASTER_ISOMETRIC_CAMERA',(-15,-22,16),(0,0,3.5),17)
front=camera('Camera_Front',(0,-24,8),(0,0,3.5),15)
side=camera('Camera_Side',(-24,0,8),(0,0,3.5),15)
back=camera('Camera_Back',(14,20,13),(0,0,3.5),17)
S.camera=iso
light('KeyLight',(-8,-12,17),2200,8,(1,.83,.62));light('FillLight',(9,-3,12),1400,9,(.73,.84,1));light('RimLight',(2,8,14),2100,7,(1,.89,.68))
def render(name,pct=65):
    S.render.resolution_percentage=pct;S.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
def stage1():
    box('Foundation',(0,0,.24),(10.3,7.3,.48),stone)
    box('InteriorFloor',(0,0,.64),(9.5,6.5,.32),wood)
    for n,p,d in [('FrontWall',(0,-3.38,2.85),(10,.36,4.3)),('BackWall',(0,3.38,2.85),(10,.36,4.3)),('LeftWall',(-4.82,0,2.85),(.36,6.5,4.3)),('RightWall',(4.82,0,2.85),(.36,6.5,4.3))]:box(n,p,d)
    for z,w,d,h in [(4.78,10.35,7.35,.22),(5.02,10.65,7.65,.22),(.7,10.2,7.2,.25)]:box('ContinuousCornice',(0,0,z),(w,d,h),trim)
    # Barrel/mansard profile, genuinely curved in depth, running the building width.
    pts=[(-3.55,5.1)]+[(-3.55*cos(i*pi/32),5.1+2.4*sin(i*pi/32)) for i in range(33)]+[(3.55,5.1)]
    o=profile('MainRoof',pts,0,10.05,roof,'ROOF');o.rotation_euler.z=pi/2
    profile('CentralArchedPediment',archpts(0,4.65,5.25,3.35),-3.65,.5,trim)
    arc('PedimentGreenCrown',0,-3.71,5.375,2.625,.22,roof,'ROOF')
    box('EntranceLanding',(0,-3.85,.61),(3.5,1.5,.5),trim,'ENTRANCE')
    for i in range(3):box('EntranceStep',(0,-4.15-i*.37,.5-i*.14),(3.65+i*.15,1.1,.28),trim,'ENTRANCE')
def stage2():
    # Real boolean openings through wall thickness; no facade planes.
    def opening(wall,x,y,z,w,h,rot=0):
        cut=profile('Temporary opening',archpts(x,z,w,h),y,1.3,None,b=0);cut.rotation_euler.z=rot
        ob=bpy.data.objects[wall];bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('True architectural opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut
        bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
    opening('FrontWall',0,-3.38,.75,2.5,3.15)
    def window(x,y,rot=0,backside=False):
        before=set(S.objects); outward=-1 if y<0 else 1
        profile('ArchedWindowGlass',archpts(x,1.35,1.05,2.55),y,.13,glass,'WINDOWS')
        arc('WindowVoussoir',x,y+outward*.07,3.375,.525,.18,trim,'WINDOWS')
        for dx in [-.64,.64]:box('WindowJamb',(x+dx,y,2.36),(.18,.26,2.05),trim,'WINDOWS')
        for dx in [-.45,0,.45]:box('WindowMullion',(x+dx,y+outward*.1,2.4),(.065,.12,2.0),wood,'WINDOWS',.012)
        for z in [1.48,2.25,3.2]:box('WindowTransom',(x,y+outward*.1,z),(1,.12,.065),wood,'WINDOWS',.01)
        box('WindowSill',(x,y-.04,1.28),(1.52,.55,.18),trim,'WINDOWS')
        box('ArchKeystone',(x,y-.1,3.98),(.24,.36,.32),trim,'WINDOWS')
        if rot:
            for o in set(S.objects)-before:
                o.location=Vector((-o.location.y,o.location.x,o.location.z)) if rot>0 else Vector((o.location.y,-o.location.x,o.location.z));o.rotation_euler.z+=rot
    for x in [-3.45,3.45]:
        opening('FrontWall',x,-3.38,1.35,1.05,2.55);window(x,-3.66)
        opening('BackWall',x,3.38,1.35,1.05,2.55);window(x,3.66)
    for x in [-1.75,1.25]:
        opening('LeftWall',x,4.82,1.35,1.05,2.55,pi/2);window(x,5.05,pi/2)
        opening('RightWall',x,-4.82,1.35,1.05,2.55,pi/2);window(x,-5.05,pi/2)
    # Masonry courses. Skip apertures, expose recessed core around arched tops.
    for row in range(8):
        z=.98+row*.47
        for j in range(12):
            x=-4.55+j*.82+(row%2)*.28
            if x>4.7:continue
            for y in [-3.59,3.59]:
                if (abs(x)<1.65 and y<0 and z<4.1) or (any(abs(x-a)<.9 for a in [-3.45,3.45]) and 1.1<z<4.15):continue
                box('AshlarFacade',(x,y,z),(.78,.12,.435),random.choice(stones),b=.025)
        for j in range(8):
            y=-2.95+j*.8+(row%2)*.25
            if y>3.05:continue
            if any(abs(y-a)<.9 for a in [-1.75,1.25]) and 1.1<z<4.15:continue
            for x in [-5.02,5.02]:box('AshlarSide',(x,y,z),(.12,.76,.435),random.choice(stones),b=.025)
    for x in [-4.8,4.8]:
        for y in [-3.35,3.35]:
            for i in range(8):box('CornerQuoin',(x,y,1+i*.49),(.66,.65,.46),trim)
    for x in [-1.7,1.7]:
        cyl('ColumnShaft',(x,-3.93,2.46),.23,2.9,trim)
        for z,r,h in [(.96,.36,.3),(1.16,.29,.12),(3.89,.3,.14),(4.07,.4,.2)]:cyl('ColumnCapital',(x,-3.93,z),r,h)
        box('ColumnPlinth',(x,-3.93,.79),(.67,.67,.28),trim)
    arc('DoorStoneArch',0,-3.65,2.65,1.25,.23,trim,'ENTRANCE')
    profile('DoorTransom',archpts(0,2.65,2.43,1.22),-3.4,.12,glass,'ENTRANCE')
    arc('DoorWoodArch',0,-3.72,2.65,1.18,.09,wood,'ENTRANCE')
    # Roof tiles lie tangential to the curved roof in 14 rows, on both sides.
    for row in range(16):
        t=(row+.5)*pi/16;y=-3.56*cos(t);z=5.1+2.42*sin(t)
        for j in range(14):
            x=-4.68+j*.72+(row%2)*.1
            o=box('RoofTile',(x,y,z),(.69,.51,.085),random.choice(tiles),'ROOF',.03);o.rotation_euler.x=math.atan2(2.42*cos(t),3.56*sin(t))
    for x in [-4.95,4.95]:
        pts=[(x,-3.61*cos(i*pi/40),5.1+2.48*sin(i*pi/40)) for i in range(41)]
        for a,b in zip(pts,pts[1:]):rod('RoofEndRib',a,b,.085,gold,'ROOF')
    for j in range(14):box('RidgeCap',(-4.7+j*.72,0,7.56),(.7,.48,.19),roof,'ROOF')
    box('Chimney',(3.6,1.4,7.15),(.8,.85,1.8),stone,'ROOF');box('ChimneyCrown',(3.6,1.4,8.05),(1.02,1.06,.24),trim,'ROOF')
    cyl('GoldenFinial',(0,-3.65,8.2),.18,.45,gold,'ROOF',.025)
    for x in [-1.85,1.85]:
        for y,z in [(-4.9,.48),(-3.9,.8)]:
            cyl('RailPost',(x,y,z+.45),.06,.9,gold,'ENTRANCE');ball('RailKnob',(x,y,z+.92),(.11,.11,.11),gold,'ENTRANCE',2)
        rod('Handrail',(x,-4.9,1.4),(x,-3.9,1.72),.065,gold,'ENTRANCE')
def stage3():
    # Medallion: concentric cylinders face front; sprout is sculpted relief geometry.
    for r,y,m in [(1.02,-4.02,gold),(.88,-4.15,wood)]:
        o=cyl('GoldenMedallion',(0,y,6.43),r,.16,m,'BRANDING');o.rotation_euler.x=pi/2
    def sprout(x,y,z,scale=1,g='BRANDING'):
        rod('SproutStem',(x,y,z-.42*scale),(x,y,z+.38*scale),.035*scale,gold,g)
        for dx,dz,ang in [(-.23,-.02,-.65),(.23,.08,.65),(0,.42,0)]:
            o=ball('GoldenLeaf',(x+dx*scale,y,z+dz*scale),(.14*scale,.055*scale,.31*scale),gold,g,2);o.rotation_euler.y=ang
    sprout(0,-4.28,6.4,1.1)
    pts=[(-2.26,4.34),(2.26,4.34),(2.26,5.16),(1.7,5.28),(0,5.48),(-1.7,5.28),(-2.26,5.16)]
    profile('SignGoldFrame',pts,-4.06,.17,gold,'BRANDING')
    profile('BankSign',[(x*.965,4.89+(z-4.89)*.87) for x,z in pts],-4.17,.12,roof,'BRANDING')
    d=bpy.data.curves.new('BankLetters','FONT');d.body='BANCO';d.align_x='CENTER';d.align_y='CENTER';d.size=.83;d.extrude=.026;d.bevel_depth=.009
    font='C:/Windows/Fonts/georgia.ttf'
    if os.path.exists(font):d.font=bpy.data.fonts.load(font)
    o=bpy.data.objects.new('BankLetters',d);C['BRANDING'].objects.link(o);o.parent=root;o.location=(0,-4.27,4.85);o.rotation_euler.x=pi/2;d.materials.append(gold)
    for x in [-2.18,2.18]:
        rod('LanternBracket',(x,-3.6,3.3),(x,-4.2,3.3),.045,dark)
        box('LanternGlow',(x,-4.19,2.9),(.29,.27,.52),glow,'DECORATION',.025)
        for dx in [-.19,.19]:
            for dy in [-.19,.19]:rod('LanternFrame',(x+dx,-4.19+dy,2.58),(x+dx,-4.19+dy,3.2),.028,dark)
        cyl('LanternRoof',(x,-4.19,3.25),.34,.25,dark,'DECORATION',.05);cyl('LanternBase',(x,-4.19,2.55),.25,.12,dark,'DECORATION')
        ld=bpy.data.lights.new('LanternWarm','POINT');ld.energy=18;ld.color=(1,.48,.1);ld.shadow_soft_size=.3;lo=bpy.data.objects.new('LanternWarm',ld);C['LIGHTING'].objects.link(lo);lo.location=(x,-4.4,2.9)
    def plant(x,y,z,r=.55,pot=True):
        if pot:
            cyl('PlanterPot',(x,y,z+.28),r*.65,.55,trim,'DECORATION',r*.82);cyl('PlanterLip',(x,y,z+.55),r*.87,.12,trim,'DECORATION')
        center=Vector((x,y,z+.65+r*.55))
        for i in range(26):
            v=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-.7,1))).normalized()*r*random.uniform(.35,.9)
            ball('BushLeaves',center+v,(r*.28,r*.22,r*.27),random.choice(leaves))
        for i in range(7):
            a=random.random()*2*pi;p=center+Vector((r*.8*cos(a),r*.8*sin(a),r*.4))
            ball('FlowerHeart',p,(.045,.045,.045),gold)
            for k in range(5):ball('FlowerPetal',p+Vector((.075*cos(k*2*pi/5),.075*sin(k*2*pi/5),.01)),(.075,.04,.025),white)
    for x in [-2.55,2.55]:plant(x,-4.35,.25,.5)
    for x in [-3.55,3.55]:
        box('WindowFlowerBox',(x,-3.95,1.13),(1.32,.55,.34),wood,'DECORATION');plant(x,-3.96,.98,.48,False)
        box('RoofPlanter',(x,-3.48,5.14),(1.5,.8,.25),trim,'DECORATION');plant(x,-3.7,4.85,.65,False)
        for j in range(5):
            xx=x+random.uniform(-.5,.5)
            for k in range(7-j//2):ball('TrailingIvy',(xx+sin(k)*.12,-3.98,5.2-k*.17),(.14,.07,.18),random.choice(leaves))
    for x in [-4.1,4.1]:
        box('GardenBed',(x,-4.3,.32),(1.55,1.25,.5),stone,'DECORATION');plant(x,-4.3,.27,.66,False)
    for x in [-5.48,5.48]:
        box('SideGarden',(x,2.25,.4),(.85,1.5,.7),stone,'DECORATION')
        for z,r in [(1,.45),(1.4,.35),(1.8,.25),(2.15,.14)]:ball('Topiary',(x,2.25,z),(r,r,.45),leaves[1],sub=2)
    # Removable bench, signboard and pennants.
    for k in range(5):box('BenchSeatSlat',(-5.5,-1.1+k*.19,.83),(.66,.15,.09),wood,'OPTIONAL_PROPS')
    for k in range(3):box('BenchBackSlat',(-5.87,-.72,1.03+k*.18),(.1,1.3,.13),wood,'OPTIONAL_PROPS')
    for y in [-1.2,-.25]:
        for x in [-5.8,-5.25]:rod('BenchLeg',(x,y,.2),(x,y,.86),.045,dark,'OPTIONAL_PROPS')
    for x in [-4.95,4.95]:
        rod('BannerArm',(x,-3.6,4),(x+(-.7 if x<0 else .7),-3.6,4),.045,gold)
        bx=x+(-.5 if x<0 else .5)
        profile('Banner',[(bx-.28,3.94),(bx+.28,3.94),(bx+.28,2.6),(bx,2.35),(bx-.28,2.6)],-3.6,.06,roof,'DECORATION');sprout(bx,-3.66,3.1,.45,'DECORATION')
    for x in [3.3,4.25]:rod('SignboardLeg',(x,-5.3,.16),(x,-5.05,1.58),.055,wood,'OPTIONAL_PROPS')
    box('SignboardGold',(3.77,-5.18,.98),(1.05,.14,1.32),gold,'OPTIONAL_PROPS');box('SignboardGreen',(3.77,-5.27,.98),(.91,.1,1.18),roof,'OPTIONAL_PROPS');sprout(3.77,-5.35,1.07,.55,'OPTIONAL_PROPS')
    for j in range(11):
        for i in range(16):
            x=-5.8+i*.76;y=-5.3+j*.84
            if abs(x)<4.95 and -3.6<y<3.5:continue
            box('PavementStone',(x,y,.08),(.735,.815,.16),random.choice(stones),'OPTIONAL_PROPS',.04)
def stage4():
    global doors
    doors=[]
    for side in [-1,1]:
        p=bpy.data.objects.new('LeftDoor' if side<0 else 'RightDoor',None);C['ENTRANCE'].objects.link(p);p.parent=root;p.location=(side*1.18,-3.52,.8);doors.append(p)
        before=set(S.objects);cx=side*.6
        box('DoorWoodFrame',(cx,-3.52,1.76),(1.15,.17,1.92),wood,'ENTRANCE')
        box('DoorGlass',(cx,-3.63,2.08),(.89,.06,1.04),glass,'ENTRANCE')
        box('DoorLowerPanel',(cx,-3.64,1.13),(.86,.08,.41),trim,'ENTRANCE')
        box('DoorPanelInset',(cx,-3.69,1.13),(.74,.04,.29),wood,'ENTRANCE',.02)
        for z in [1.64,2.56]:box('DoorGlassRail',(cx,-3.69,z),(.94,.06,.065),gold,'ENTRANCE',.01)
        rod('DoorHandle',(side*.16,-3.82,1.43),(side*.16,-3.82,1.75),.043,gold,'ENTRANCE')
        for z in [1.1,2.4]:cyl('DoorHinge',(side*1.18,-3.54,z),.055,.15,gold,'ENTRANCE')
        for o in set(S.objects)-before:
            loc=o.location.copy();o.parent=p;o.location=loc-p.location
        for clip,start,end in [('DOORS_CLOSED',0,0),('DOORS_OPENING',0,-side*85*pi/180),('DOORS_CLOSING',-side*85*pi/180,0)]:
            p.animation_data_create();p.animation_data.action=None
            p.rotation_euler.z=start;p.keyframe_insert(data_path='rotation_euler',frame=1,index=2)
            p.rotation_euler.z=end;p.keyframe_insert(data_path='rotation_euler',frame=25,index=2)
            act=p.animation_data.action;act.name=clip+'_'+p.name
            track=p.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,act);track.mute=True
            p.animation_data.action=None
        p.rotation_euler.z=0
    S.render.fps=30;S.frame_start=1;S.frame_end=25
    # Interior glimpse through genuinely opening doors.
    box('InteriorCounter',(0,1.6,1.35),(3,.6,1.1),wood,'ENTRANCE');box('CounterBrassTop',(0,1.6,1.95),(3.2,.8,.12),gold,'ENTRANCE')
def finish():
    S.camera=iso;S.render.resolution_percentage=100;S.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'cozy_bank_master.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    for o in S.objects:
        if o.type not in {'CAMERA','LIGHT'}:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'cozy_bank.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
    for cam,name in [(iso,'isometric'),(front,'front'),(side,'side'),(back,'back')]:
        S.camera=cam;render('cozy_bank_'+name,100)
    S.camera=iso
    for p,angle in zip(doors,[85,-85]):p.rotation_euler.z=math.radians(angle)
    render('cozy_bank_doors_open',100)
    for p in doors:p.rotation_euler.z=0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'cozy_bank_master.blend'))
if __name__=='__main__':
    bpy.app.driver_namespace['bank_builder']=globals()
    stage1();render('01_blockout');stage2();render('02_architecture');stage3();stage4();render('03_details')
    p=os.path.join(OUT,'finalize_bank.py');env={'__file__':p,'__name__':'bank_finalize'}
    exec(compile(open(p,encoding='utf-8').read(),p,'exec'),env)
    env['refine']();env['export_optimized']();env['save_master']()
    for cam,name in [(iso,'isometric'),(front,'front'),(side,'side'),(back,'back')]:
        S.camera=cam;render('cozy_bank_'+name,100)
    S.camera=iso
    for door,angle in zip(doors,[85,-85]):door.rotation_euler.z=math.radians(angle)
    render('cozy_bank_doors_open',100)
    env['save_master']()
