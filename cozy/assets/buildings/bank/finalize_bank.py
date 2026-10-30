"""Run after build_bank stages 1..4. Refine, batch export, and verify."""
import bpy, math, os, json, struct
from mathutils import Vector, Matrix
ns=bpy.app.driver_namespace['bank_builder'];globals().update(ns)
def refine():
    # Exterior glazing mullions on opposite-facing elevations.
    for o in C['WINDOWS'].objects:
        if o.name.startswith(('WindowMullion','WindowTransom')):
            if -5.1<o.location.x < -4.8:o.location.x-=.2
            elif 3<o.location.y<3.7:o.location.y+=.2
    arc('PedimentInnerGold',0,-3.99,5.375,2.35,.045,gold,'BRANDING')
    arc('PedimentIvoryBand',0,-3.92,5.375,2.07,.20,trim)
    # Finial cap and projecting supporting plinth.
    box('FinialPlinth',(0,-3.65,8.12),(.54,.58,.16),roof,'ROOF')
    cyl('FinialFoot',(0,-3.65,8.28),.18,.22,gold,'ROOF')
    ball('FinialOrb',(0,-3.65,8.45),(.13,.13,.16),gold,'ROOF',2)
    cyl('FinialSpire',(0,-3.65,8.72),.12,.5,gold,'ROOF',.005)
    # Small arched dormer on visible gable end.
    before=set(S.objects)
    profile('DormerGlass',archpts(0,5.42,1.15,1.45),5.1,.18,glass,'WINDOWS')
    arc('DormerArch',0,5.23,6.295,.575,.18,trim,'WINDOWS')
    for x in [-.66,.66]:box('DormerJamb',(x,5.22,5.85),(.18,.3,.9),trim,'WINDOWS')
    box('DormerSill',(0,5.21,5.38),(1.6,.45,.18),trim,'WINDOWS')
    box('DormerMullion',(0,5.23,6),(.07,.12,1.2),wood,'WINDOWS')
    box('DormerTransom',(0,5.23,6.21),(1.1,.12,.07),wood,'WINDOWS')
    for o in set(S.objects)-before:
        o.location=Vector((-o.location.y,o.location.x,o.location.z));o.rotation_euler.z+=math.pi/2
    # Softer organic foliage, still individual editable meshes.
    for o in C['DECORATION'].objects:
        if o.name.startswith(('BushLeaves','TrailingIvy')):o.scale.z*=.65
    S.camera=iso;iso.location=(-15,-23,14.8);iso.rotation_euler=(Vector((0,0,4))-iso.location).to_track_quat('-Z','Y').to_euler()
    # Floor belongs only to presentation, excluded from the model export.
    floor=box('PresentationGround',(0,0,-.16),(200,200,.1),mat('Cozy_Studio_Backdrop',(.52,.46,.38)),'LIGHTING',0)
    S.render.film_transparent=False;S.cycles.samples=64
    root['units']='meters';root['front']='-Y';root['webScaleToCentimeters']=100
    root['doorSwingDegrees']=85;root['doorDurationSeconds']=.8
def export_optimized():
    # Bake evaluated geometry into batches; preserve door hinges and removable prop roots.
    deps=bpy.context.evaluated_depsgraph_get();E=bpy.data.scenes.new('COZY_BANK_EXPORT');E.render.fps=30
    er=bpy.data.objects.new('COZY_BANK',None);E.collection.objects.link(er)
    roots={};groups={}
    for p in doors:
        q=p.copy();E.collection.objects.link(q);q.parent=er;roots[p.name]=q
    def bucket(o):
        if o.parent in doors:return o.parent.name
        n=o.name
        if n.startswith(('Bench','ExteriorBench')):return 'ExteriorBench'
        if n.startswith(('Signboard',)):return 'SignBoard'
        if n.startswith(('Pavement',)):return 'Pavement'
        if n.startswith(('Planter','GardenBed','BushLeaves','Flower','Trailing','WindowFlowerBox','RoofPlanter','SideGarden','Topiary')):
            p=o.matrix_world.translation
            # Spatial groups keep each garden bed removable.
            return 'Garden_%s_%s'%(round(p.x/2),round(p.y/2))
        if n.startswith(('Lantern','Banner')):return n.split('.')[0]+('_L' if o.location.x<0 else '_R')
        return next((k for k,v in C.items() if o.name in v.objects),'Architecture')
    triangles=0
    for o in S.objects:
        if o.type not in {'MESH','FONT','CURVE'} or o.name=='PresentationGround':continue
        ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles();triangles+=len(me.loop_triangles)
        parent=bucket(o)
        if parent not in roots:
            q=bpy.data.objects.new(parent,None);E.collection.objects.link(q);q.parent=er;roots[parent]=q
        trans=roots[parent].matrix_local.inverted() @ o.matrix_world if parent in [p.name for p in doors] else o.matrix_world
        for poly in me.polygons:
            material=me.materials[poly.material_index] if me.materials else stone
            key=(parent,material.name);v,f=groups.setdefault(key,([],[]));idx=len(v)
            v.extend([tuple(trans@me.vertices[i].co) for i in poly.vertices]);f.append(tuple(range(idx,idx+len(poly.vertices))))
        ev.to_mesh_clear()
    for (parent,m), (verts,faces) in groups.items():
        d=bpy.data.meshes.new(parent+'_'+m);d.from_pydata(verts,[],faces);d.materials.append(bpy.data.materials[m]);d.update()
        bm=bmesh.new();bm.from_mesh(d);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(d);bm.free()
        o=bpy.data.objects.new(parent+'_'+m,d);E.collection.objects.link(o);o.parent=roots[parent]
        organic='Leaf' in m or 'Flower' in m
        mod=o.modifiers.new('Web geometry budget','DECIMATE');mod.ratio=.85 if organic else .20
        for p in d.polygons:p.use_smooth=organic
        # UVs for future texture authoring; current shaders use constant PBR values.
        uv=d.uv_layers.new(name='UVMap')
        for poly in d.polygons:
            normal=poly.normal;drop=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3) if i!=drop]
            for li in poly.loop_indices:
                co=d.vertices[d.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]*.2,co[axes[1]]*.2)
    bpy.context.window.scene=E
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'cozy_bank.glb'),export_format='GLB',use_active_scene=True,export_apply=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_optimize_animation_size=False,export_optimize_animation_keep_anim_object=True,export_extras=True,export_materials='EXPORT')
    bpy.context.window.scene=S
    raw=open(os.path.join(OUT,'cozy_bank.glb'),'rb').read();length=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+length])
    exported_triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
    report={'trianglesMaster':triangles,'trianglesGLB':exported_triangles,'meshBatches':len(groups),'glbBytes':len(raw),'animations':[a['name'] for a in gltf.get('animations',[])],'nodes':len(gltf.get('nodes',[])),'materials':len(gltf.get('materials',[]))}
    json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2)
    return report
def save_master():
    S.camera=iso
    for p in doors:p.rotation_euler.z=0
    for a in bpy.context.screen.areas:
        if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'cozy_bank_master.blend'))
if __name__=='__main__':refine();print(export_optimized());save_master()
