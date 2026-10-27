"""Measure each sprite's floor-plane axes and derive the correction to the room's.

Most furniture masters came back from generation at the wrong azimuth: their two
floor-plane directions disagree with the room's floor AND with each other, so a
desk's left edge runs at 32.7 degrees while its right runs at 19.5 and the floor
runs at 24.1. That is what makes a piece look turned relative to the room it
stands in.

What is measured: the top boundary of the silhouette. On a desk, a dresser, a
wardrobe or a shelf the highest feature is its flat top, and that top's two far
edges run along the floor axes by definition. The fits are sub-3px on anything
box-shaped, which is the set this applies to.

What is emitted: for each sprite, the affine map that takes those two directions
to the canonical floor axes.

    x' = widen * x
    y' = shear * x + y

Vertical extent is left alone deliberately. Under an orthographic camera at fixed
elevation, turning the azimuth does not change how tall anything appears — only
how its footprint projects. So the whole error is horizontal, and correcting it
by squashing heights would introduce a second, different mistake. A vertical line
x = k maps to x' = widen * k, still vertical. A line of slope m maps to
(shear + m) / widen, so the two floor directions pin down widen and shear.

This is a correction, not a substitute for correct art. A 2D map cannot invent
the faces a real azimuth change would reveal, and it squashes heights by however
much the azimuth was off. Sprites regenerated properly against
docs/canonical-room.png measure as identity here and the correction drops out on
its own.

    python tools/measure-axes.py            # write axisFix into sprites.mjs
    python tools/measure-axes.py --check    # report drift, change nothing
    python tools/measure-axes.py --report   # table of measured angles
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'assets' / 'sprites.mjs'
SOLID = 160
MAX_RESIDUAL = 3.0     # px; above this the top is not a flat face and we abstain
MIN_SAMPLES = 15
MIN_CORRECTION = .012  # below this the sprite already agrees with the room
# A real azimuth error is a modest horizontal stretch. Anything outside this band
# means the "top" we measured is a lampshade or a cushion, not a flat face.
WIDEN_BAND = (.85, 1.25)
MAX_SHEAR = .25
PLAUSIBLE_ANGLE = (14., 42.)   # degrees; a floor-parallel edge lives in here


def load_module(path, marker):
    text = (ROOT / path).read_text(encoding='utf-8')
    return json.loads(text.split(marker, 1)[1].strip().removesuffix(';'))


CANON = load_module('logic/room-camera.mjs', 'export const ROOM_CAMERAS = ')['medium']['tilt']
FOOTPRINTS = json.loads((ROOT / 'tools' / 'footprints.json').read_text(encoding='utf-8'))


def robust_line(points, rounds=4):
    keep = list(points)
    slope = 0.0
    for _ in range(rounds):
        n = len(keep)
        sx = sum(p[0] for p in keep); sy = sum(p[1] for p in keep)
        sxy = sum(p[0] * p[1] for p in keep); sxx = sum(p[0] ** 2 for p in keep)
        denominator = n * sxx - sx * sx
        if not denominator:
            return None
        slope = (n * sxy - sx * sy) / denominator
        intercept = (sy - slope * sx) / n
        residuals = sorted(abs(slope * p[0] + intercept - p[1]) for p in keep)
        cut = max(2.0, residuals[int(len(residuals) * .7)])
        tighter = [p for p in keep if abs(slope * p[0] + intercept - p[1]) <= cut]
        if len(tighter) < 10:
            break
        keep = tighter
    intercept = (sum(p[1] for p in keep) - slope * sum(p[0] for p in keep)) / len(keep)
    return slope, max(abs(slope * p[0] + intercept - p[1]) for p in keep), len(keep)


def measure(master: Path):
    """The two floor-plane slopes read off the top of the silhouette."""
    image = Image.open(master).convert('RGBA')
    px = image.getchannel('A').load()
    width, height = image.size
    tops = {}
    for x in range(width):
        for y in range(height):
            if px[x, y] >= SOLID:
                tops[x] = y
                break
    if len(tops) < 80:
        return None
    xs = sorted(tops)
    apex = min(tops, key=lambda x: tops[x])
    span = xs[-1] - xs[0]
    left = [(x, tops[x]) for x in xs if xs[0] + span * .06 < x < apex - span * .10]
    right = [(x, tops[x]) for x in xs if apex + span * .10 < x < xs[-1] - span * .06]
    if len(left) < MIN_SAMPLES or len(right) < MIN_SAMPLES:
        return None
    fit_left, fit_right = robust_line(left), robust_line(right)
    if not fit_left or not fit_right:
        return None
    return {'left': fit_left[0], 'right': fit_right[0],
            'residual': max(fit_left[1], fit_right[1]),
            'samples': fit_left[2] + fit_right[2]}


def correction(left, right):
    """Affine that sends both measured directions to the canonical floor axes.

    Going left from the apex the boundary falls away with slope `left` (negative
    dy/dx); going right it rises with `right`. Targets are -CANON and +CANON.
    Heights are preserved, so the pair pins down one widen and one shear.
    """
    for slope in (left, right):
        degrees = math.degrees(math.atan(abs(slope)))
        if not PLAUSIBLE_ANGLE[0] <= degrees <= PLAUSIBLE_ANGLE[1]:
            return None
    if abs(right - left) < 1e-6:
        return None
    widen = (right - left) / (2 * CANON)
    shear = -CANON * widen - left
    if not WIDEN_BAND[0] <= widen <= WIDEN_BAND[1] or abs(shear) > MAX_SHEAR:
        return None
    return shear, widen


parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
parser.add_argument('--report', action='store_true')
args = parser.parse_args()

raw = REGISTRY.read_text(encoding='utf-8')
head, body = raw.split('export const SPRITES = ', 1)
sprites = json.loads(body.strip().removesuffix(';'))

applied, skipped, rows = 0, [], []
for sprite_id, sprite in sprites.items():
    spec = FOOTPRINTS.get(sprite_id)
    master = ROOT / sprite.get('master', '')
    if not spec or spec.get('placement') == 'wall' or not sprite.get('master') or not master.exists():
        sprite.pop('axisFix', None)
        continue
    found = measure(master)
    if not found or found['residual'] > MAX_RESIDUAL:
        skipped.append((sprite_id, found['residual'] if found else None))
        sprite.pop('axisFix', None)
        continue
    fix = correction(found['left'], found['right'])
    if not fix:
        skipped.append((sprite_id, found['residual']))
        sprite.pop('axisFix', None)
        continue
    shear, widen = fix
    rows.append((sprite_id,
                 math.degrees(math.atan(abs(found['left']))),
                 math.degrees(math.atan(abs(found['right']))),
                 shear, widen, found['residual']))
    if abs(shear) < MIN_CORRECTION and abs(widen - 1) < MIN_CORRECTION:
        sprite.pop('axisFix', None)         # already agrees with the room
        continue
    sprite['axisFix'] = {'shear': round(shear, 5), 'widen': round(widen, 5)}
    applied += 1

if args.report or args.check:
    target = math.degrees(math.atan(CANON))
    print(f'canonical floor {target:.2f} deg\n')
    print(f"{'sprite':24}{'left':>8}{'right':>8}{'shear':>9}{'widen':>8}{'resid':>7}")
    for sprite_id, left, right, shear, widen, residual in sorted(rows, key=lambda r: -abs(r[3])):
        print(f'{sprite_id:24}{left:8.2f}{right:8.2f}{shear:9.4f}{widen:8.3f}{residual:7.1f}')
    if skipped:
        print(f'\nabstained on {len(skipped)} (top is not a flat face): '
              + ', '.join(s[0] for s in skipped[:12]) + ('…' if len(skipped) > 12 else ''))

if args.check:
    raise SystemExit(0)
if not args.report:
    REGISTRY.write_text(head + 'export const SPRITES = ' + json.dumps(sprites, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    print(f'corrected {applied} sprites, abstained on {len(skipped)}')
