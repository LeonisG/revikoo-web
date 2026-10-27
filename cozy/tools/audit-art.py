"""Read-only art inventory. Explicit --output writes evidence, never production art.

Run from anywhere: python cozy/tools/audit-art.py --output cozy/docs/audit/baseline.json
Pillow + Node are authoring dependencies only. No network or generation calls.
"""
import argparse
import ast
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def image_info(path):
    with Image.open(path) as source:
        image = source.convert('RGBA')
        alpha = image.getchannel('A')
        solid = alpha.point(lambda value: 255 if value >= 160 else 0).getbbox()
        histogram = alpha.histogram()
        sample = image.copy()
        sample.thumbnail((96, 96))
        # Opaque colour bins only: transparent black must never win the palette.
        colours = Counter(tuple((channel // 32) * 32 + 16 for channel in pixel[:3])
                          for pixel in sample.getdata() if pixel[3] >= 160)
        return {'file': path.relative_to(ROOT).as_posix(), 'format': source.format,
                'pixels': list(source.size), 'bytes': path.stat().st_size,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'alphaRange': list(alpha.getextrema()), 'solidBounds': solid,
                'transparentPercent': round(histogram[0] / (image.width * image.height) * 100, 2),
                'paletteBins': ['#%02x%02x%02x' % rgb for rgb, _ in colours.most_common(5)]}


def silhouette_measure():
    # Reuse the measured silhouette fit without executing its registry-writing CLI.
    tree = ast.parse((ROOT / 'tools/measure-axes.py').read_text(encoding='utf-8'))
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)
             and node.name in ('robust_line', 'measure')]
    scope = {'Image': Image, 'Path': Path, 'SOLID': 160, 'MIN_SAMPLES': 15}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), 'measure-axes:read-only-functions', 'exec'), scope)
    return scope['measure']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    query = """import {ITEMS} from './logic/catalog.mjs';
        import {SPRITES} from './assets/sprites.mjs';
        import {ROOM_CAMERAS} from './logic/room-camera.mjs';
        console.log(JSON.stringify({items:ITEMS,sprites:SPRITES,cameras:ROOM_CAMERAS}));"""
    runtime = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', query], cwd=ROOT, encoding='utf-8'))
    measure = silhouette_measure()
    structural = {'desk', 'desk-wide', 'drawers', 'bookshelf', 'shelf-small', 'wardrobe-oak', 'side-table',
                  'gamer-desk', 'gamer-dresser', 'gamer-shelf', 'wardrobe-dark', 'future-desk',
                  'future-dresser', 'future-wardrobe', 'industrial-desk', 'industrial-dresser',
                  'industrial-shelf', 'oak-box', 'radio', 'gamer-pc'}
    assets = []
    for item in runtime['items']:
        sprite = runtime['sprites'][item['id']]
        kind = 'COMPANION' if item.get('companion') else item['placement'].upper()
        master = ROOT / sprite['master']
        fit = measure(master) if kind != 'WALL' else None
        angles = None
        if fit:
            angles = {'leftDegrees': round(math.degrees(math.atan(fit['left'])), 3),
                      'rightDegrees': round(math.degrees(math.atan(fit['right'])), 3),
                      'residualPx': round(fit['residual'], 3), 'samples': fit['samples'],
                      'method': 'alpha>=160 top silhouette robust line fit; retained samples',
                      'structuralCandidate': item['id'] in structural and fit['residual'] <= 3,
                      'confidence': 'candidate, not certified camera' if item['id'] in structural and fit['residual'] <= 3
                                    else 'REJECTED as camera evidence: non-structural silhouette or poor fit'}
        frames = []
        for pose, frame in [('idle', sprite), *sprite.get('states', {}).items()]:
            frames.append({'pose': pose, 'delivery': image_info(ROOT / 'assets' / frame['src']),
                           'master': image_info(ROOT / frame['master']), 'pivot': frame['pivot'],
                           'displayWidth': frame['width'], 'displayHeight': round(frame['width'] / frame['aspect'], 3)})
        issues = []
        # The measured affine ships: see the derivation in docs/PROJECTION_SPEC.md
        # and the independent re-measurement in tools/verify-angles.py. It is a
        # bridge over legacy art, so it is still worth reporting — but as debt to
        # retire by reauthoring, not as a defect to strip out of the renderer.
        if sprite.get('axisFix'):
            issues.append('MEDIUM: ships corrected by measured axisFix; reauthor at 24.105 deg to retire it')
        if sprite.get('axisFix') and not (angles and angles['structuralCandidate']):
            issues.append('HIGH: silhouette fit does not establish horizontal structural edges')
        if item['flat']:
            issues.append('HIGH: rug edges disagree with room; see check-assets --strict')
        if kind == 'WALL':
            issues.append('HIGH: fixed 19.8-degree wall skew differs from room; thickness not reconstructed')
        if item.get('glow', 0):
            issues.append('HIGH: glow anchored at ground; no occlusion or material relighting')
        if not issues:
            issues.append('MEDIUM: contact and scale need in-scene validation; alpha-derived pivot is a heuristic')
        assets.append({'id': item['id'], 'name': item['name'], 'collection': item['collection'], 'type': kind,
                       'footprintCells': [item['w'], item['h']], 'surfaceHeight': item['top'],
                       'orientations': [0, *map(int, sprite.get('orientations', {}))],
                       'legacyAxisFix': sprite.get('axisFix'), 'projectedAxes': angles,
                       'frames': frames, 'visualStatus': 'DRAFT',
                       'lighting': 'Illustrated highlights baked in; apparent upper-left/front key; exact direction unverified',
                       'outline': 'Painted dark edge; screen thickness changes with display scale; not an independent pass',
                       'texture': 'Baked illustrated material; no normal, roughness or depth maps',
                       'bakedShadow': 'Internal shading present; external cast/contact separation unverified, alpha alone cannot prove it',
                       'detail': '768px delivery; full-size material detail reduces at room scale',
                       'consistency': 'See collection and object notes in ASSET_AUDIT.md; no camera-approved golden asset yet',
                       'issues': issues})
    rooms = []
    for size, camera in runtime['cameras'].items():
        rooms.append({'id': 'room-' + size, 'type': 'ROOM', 'camera': camera,
                      'delivery': image_info(ROOT / 'assets/room' / f'illustrated-{size}.webp'),
                      'visualStatus': 'DRAFT', 'issues': ['CRITICAL: floor, walls, window and base baked together; size changes camera',
                          'HIGH: silhouette extents include base, not a certified walkable floor']})
    files = [{'file': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size,
              'role': 'legacy or auxiliary vector; see manifest/CSS for active layers' if p.suffix == '.svg' else
                      'source master' if p.suffix == '.png' else 'delivery' if p.suffix == '.webp' else 'other'}
             for p in sorted((ROOT / 'assets').rglob('*')) if p.is_file()]
    models = [p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.suffix.lower() in ('.glb', '.gltf', '.bbmodel', '.blend', '.obj', '.fbx')]
    result = {'schemaVersion': 1, 'baselineCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'method': 'File inspection + live catalog metadata. Image measurements are not artistic approval.',
              'assets': assets, 'rooms': rooms, 'files': files, 'models': models}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'items': len(assets), 'frames': sum(len(a['frames']) for a in assets),
                      'rooms': len(rooms), 'models': len(models), 'files': len(files),
                      'legacyAffine': sum(bool(a['legacyAxisFix']) for a in assets),
                      'output': str(args.output) if args.output else None}))


if __name__ == '__main__':
    main()
