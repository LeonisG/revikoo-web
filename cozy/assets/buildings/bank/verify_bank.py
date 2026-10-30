"""Round-trip and binary animation verification for the exported bank."""
import bpy,os,json,struct,math
n=bpy.app.driver_namespace['bank_final'];S=n['S'];OUT=n['OUT']
raw=open(os.path.join(OUT,'cozy_bank.glb'),'rb').read();ln=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+ln]);base=28+ln
def values(index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5123:'H',5125:'I'}[a['componentType']];off=base+v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*struct.calcsize(fmt))
    return [struct.unpack_from('<'+fmt*width,raw,off+i*stride) for i in range(a['count'])]
checks=[]
for clip in g['animations']:
    for ch in clip['channels']:
        if ch['target']['path']!='rotation':continue
        sampler=clip['samplers'][ch['sampler']];q=values(sampler['output']);times=values(sampler['input']);angle=2*math.degrees(math.acos(min(1,abs(sum(x*y for x,y in zip(q[0],q[-1]))))))
        expected=0 if clip['name']=='DOORS_CLOSED' else 85
        assert abs(angle-expected)<.01,(clip['name'],angle)
        assert abs(times[-1][0]-times[0][0]-.8)<.001
        checks.append({'clip':clip['name'],'node':g['nodes'][ch['target']['node']]['name'],'rotationDeltaDegrees':angle,'durationSeconds':times[-1][0]-times[0][0]})
assert len(checks)==6
t=bpy.data.scenes.new('COZY_BANK_ROUNDTRIP');bpy.context.window.scene=t
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'cozy_bank.glb'))
objects=list(t.objects)
assert len([o for o in objects if o.animation_data])==2
for o in S.objects:
    if o.type in {'CAMERA','LIGHT'} or o.name=='PresentationGround':t.collection.objects.link(o)
t.camera=n['iso'];t.world=S.world;t.render.engine='CYCLES';t.cycles.samples=32;t.cycles.use_denoising=True;t.render.resolution_x=1200;t.render.resolution_y=1100;t.render.resolution_percentage=75;t.render.filepath=os.path.join(OUT,'cozy_bank_glb_roundtrip.png');bpy.ops.render.render(write_still=True)
report=json.load(open(os.path.join(OUT,'validation.json')));report.update({'roundtripImportedObjects':len(objects),'roundtripMeshCount':sum(o.type=='MESH' for o in objects),'animationChecks':checks,'missingUVs':[o.name for o in objects if o.type=='MESH' and not o.data.uv_layers]})
json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2)
bpy.context.window.scene=S
result={'validation':report}
