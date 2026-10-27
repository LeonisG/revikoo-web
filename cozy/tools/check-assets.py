"""Judge every sprite against the room it has to stand in.

Three checks, the ones that decide whether a piece of art belongs to this scene:

  AXIS    Do the object's floor-plane edges run along the room's floor axes?
          Only meaningful for pieces that lie flat (rugs), where the silhouette
          edges ARE the floor axes. A rug whose two edges disagree with each
          other is not an isometric rug at all and cannot be fixed by nudging a
          pivot — it has to be redrawn.
  GROUND  Is the pivot a plausible contact point, and does the master carry a
          baked shadow? Art is supposed to ship as object only; a baked shadow
          fights the room's own lighting.
  SCALE   How much of its footprint does the art fill? Wildly out of band means
          the object will read as a toy or a giant next to its neighbours.

    python tools/check-assets.py           # report
    python tools/check-assets.py --strict  # exit non-zero if anything fails
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CELL = 88
SOLID = 160
FAINT = 40
AXIS_TOLERANCE = 1.5      # degrees a flat edge may stray from the floor axis
SCALE_BAND = (.35, 1.15)  # share of its footprint width the art may fill


def load_json_module(path, marker):
    text = (ROOT / path).read_text(encoding='utf-8')
    return json.loads(text.split(marker, 1)[1].strip().removesuffix(';'))


SPRITES = load_json_module('assets/sprites.mjs', 'export const SPRITES = ')
CAMERAS = load_json_module('logic/room-camera.mjs', 'export const ROOM_CAMERAS = ')
FOOTPRINTS = json.loads((ROOT / 'tools' / 'footprints.json').read_text(encoding='utf-8'))
CANON = CAMERAS['medium']['tilt']
CANON_DEG = math.degrees(math.atan(CANON))


def bottom_edges(alpha, width, height):
    """Slopes of the two lower silhouette edges, with their fit residuals."""
    bottom = {}
    for x in range(width):
        for y in range(height - 1, -1, -1):
            if alpha[x, y] > FAINT:
                bottom[x] = y
                break
    if len(bottom) < 60:
        return None
    xs = sorted(bottom)
    front = max(bottom, key=lambda x: bottom[x])

    def fit(lo, hi):
        pts = [(x, bottom[x]) for x in range(min(lo, hi), max(lo, hi)) if x in bottom]
        trim = max(3, len(pts) // 8)
        pts = pts[trim:-trim]
        if len(pts) < 12:
            return None
        n = len(pts)
        sx = sum(p[0] for p in pts); sy = sum(p[1] for p in pts)
        sxy = sum(p[0] * p[1] for p in pts); sxx = sum(p[0] ** 2 for p in pts)
        m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
        b = (sy - m * sx) / n
        return m, max(abs(m * p[0] + b - p[1]) for p in pts)

    return fit(xs[0], front), fit(front, xs[-1])


def inspect(sprite_id, sprite):
    spec = FOOTPRINTS.get(sprite_id)
    master = ROOT / sprite.get('master', '')
    if not spec or not sprite.get('master') or not master.exists():
        return None
    image = Image.open(master).convert('RGBA')
    alpha = image.getchannel('A')
    width, height = image.size
    solid = alpha.point(lambda v: 255 if v >= SOLID else 0).getbbox()
    faint = alpha.point(lambda v: 255 if v >= FAINT else 0).getbbox()
    if not solid or not faint:
        return None
    issues = []

    # AXIS — only decidable for pieces that lie in the floor plane, where the
    # silhouette edges approximate the floor axes. Production applies a measured
    # affine (axisFix) to volumetric art, but deliberately not to rugs: their two
    # edges disagree, so no affine can square them. These are judged as authored,
    # which is how they ship, and they stay failing until they are redrawn.
    if 'rug' in sprite_id:
        edges = bottom_edges(alpha.load(), width, height)
        if edges and edges[0] and edges[1]:
            (ml, el), (mr, er) = edges
            left, right = math.degrees(math.atan(abs(ml))), math.degrees(math.atan(abs(mr)))
            note = ' (authored view, no affine)'
            if abs(left - right) > AXIS_TOLERANCE:
                issues.append(f'AXIS  edges disagree{note}: {left:.1f}° vs {right:.1f}° — not one isometric plane')
            elif abs((left + right) / 2 - CANON_DEG) > AXIS_TOLERANCE:
                issues.append(f'AXIS  {(left + right) / 2:.1f}° vs room {CANON_DEG:.1f}°{note}')

    # GROUND — pivot plausibility and baked shadow.
    pivot = sprite.get('pivot') or {}
    if spec.get('placement') != 'wall' and not (.4 <= pivot.get('y', 0) <= .98):
        issues.append(f"GROUND pivot.y {pivot.get('y')} is not a contact point")
    bleed = (faint[3] - solid[3]) / height
    if bleed > .04:
        issues.append(f'GROUND possible baked shadow / faint alpha ({bleed:.0%} below solid bounds); inspect visually')

    # SCALE — share of the footprint the art fills.
    # SCALE — measured on what actually reaches the floor. The renderer lays art
    # out 1/widen narrower so the corrected base still spans its footprint, so a
    # corrected sprite must be judged at that width, not its authored one.
    ratio = None
    if spec.get('placement') == 'floor' and sprite.get('width'):
        widen = (sprite.get('axisFix') or {}).get('widen', 1)
        visible = sprite['width'] / widen * (solid[2] - solid[0]) / width
        ratio = visible / (CELL * (spec['w'] + spec['h']))
        if not SCALE_BAND[0] <= ratio <= SCALE_BAND[1]:
            issues.append(f'SCALE fills {ratio:.0%} of its {spec["w"]}×{spec["h"]} footprint')
    return {'issues': issues, 'ratio': ratio}


parser = argparse.ArgumentParser()
parser.add_argument('--strict', action='store_true')
args = parser.parse_args()

failed = checked = 0
for sprite_id in sorted(SPRITES):
    found = inspect(sprite_id, SPRITES[sprite_id])
    if not found:
        continue
    checked += 1
    if found['issues']:
        failed += 1
        print(f'{sprite_id}')
        for issue in found['issues']:
            print(f'    {issue}')

print(f'\n{checked - failed}/{checked} sprites pass against the {CANON_DEG:.2f}° canonical floor')
if failed and args.strict:
    raise SystemExit(f'{failed} sprites need regenerating')
