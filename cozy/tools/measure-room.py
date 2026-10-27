"""Measure the canonical isometric camera straight off the room artwork.

The floor is the source of truth. Every room master is an illustrated raster, so
instead of assuming a projection we read it back out of the pixels and emit a
calibration the engine projects with. That guarantees a footprint drawn by the
grid lands exactly on the painted floor, which is the only way furniture can
look like it is standing in the room rather than pasted on top of it.

Two independent measurements per room:

  slope   the angle of the floor axes, fitted over hundreds of columns along the
          floor/wainscot junction. Robust (sub-pixel residuals) because those
          junctions are long straight lines.
  extent  the floor's left and right corners, taken from the widest points of
          the alpha silhouette. Unambiguous, unlike the apex, which sits behind
          a wooden corner post that shares the floor's colour.

The apex is then derived from the two corners and the slope rather than looked
for directly.

    python tools/measure-room.py            # rewrite logic/room-camera.mjs
    python tools/measure-room.py --check    # verify it still matches the art
"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Must match CELL in logic/grid.mjs: the world unit every sprite is calibrated
# against. Rooms are scaled to fit it, never the other way round.
CELL = 88
SCENE = (1400, 900)
ROOMS = {'small': 4, 'medium': 5, 'large': 6}


def is_floor(p):
    r, g, b, a = p
    return a > 60 and r > 175 and r - g > 55 and g - b > 45


def robust_line(points, rounds=4):
    """Least squares with iterative outlier rejection; returns slope, intercept, residual."""
    keep = list(points)
    m = b = 0.0
    for _ in range(rounds):
        n = len(keep)
        sx = sum(p[0] for p in keep); sy = sum(p[1] for p in keep)
        sxy = sum(p[0] * p[1] for p in keep); sxx = sum(p[0] ** 2 for p in keep)
        m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
        b = (sy - m * sx) / n
        residuals = sorted(abs(m * p[0] + b - p[1]) for p in keep)
        cut = max(3.0, residuals[int(len(residuals) * .7)])
        tighter = [p for p in keep if abs(m * p[0] + b - p[1]) <= cut]
        if len(tighter) < 12:
            break
        keep = tighter
    return m, b, max(abs(m * p[0] + b - p[1]) for p in keep), len(keep)


def probe(name):
    """Raw measurement of one room master, before any canonical decision."""
    image = Image.open(ROOT / 'assets' / 'masters' / 'rooms' / f'{name}.png').convert('RGBA')
    px = image.load()
    width, height = image.size

    # Floor axis angle, from the topmost floor pixel in each column.
    tops = {}
    for x in range(width):
        ys = [y for y in range(height) if is_floor(px[x, y])]
        if len(ys) > 25:
            tops[x] = min(ys)
    xs = sorted(tops)
    centre = min(tops, key=lambda x: tops[x])
    left_slope, _, left_err, left_n = robust_line([(x, tops[x]) for x in xs if xs[0] + 20 < x < centre - 70])
    right_slope, _, right_err, right_n = robust_line([(x, tops[x]) for x in xs if centre + 70 < x < xs[-1] - 20])
    slope = (abs(left_slope) + abs(right_slope)) / 2

    # Floor extent, from the widest points of the silhouette.
    alpha = image.getchannel('A').load()
    spans = {}
    for x in range(width):
        ys = [y for y in range(height) if alpha[x, y] > 60]
        if ys:
            spans[x] = (min(ys), max(ys))
    columns = sorted(spans)
    lx, rx = columns[0], columns[-1]
    left_y = sum(spans[lx]) / 2
    right_y = sum(spans[rx]) / 2
    apex_x = (lx + rx) / 2
    apex_y = ((left_y - (apex_x - lx) * slope) + (right_y - (rx - apex_x) * slope)) / 2
    half = ((apex_x - lx) + (rx - apex_x)) / 2

    return {'slope': slope, 'apex': (apex_x, apex_y), 'half': half, 'size': (width, height),
            'left': left_slope, 'right': right_slope, 'err': max(left_err, right_err),
            'samples': left_n + right_n}


def calibrate(found, cells, canon):
    """Place one room on the canonical camera.

    The three masters were drawn at slightly different elevations (24.74 / 24.11 /
    23.63 degrees), so a sprite grounded in one is wrong in the others. One angle
    has to win. We keep the horizontal scale that makes a cell exactly CELL wide
    and scale the art vertically by canon/slope, which is the only axis an
    elevation change touches. The correction is under 3%, far below what reads as
    a stretch, and it buys an identical floor in every room.
    """
    slope = found['slope']
    apex_x, apex_y = found['apex']
    width, height = found['size']
    scale = CELL * cells / found['half']
    stretch = canon / slope
    art_w, art_h = width * scale, height * scale * stretch
    offset_x, offset_y = (SCENE[0] - art_w) / 2, (SCENE[1] - art_h) / 2
    origin = (offset_x + apex_x * scale, offset_y + apex_y * scale * stretch)
    front_y = origin[1] + 2 * cells * CELL * canon
    left_slope, right_slope = found['left'], found['right']

    return {
        'cells': cells,
        'tilt': round(canon, 5),
        'degrees': round(math.degrees(math.atan(canon)), 3),
        'stretch': round(stretch, 5),
        'authoredDegrees': round(math.degrees(math.atan(slope)), 3),
        'origin': {'x': round(origin[0], 2), 'y': round(origin[1], 2)},
        'fit': {
            'x': round(offset_x / SCENE[0] * 100, 4), 'y': round(offset_y / SCENE[1] * 100, 4),
            'w': round(art_w / SCENE[0] * 100, 4), 'h': round(art_h / SCENE[1] * 100, 4),
        },
        'quality': {
            'leftDeg': round(math.degrees(math.atan(abs(left_slope))), 3),
            'rightDeg': round(math.degrees(math.atan(abs(right_slope))), 3),
            'residualPx': round(found['err'], 2),
            'samples': found['samples'],
            'frontY': round(front_y, 1),
        },
    }


parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true', help='fail if the committed calibration is stale')
args = parser.parse_args()

# One canonical camera for every size. The medium room wins because it has the
# lowest fit residual (0.91 px) and sits between the other two, so no room moves
# far. Changing this value re-grounds every asset: re-run tools/measure-axes.py.
probes = {name: probe(name) for name in ROOMS}
CANON = probes['medium']['slope']
rooms = {name: calibrate(probes[name], cells, CANON) for name, cells in ROOMS.items()}
target = ROOT / 'logic' / 'room-camera.mjs'
body = (
    '// Generated by tools/measure-room.py from the room artwork. Do not hand-edit:\n'
    '// re-run the tool when a room master changes.\n'
    '//\n'
    '// The floor is the canonical camera. Every size shares ONE tilt. Each master was drawn at a\n'
    '// slightly different elevation, so each is scaled vertically by `stretch`.\n'
    'export const ROOM_CAMERAS = ' + json.dumps(rooms, indent=2) + ';\n'
)

if args.check:
    current = target.read_text(encoding='utf-8') if target.exists() else ''
    if current.strip() != body.strip():
        raise SystemExit('room-camera.mjs is stale; re-run tools/measure-room.py')
    print('room camera calibration is up to date')
else:
    target.write_text(body, encoding='utf-8')
    for name, room in rooms.items():
        q = room['quality']
        print(f"{name:7} {room['degrees']:.2f}deg (L {q['leftDeg']:.2f} / R {q['rightDeg']:.2f}, "
              f"residual {q['residualPx']}px over {q['samples']} samples)  "
              f"origin {room['origin']}  front y {q['frontY']}")
    print(f'\nwrote {target.relative_to(ROOT)}')
