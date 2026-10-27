"""Measure each sprite's pivot from its own artwork.

A pivot is the point on the sprite that sits on the grid coordinate it is placed
at: horizontally the centre of the object's base, vertically its ground line.
Guessing those numbers is what makes furniture look pasted on top of the floor
instead of standing on it, so they are read back out of the alpha channel.

  base centre   the horizontal midpoint of the silhouette. In this projection a
                piece of furniture is symmetric about the vertical line through
                its footprint centre, so the silhouette's midpoint is it.
  ground line   the lowest solidly-opaque row is where the object's FRONT corner
                meets the floor, not its centre. The base is an isometric diamond
                as wide as the silhouette, so its centre sits higher on screen by
                half that diamond's height — subtract it, or everything is planted
                half a base too far forward. Derived from the artwork rather than
                the logical tile, because a cat and a wardrobe both occupy 1x1 but
                their bases are nothing alike.
                Measured at a high alpha cut so a soft baked shadow underneath
                does not drag the pivot down and leave the object hovering.

    python tools/measure-pivots.py            # rewrite pivots in sprites.mjs
    python tools/measure-pivots.py --check    # report drift, change nothing
"""
import argparse
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'assets' / 'sprites.mjs'
SOLID = 160          # alpha that counts as the object itself
FAINT = 40           # alpha that counts as any ink at all, shadow included
FOOTPRINTS = json.loads((ROOT / 'tools' / 'footprints.json').read_text(encoding='utf-8'))
SPRITES = {}


def measure(master: Path, sprite_id: str, art_width: float, tilt: float):
    image = Image.open(master).convert('RGBA')
    alpha = image.getchannel('A')
    width, height = image.size
    solid = alpha.point(lambda v: 255 if v >= SOLID else 0).getbbox()
    faint = alpha.point(lambda v: 255 if v >= FAINT else 0).getbbox()
    if not solid or not faint:
        return None
    centre = (solid[0] + solid[2]) / 2
    # Something hanging on a wall has no base: it is anchored at its middle.
    if FOOTPRINTS.get(sprite_id, {}).get('placement') == 'wall':
        return {
            'pivot': {'x': round(centre / width, 4), 'y': round((solid[1] + solid[3]) / 2 / height, 4)},
            'shadowBleed': 0.0,
        }
    # Walk back from the front corner to the centre of the base diamond. The
    # axis correction widens the sprite, so the base it will actually stand on
    # is wider than the one in the master — measure-axes.py runs first.
    widen = (SPRITES.get(sprite_id, {}).get('axisFix') or {}).get('widen', 1)
    depth = (solid[2] - solid[0]) * widen * tilt / 2
    return {
        'pivot': {'x': round(centre / width, 4), 'y': round((solid[3] - depth) / height, 4)},
        'shadowBleed': round((faint[3] - solid[3]) / height, 4),
    }


parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
args = parser.parse_args()

tilt = json.loads((ROOT / 'logic' / 'room-camera.mjs').read_text(encoding='utf-8')
                  .split('export const ROOM_CAMERAS = ', 1)[1].strip().removesuffix(';'))['medium']['tilt']

raw = REGISTRY.read_text(encoding='utf-8')
head, body = raw.split('export const SPRITES = ', 1)
sprites = json.loads(body.strip().removesuffix(';'))
SPRITES.update(sprites)


def walk(entry):
    """Yield every frame that owns a master: the sprite plus its states."""
    if entry.get('master'):
        yield entry
    for state in (entry.get('states') or {}).values():
        if state.get('master'):
            yield state
    for view in (entry.get('orientations') or {}).values():
        yield from walk(view)


changed, drift, missing = 0, [], []
for sprite_id, entry in sprites.items():
    for frame in walk(entry):
        master = ROOT / frame['master']
        if not master.exists():
            missing.append(frame['master'])
            continue
        found = measure(master, sprite_id, frame.get('width') or entry.get('width'), tilt)
        if not found:
            missing.append(frame['master'])
            continue
        before = frame.get('pivot') or {}
        delta = max(abs(found['pivot']['x'] - before.get('x', 0)),
                    abs(found['pivot']['y'] - before.get('y', 0)))
        if delta > .002:
            drift.append((sprite_id, before, found['pivot'], round(delta, 4), found['shadowBleed']))
            changed += 1
        frame['pivot'] = found['pivot']
        if found['shadowBleed'] > .01:
            frame['shadowBleed'] = found['shadowBleed']
        else:
            frame.pop('shadowBleed', None)

drift.sort(key=lambda row: -row[3])
for sprite_id, before, after, delta, bleed in drift[:25]:
    was = f"{before.get('x', 0):.3f},{before.get('y', 0):.3f}"
    now = f"{after['x']:.3f},{after['y']:.3f}"
    note = f"  (shadow bleed {bleed:.1%})" if bleed > .01 else ''
    print(f"  {sprite_id:24} {was} -> {now}   moved {delta:.3f}{note}")
if len(drift) > 25:
    print(f"  ... and {len(drift) - 25} more")
if missing:
    print(f"\n{len(missing)} masters missing: {missing[:4]}")

if args.check:
    raise SystemExit(f'\n{changed} pivots drifted from the artwork' if changed else '\npivots match the artwork')
REGISTRY.write_text(head + 'export const SPRITES = ' + json.dumps(sprites, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'\nrewrote {changed} pivots in {REGISTRY.relative_to(ROOT)}')
