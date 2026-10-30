import bpy,os
for scene in list(bpy.data.scenes):
    if scene.name.startswith(('COZY_CITY_ISLAND','COZY_CITY_ASSET_LIBRARY')):
        for o in list(scene.objects):bpy.data.objects.remove(o,do_unlink=True)
        bpy.data.scenes.remove(scene)
p=os.path.join(os.path.dirname(__file__),'build_island.py')
n={'__file__':p,'__name__':'island_builder'}
exec(compile(open(p,encoding='utf-8').read(),p,'exec'),n)
bpy.app.driver_namespace['island']=n
n['terrain']();n['paths']();n['load_bank']();n['camera']();n['render']('01_world_blockout')
n['asset_library']();n['dress']();n['improve_bank']();n['render']('02_nature');n['export']()
try:
    import addon_utils
    addon_utils.enable('bl_ext.user_default.mcp',default_set=True,persistent=False)
    bpy.ops.blmcp.server_start()
except Exception as e:
    print('MCP start:',e)
