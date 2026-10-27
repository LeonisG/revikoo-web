"""Composite the golden set onto the canonical room, with and without the fix.

The browser is not always reachable, and a screenshot of the running app proves
nothing a reader can measure. This renders the same scene the engine renders,
from the same numbers — logic/room-camera.mjs for the camera, assets/sprites.mjs
for pivots and widths, the layout from app.mjs goldenRoom — and draws the
canonical floor axes over it, so the art can be held against the grid it claims
to sit on.

    python tools/preview-room.py            # writes docs/qa/angles/*.png
"""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CELL, SCENE = 88, (1400, 900)
LAYOUT = [('bookshelf', 0, 0), ('desk', 2, 0), ('floor-lamp', 4, 0), ('chair', 2, 1), ('wardrobe-oak', 0, 3)]
OUT = ROOT / 'docs' / 'qa' / 'angles'


def load(path, marker):
    return json.loads((ROOT / path).read_text(encoding='utf-8').split(marker, 1)[1].strip().removesuffix(';'))


SPRITES = load('assets/sprites.mjs', 'export const SPRITES = ')
CAMERAS = load('logic/room-camera.mjs', 'export const ROOM_CAMERAS = ')
FOOTPRINTS = json.loads((ROOT / 'tools' / 'footprints.json').read_text(encoding='utf-8'))


def scene(size, corrected):
    room = CAMERAS[size]
    tilt, origin, fit = room['tilt'], room['origin'], room['fit']
    canvas = Image.new('RGBA', SCENE, (8, 13, 27, 255))

    shell = Image.open(ROOT / 'assets' / 'masters' / 'rooms' / f'{size}.png').convert('RGBA')
    box = (round(fit['w'] / 100 * SCENE[0]), round(fit['h'] / 100 * SCENE[1]))
    canvas.alpha_composite(shell.resize(box, Image.LANCZOS),
                           (round(fit['x'] / 100 * SCENE[0]), round(fit['y'] / 100 * SCENE[1])))

    def project(x, y):
        return origin['x'] + x - y, origin['y'] + (x + y) * tilt

    # The canonical floor, drawn straight from the projection. Anything that does
    # not run parallel to these lines is not standing on this floor.
    grid = Image.new('RGBA', SCENE, (0, 0, 0, 0))
    pen = ImageDraw.Draw(grid)
    cells = room['cells']
    for i in range(cells + 1):
        pen.line([project(i * CELL, 0), project(i * CELL, cells * CELL)], fill=(111, 214, 255, 150), width=2)
        pen.line([project(0, i * CELL), project(cells * CELL, i * CELL)], fill=(111, 214, 255, 150), width=2)

    placed = []
    for item_id, gx, gy in LAYOUT:
        sprite, spec = SPRITES[item_id], FOOTPRINTS[item_id]
        fix = sprite.get('axisFix') if corrected else None
        widen, shear = (fix['widen'], fix['shear']) if fix else (1.0, 0.0)

        # Exactly what ui/helpers.mjs does: lay the art out 1/widen narrower, then
        # let the transform put the width back.
        lw = sprite['width'] / widen
        lh = lw / sprite['aspect']
        art = Image.open(ROOT / 'assets' / sprite['src'].lstrip('./')).convert('RGBA').resize(
            (max(1, round(lw)), max(1, round(lh))), Image.LANCZOS)
        px, py = sprite['pivot']['x'] * lw, sprite['pivot']['y'] * lh
        if fix:
            ty = max(0.0, -shear * lw)
            out = (max(1, math.ceil(widen * lw)), max(1, math.ceil(lh + abs(shear) * lw)))
            art = art.transform(out, Image.AFFINE, (1 / widen, 0, 0, -shear / widen, 1, -ty), resample=Image.BICUBIC)
            px, py = widen * px, shear * px + py + ty

        w, h = spec['w'], spec['h']
        ax, ay = project((gx + w / 2) * CELL, (gy + h / 2) * CELL)
        placed.append((gx + w + gy + h, art, round(ax - px), round(ay - py)))

    for _, art, x, y in sorted(placed, key=lambda p: p[0]):
        canvas.alpha_composite(art, (x, y))
    canvas.alpha_composite(grid)

    label = 'CORREGIDO' if corrected else 'SIN CORREGIR'
    ImageDraw.Draw(canvas).text((24, 24), f'{size} · {label} · suelo {room["degrees"]}°', fill=(255, 255, 255, 230))
    return canvas


OUT.mkdir(parents=True, exist_ok=True)
for size in ('small', 'medium', 'large'):
    for corrected in (False, True):
        name = f'{size}-{"after" if corrected else "before"}.png'
        scene(size, corrected).convert('RGB').save(OUT / name, quality=92)
        print('wrote', OUT / name)
