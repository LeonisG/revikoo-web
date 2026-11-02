"""Single supported V3 entry point; requires Python + requirements-v3.txt, Blender, Node.

python rebuild_layout_v3.py --blender "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
The V2 master/library is an input, never regenerated. No V1 placement fallback exists.
"""
import argparse,subprocess,hashlib,json,sys
from pathlib import Path
from prepare_layout_v3 import prepare
from audit_layout_v3 import audit
from spatial_v3 import ROOT,SOURCE,write

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(blender):
    immutable={name:digest(ROOT/name) for name in ['bank-island.glb','environment-kit.glb','path-kit.glb']}
    prepare()
    master=SOURCE/'cozy_city_island_v3.blend'
    if not master.exists():master=SOURCE/'cozy_city_island_v2.blend'
    subprocess.run([blender,'--background',str(master),'--python',str(SOURCE/'build_layout_v3.py')],check=True,stdout=subprocess.DEVNULL)
    report=audit()
    assert not report['issues'],f"Spatial audit failed: {report['counts']}"
    for name,value in immutable.items():assert digest(ROOT/name)==value,f'Unexpected mutation: {name}'
    subprocess.run(['node',str(SOURCE.parents[3]/'tools/validate-island.cjs')],check=True,stdout=subprocess.DEVNULL)
    result={'immutable':immutable,'outputs':{name:digest(ROOT/name) for name in ['terrain.glb','placements.json','layout.json','manifest.json']},'instances':len(report['objects']),'issues':len(report['issues'])}
    write(ROOT/'rebuild-result.json',result);print(json.dumps(result));return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--blender',required=True);p.add_argument('--verify-repeat',action='store_true');a=p.parse_args();first=run(a.blender)
    if a.verify_repeat:
        second=run(a.blender);assert first==second,'Regeneration must be byte-identical and keep instance count'
        write(ROOT/'regeneration-check.json',{'passed':True,'runs':2,**second})
