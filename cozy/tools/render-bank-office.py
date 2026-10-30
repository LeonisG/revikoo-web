"""Compose the two saved masters for a review render; never modify either master."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
from shutil import copyfile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'assets/characters/nilo/source'))
from cozy_geometry import render
scenes=[]
for file in ['assets/characters/nilo/source/nilo_master.blend','assets/interiors/bank-office/source/bank_office_master.blend']:
    with bpy.data.libraries.load(str(ROOT/file),link=False) as (src,dst):dst.scenes=src.scenes
    scenes.append(dst.scenes[0])
character,office=scenes
review=bpy.data.scenes.new('FINAL_OFFICE_REVIEW');bpy.context.window.scene=review
for obj in office.objects:review.collection.objects.link(obj)
clones={}
for obj in character.objects:
    if obj.type not in {'LIGHT','CAMERA'}:
        q=obj.copy();review.collection.objects.link(q);clones[obj]=q
for obj,q in clones.items():
    if obj.parent in clones:q.parent=clones[obj.parent]
    elif not obj.parent:q.location+=Vector((0,1.04,1.01))
review.camera=office.camera;review.world=office.world;review.render.engine='CYCLES';review.cycles.samples=24;review.cycles.use_denoising=True;review.render.resolution_x=1440;review.render.resolution_y=1000;review.render.resolution_percentage=100;review.view_settings.view_transform='AgX';review.render.image_settings.file_format='PNG'
target=ROOT/'assets/interiors/bank-office/previews/office_pov.png'
render(review,target)
copyfile(target,target.with_name('office_with_nilo.png'));copyfile(target,ROOT/'assets/characters/nilo/previews/seated.png')
