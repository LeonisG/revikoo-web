"""Small deterministic Blender authoring toolkit. All coordinates are Z-up metres."""
import bpy,bmesh,math
from mathutils import Vector,Matrix
from math import sin,cos,pi

def material(name,color,rough=.6,metal=0,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m

def mesh(name,v,f,ma,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(v,[],f);d.update()
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(d);bm.free()
    if ma:d.materials.append(ma)
    for p in d.polygons:p.use_smooth=smooth
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);return o

def box(name,pos,size,ma,bevel=.04):
    bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
    for v in bm.verts:v.co=Vector((v.co.x*size[0],v.co.y*size[1],v.co.z*size[2]))
    if bevel:bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=3,profile=.5,affect='EDGES',clamp_overlap=True)
    d=bpy.data.meshes.new(name);bm.to_mesh(d);bm.free();d.materials.append(ma)
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.location=pos;return o

def ellipsoid(name,pos,scale,ma,n=32,rings=18):
    bm=bmesh.new();bmesh.ops.create_uvsphere(bm,u_segments=n,v_segments=rings,radius=1)
    d=bpy.data.meshes.new(name);bm.to_mesh(d);bm.free();d.materials.append(ma)
    for p in d.polygons:p.use_smooth=True
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.location=pos;o.scale=scale;return o

def tube(name,pts,r,ma,n=10):
    v=[];side=Vector((1,0,0))
    for i,p in enumerate(pts):
        p=Vector(p);t=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)])).normalized()
        side=side-t*side.dot(t)
        if side.length<.01:side=t.cross(Vector((0,1,0)))
        side.normalize();up=t.cross(side);rr=r[i] if isinstance(r,(list,tuple)) else r
        v.extend([tuple(p+rr*(side*cos(j*2*pi/n)+up*sin(j*2*pi/n))) for j in range(n)])
    f=[tuple(reversed(range(n))),tuple(range(len(v)-n,len(v)))]+[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(pts)-1) for j in range(n)]
    return mesh(name,v,f,ma,True)

def rod(name,a,b,r,ma,n=16):return tube(name,[a,b],r,ma,n)

def ring(name,p,r,t,ma,plane='XZ',n=48):
    def pt(a):
        x,y,z=p
        return (x+r*cos(a),y,z+r*sin(a)) if plane=='XZ' else (x+r*cos(a),y+r*sin(a),z)
    return tube(name,[pt(i*2*pi/n) for i in range(n+1)],t,ma,8)

def leaf(name,center,w,h,ma,angle=0,depth=.025):
    v=[(0,-depth,0),(0,depth,0)]
    for i in range(12):
        a=i*2*pi/12;v.append((w*sin(a)*(.75+.25*cos(a)),0,h*cos(a)))
    f=[]
    for i in range(12):f.extend([(0,i+2,(i+1)%12+2),(1,(i+1)%12+2,i+2)])
    o=mesh(name,v,f,ma,True);o.location=center;o.rotation_euler.y=angle;return o

def sprout(name,center,size,ma):
    x,y,z=center
    rod(name+'Stem',(x,y,z-size*.45),(x,y,z+size*.30),size*.035,ma,10)
    leaf(name+'Crown',(x,y,z+size*.36),size*.13,size*.28,ma)
    leaf(name+'Left',(x-size*.22,y,z+size*.02),size*.12,size*.25,ma,-.72)
    leaf(name+'Right',(x+size*.22,y,z+size*.02),size*.12,size*.25,ma,.72)

def coin(name,p,r,ma):
    x,y,z=p;rod(name,(x,y+.025,z),(x,y-.025,z),r,ma,48);ring(name+'Rim',(x,y-.031,z),r*.9,r*.045,ma);sprout(name+'Sprout',(x,y-.065,z),r*.9,ma)

def empty(name,pos,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.location=pos
    if parent:bind(o,parent)
    o.empty_display_type='SPHERE';o.empty_display_size=.06;return o

def bind(o,parent):
    bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=parent;o.matrix_parent_inverse=Matrix.Identity(4);o.matrix_basis=parent.matrix_world.inverted()@m

def merge_static(scene,exclude=()):
    """Batch by material AND controller; independent movable nodes stay independent."""
    bpy.context.window.scene=scene;bpy.context.view_layer.update();groups={}
    for o in list(scene.objects):
        if o.type!='MESH' or o in exclude:continue
        key=(o.parent,o.data.materials[0]);groups.setdefault(key,[]).append(o)
    for (parent,ma),objects in groups.items():
        verts=[];faces=[];smooth=[];inv=parent.matrix_world.inverted() if parent else Matrix.Identity(4)
        for o in objects:
            start=len(verts);mat=inv@o.matrix_world;verts.extend([tuple(mat@v.co) for v in o.data.vertices]);faces.extend([tuple(start+i for i in p.vertices) for p in o.data.polygons]);smooth.extend([p.use_smooth for p in o.data.polygons])
        o=mesh((parent.name if parent else 'Office')+'__'+ma.name,verts,faces,ma);o.parent=parent
        for p,s in zip(o.data.polygons,smooth):p.use_smooth=s
        for old in objects:bpy.data.objects.remove(old,do_unlink=True)

def setup_render(scene,pos,target,ortho=None,res=(960,960)):
    bpy.context.window.scene=scene
    cam=bpy.data.objects.new('ReviewCamera',bpy.data.cameras.new('ReviewCamera'));scene.collection.objects.link(cam);cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42
    if ortho:cam.data.type='ORTHO';cam.data.ortho_scale=ortho
    scene.camera=cam;scene.world=bpy.data.worlds.new(scene.name+'World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.66,.71,.75,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=res[0];scene.render.resolution_y=res[1];scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
    return cam

def area(name,pos,target,power,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o

def render(scene,path):
    bpy.context.window.scene=scene;scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)

def save_scene(scene,path):
    bpy.data.libraries.write(str(path),{scene},fake_user=True,compress=True)
    # Give the independent scene a normal startup UI as well as its datablocks.
    # This keeps the interactive authoring session intact while producing a file
    # that opens directly in the intended camera instead of a library-only UI.
    import subprocess,os
    code="import bpy; [(setattr(a.spaces.active.region_3d,'view_perspective','CAMERA')) for s in bpy.data.screens for a in s.areas if a.type=='VIEW_3D']; bpy.context.preferences.filepaths.save_version=0; bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)"
    subprocess.run([bpy.app.binary_path,'--background',str(path),'--python-expr',code],check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,creationflags=0x08000000 if os.name=='nt' else 0)
