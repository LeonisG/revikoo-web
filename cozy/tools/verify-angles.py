"""Prove the shipped camera correction actually lands on the canonical floor.

tools/measure-axes.py decides a correction; this re-measures the result. The
measurement here is written independently of that tool on purpose: if both
shared one routine, a bug in it would agree with itself and pass. Here the
sprite is warped exactly as ui/helpers.mjs warps it, then its floor edges are
read again with a plain median-of-slopes estimator and compared to the room.

    python tools/verify-angles.py            # report
    python tools/verify-angles.py --strict   # exit non-zero if any sprite misses
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOLID = 160
TOLERANCE = 1.5   # degrees either floor edge may still stray after correction


def load(path, marker):
    return json.loads((ROOT / path).read_text(encoding='utf-8').split(marker, 1)[1].strip().removesuffix(';'))


SPRITES = load('assets/sprites.mjs', 'export const SPRITES = ')
CANON_TILT = load('logic/room-camera.mjs', 'export const ROOM_CAMERAS = ')['medium']['tilt']
CANON = math.degrees(math.atan(CANON_TILT))


def warp(image, widen, shear):
    """The transform ui/helpers.mjs applies: x' = widen*x, y' = shear*x + y."""
    w, h = image.size
    out_w, out_h = math.ceil(w * widen), math.ceil(h + abs(shear) * w)
    ty = max(0.0, -shear * w)
    # PIL wants the inverse map, output -> input.
    coeffs = (1 / widen, 0, 0, -shear / widen, 1, -ty)
    return image.transform((out_w, out_h), Image.AFFINE, coeffs, resample=Image.BICUBIC)


def edges(image):
    """Both top slopes, as the median of per-column differences."""
    px = image.getchannel('A').load()
    w, h = image.size
    tops = {}
    for x in range(w):
        for y in range(h):
            if px[x, y] >= SOLID:
                tops[x] = y
                break
    if len(tops) < 80:
        return None
    xs = sorted(tops)
    apex = min(tops, key=lambda x: tops[x])
    span = xs[-1] - xs[0]

    def slope(lo, hi):
        # Least squares over the segment, then one pass dropping the worst
        # decile. A median of per-column steps cannot work here: the steps are
        # whole pixels, so a 24 degree edge reads as a median of 0 or 1.
        pts = [(x, tops[x]) for x in xs if lo < x < hi]
        if len(pts) < 30:
            return None

        def fit(points):
            n = len(points)
            sx = sum(p[0] for p in points); sy = sum(p[1] for p in points)
            sxy = sum(p[0] * p[1] for p in points); sxx = sum(p[0] ** 2 for p in points)
            d = n * sxx - sx * sx
            if not d:
                return None
            m = (n * sxy - sx * sy) / d
            return m, (sy - m * sx) / n

        first = fit(pts)
        if not first:
            return None
        m, b = first
        keep = sorted(pts, key=lambda p: abs(m * p[0] + b - p[1]))[:max(30, int(len(pts) * .9))]
        again = fit(keep)
        return again[0] if again else m

    left = slope(xs[0] + span * .06, apex - span * .10)
    right = slope(apex + span * .10, xs[-1] - span * .06)
    if left is None or right is None:
        return None
    return math.degrees(math.atan(abs(left))), math.degrees(math.atan(abs(right)))


parser = argparse.ArgumentParser()
parser.add_argument('--strict', action='store_true')
args = parser.parse_args()

print(f'canonical floor {CANON:.2f} deg, tolerance +/-{TOLERANCE} deg\n')
print(f'{"sprite":<24}{"before":>16}{"after":>16}   verdict')
missed = checked = 0
for sprite_id in sorted(SPRITES):
    sprite = SPRITES[sprite_id]
    fix = sprite.get('axisFix')
    master = ROOT / sprite.get('master', '')
    if not fix or not master.exists():
        continue
    image = Image.open(master).convert('RGBA')
    before, after = edges(image), edges(warp(image, fix['widen'], fix['shear']))
    if not before or not after:
        continue
    checked += 1
    worst = max(abs(after[0] - CANON), abs(after[1] - CANON))
    ok = worst <= TOLERANCE
    missed += not ok
    print(f'{sprite_id:<24}{before[0]:7.2f}{before[1]:8.2f}{after[0]:8.2f}{after[1]:8.2f}'
          f'   {"ok" if ok else f"OFF by {worst:.2f}"}')

print(f'\n{checked - missed}/{checked} corrected sprites land on the canonical floor')
if missed and args.strict:
    raise SystemExit(f'{missed} sprites miss the canonical floor after correction')
