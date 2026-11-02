"""Blender stage: reuse V2 assets and bank, replace only the V3 generated scene.

Run in the V2 or V3 .blend after prepare_layout_v3.py. Saving/exporting is explicit.
"""
import bpy,bmesh,json,hashlib
from pathlib import Path
from mathutils import Vector
SOURCE=Path(__file__).resolve().parent;ROOT=SOURCE.parent
NAME='COZY_CITY_ISLAND_003'
def build():
    bank_file=ROOT/'bank-island.glb';bank_hash=hashlib.sha256(bank_file.read_bytes()).hexdigest()
    assert bank_hash=='7e37897593a84b9e97bdd60b72e829ffc5d09dca9529b2572b455f74c11e908d'
    old=bpy.data.scenes.get(NAME)
    if old:
        # Only owned V3 datablocks are removed; shared V2 geometry and bank stay intact.
        for o in list(old.objects):
            if o.get('layout_v3_owned'):
                data=o.data;bpy.data.objects.remove(o,do_unlink=True)
                if data and data.users==0:bpy.data.meshes.remove(data)
        bpy.data.scenes.remove(old)
    scene=bpy.data.scenes.new(NAME);bpy.context.window.scene=scene
    scene.unit_settings.system='METRIC';scene.render.fps=30
    library=bpy.data.scenes['COZY_CITY_ASSET_LIBRARY_V2'];v2=bpy.data.scenes['COZY_CITY_ISLAND_001']
    templates={}
    for o in library.objects:
        if o.get('asset'):templates.setdefault(o['asset'],[]).append(o)
    for collection in v2.collection.children:
        if any(k in collection.name for k in ['BUILDINGS','CAMERAS','LIGHTING']):
            for o in collection.objects:scene.collection.objects.link(o)
    scene.camera=v2.camera;scene.world=v2.world
    data=json.loads((SOURCE/'geometry-v3.json').read_text());terrain=[]
    for entry in data['meshes']:
        mesh=bpy.data.meshes.new('V3_'+entry['material']);mesh.from_pydata(entry['vertices'],[],entry['faces']);mesh.update()
        mesh.materials.append(bpy.data.materials[entry['material']])
        if entry['material']=='City_Grass':
            bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
            for poly in mesh.polygons:poly.use_smooth=True
        o=bpy.data.objects.new(mesh.name,mesh);o['layout_v3_owned']=True;scene.collection.objects.link(o);terrain.append(o)
    placements=json.loads((ROOT/'placements.json').read_text())
    for p in placements:
        for source in templates[p['asset']]:
            o=bpy.data.objects.new(p['id']+'__'+source.data.name,source.data);scene.collection.objects.link(o);o['layout_v3_owned']=True;o['placement_id']=p['id'];o['asset']=p['asset'];o['zone']=p['zone'];o.location=p['position'];o.rotation_euler.z=p['angle'];o.scale=(p['scale'],)*3
    bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
    for o in terrain:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'terrain.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_animations=False)
    assert hashlib.sha256(bank_file.read_bytes()).hexdigest()==bank_hash
    # Contact tests query the actual mesh, independently of the authoring height function.
    from mathutils.bvhtree import BVHTree
    verts=[];faces=[]
    for o in terrain:
        if 'Water' in o.data.materials[0].name or 'Cliff' in o.data.materials[0].name:continue
        n=len(verts);verts.extend([o.matrix_world@v.co for v in o.data.vertices]);faces.extend([tuple(n+i for i in poly.vertices) for poly in o.data.polygons])
    bvh=BVHTree.FromPolygons(verts,faces);metrics=json.loads((SOURCE/'asset-metrics-v3.json').read_text());support=[]
    for p in placements:
        x,y,z=p['position'];hit=bvh.ray_cast(Vector((x,y,20)),Vector((0,0,-1)))
        surface=float(hit[0].z) if hit[0] else None
        if surface is not None and not p['asset'].startswith('BRIDGE') and p.get('support')!='cliff-embedded':
            embed=.16*p['scale'] if p['asset']=='ROCK' else .025 if p['asset'].startswith('TREE') else 0
            p['position'][2]=round(surface-metrics[p['asset']]['min'][2]*p['scale']-embed,6)
            for o in scene.objects:
                if o.get('placement_id')==p['id']:o.location.z=p['position'][2]
        support.append({'id':p['id'],'surface':surface,'contact':p['position'][2]+metrics[p['asset']]['min'][2]*p['scale']})
    (ROOT/'placements.json').write_text(json.dumps(placements,indent=2)+'\n',encoding='utf-8')
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'cozy_city_island_v3.blend'))
    (ROOT/'support-checks.json').write_text(json.dumps(support,indent=2))
    result={'scene':NAME,'objects':len(scene.objects),'placements':len(placements),'terrainMeshes':len(terrain),'bankHash':bank_hash,'sourceSha256':data['sourceSha256']}
    (ROOT/'build-v3.json').write_text(json.dumps(result,indent=2));return result
if __name__=='__main__':result=build()
