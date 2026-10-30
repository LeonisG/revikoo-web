"""Run with Blender --background --factory-startup --python this_file.
Builds independent masters/GLBs, then renders review evidence. No existing scene is opened.
"""
import bpy,runpy,sys,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
n=runpy.run_path(str(ROOT/'assets/characters/nilo/source/build_nilo.py'),run_name='authoring')
if '--nilo-only' in sys.argv:
    if '--all-nilo-previews' in sys.argv:
        S=n['S'];cam=S.camera;S.render.resolution_x=800;S.render.resolution_y=800;S.cycles.samples=24
        for name,pos in [('front',(0,-4,1.2)),('side',(4,0,1.2)),('back',(0,4,1.2)),('three-quarter',(3,-4,1.8))]:
            cam.location=pos;cam.rotation_euler=(Vector((0,0,1.12))-cam.location).to_track_quat('-Z','Y').to_euler();n['render'](S,n['OUT']/('previews/'+name+'.png'))
        cam.location=(0,-4,1.2);cam.rotation_euler=(Vector((0,0,1.12))-cam.location).to_track_quat('-Z','Y').to_euler()
    n['pose']('NILO_GREET',.75,1.5);n['S'].cycles.samples=24;n['render'](n['S'],n['OUT']/'previews/greet.png');sys.exit(0)
o=runpy.run_path(str(ROOT/'assets/interiors/bank-office/source/build_office.py'),run_name='authoring')
if '--no-previews' not in sys.argv:
    S=n['S'];cam=S.camera;S.render.resolution_x=800;S.render.resolution_y=800;S.cycles.samples=24
    for name,pos in [('front',(0,-4,1.2)),('side',(4,0,1.2)),('back',(0,4,1.2)),('three-quarter',(3,-4,1.8))]:
        cam.location=pos;cam.rotation_euler=(Vector((0,0,1.12))-cam.location).to_track_quat('-Z','Y').to_euler();n['render'](S,n['OUT']/('previews/'+name+'.png'))
    cam.location=(0,-4,1.2);cam.rotation_euler=(Vector((0,0,1.12))-cam.location).to_track_quat('-Z','Y').to_euler()
    n['pose']('NILO_GREET',.75,1.5);n['render'](S,n['OUT']/'previews/greet.png');n['pose']('NILO_IDLE',0,5)
    office=o['S'];office.cycles.samples=24;o['render'](office,o['OUT']/'previews/office_empty.png')
    review=bpy.data.scenes.new('BANK_OFFICE_REVIEW');bpy.context.window.scene=review
    for obj in office.objects:review.collection.objects.link(obj)
    clones={}
    for obj in S.objects:
        if obj.type not in {'CAMERA','LIGHT'}:
            q=obj.copy();review.collection.objects.link(q);clones[obj]=q
    for obj,q in clones.items():
        if obj.parent in clones:q.parent=clones[obj.parent]
        elif not obj.parent:q.location+=Vector((0,1.04,1.01))
    review.camera=office.camera;review.world=office.world;review.render.engine='CYCLES';review.cycles.samples=24;review.cycles.use_denoising=True;review.render.resolution_x=1440;review.render.resolution_y=1000;review.render.resolution_percentage=100;review.view_settings.view_transform='AgX';review.render.image_settings.file_format='PNG'
    o['render'](review,o['OUT']/'previews/office_pov.png')
    # The seated character and furnished office share this review, never the exports.
    from shutil import copyfile
    copyfile(o['OUT']/'previews/office_pov.png',o['OUT']/'previews/office_with_nilo.png')
    copyfile(o['OUT']/'previews/office_pov.png',n['OUT']/'previews/seated.png')
print('BANK_VISIT_BUILD_COMPLETE')
