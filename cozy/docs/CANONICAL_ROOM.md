# Canonical room reference

`docs/canonical-room.png` is the reference every asset is judged against. Not an
abstract description of a camera — the actual empty room the furniture has to
stand in.

## The floor is the source of truth

The camera is not chosen, it is **measured off the artwork**. Rooms are illustrated
rasters, so assuming a projection is how furniture ends up floating. Instead
`tools/measure-room.py` reads the floor back out of the pixels and writes
`logic/room-camera.mjs`, which the engine projects with. A footprint the grid
draws therefore lands on the floorboards, not near them.

Re-run it whenever a room master changes:

```sh
python tools/measure-room.py           # rewrite the calibration
python tools/measure-room.py --check   # fail if it has gone stale
```

### Measured values

| room | floor axis | residual | samples |
|---|---|---|---|
| small (4×4) | 24.74° | 1.24 px | 580 |
| **medium (5×5) — canonical** | **24.11°** | 0.91 px | 760 |
| large (6×6) | 23.63° | 0.99 px | 942 |

Residual is the worst deviation of any sampled point from the fitted floor edge,
over an edge roughly a thousand pixels long. Sub-pixel: the floors really are
straight, consistent isometric planes.

The three rooms sit within 1.1° of each other because they were illustrated
independently. The engine absorbs that by projecting each room with its own
measured tilt, so every room is exact. **They should still be regenerated at one
angle** — then this table collapses to a single row and the per-room calibration
becomes a formality.

### Canonical camera

| | |
|---|---|
| projection | orthographic, elevated three-quarter; verticals stay vertical |
| floor axis | 24.10° from horizontal (slope 0.4474) |
| logical cell | 88 world units → 176 × 79 px on screen |
| scene box | 1400 × 900, rooms scaled so one cell is exactly 88 units |
| light | upper-left; cast shadow toward lower-right |

`CELL` never changes. Rooms are scaled to fit it, never the other way round —
that is what keeps a chair the same size in a small room and a large one.

## Pivots are measured, not written

A pivot is the point of the sprite that sits on the grid coordinate it is placed
at: horizontally the centre of its base, vertically its ground line.

The subtlety that matters: the **lowest pixel of a sprite is its front corner, not
its centre**. The base is an isometric diamond, so its centre sits higher on
screen by half that diamond's height. Anchoring on the lowest pixel plants every
object half a base too far forward. `tools/measure-pivots.py` walks that back,
deriving the base depth from the artwork's own silhouette rather than from the
logical tile — a cat and a wardrobe both occupy 1×1, but their bases are nothing
alike.

```sh
python tools/measure-pivots.py           # rewrite pivots from the masters
python tools/measure-pivots.py --check   # report drift
```

## Ground contact belongs to the engine

Sprites ship as the object only. The room draws the shadow, in two levels:

- **contact** — a tight dark core exactly where the object meets the floor, sized
  to its own footprint and squashed by the camera tilt so it lies *in* the floor
  plane;
- **cast** — wider, much softer, offset toward the lower right to agree with the
  room's light.

Never a CSS `drop-shadow` on the sprite: that traces the artwork's silhouette,
travels with it, and ignores the room's light direction — which is exactly what
makes a sprite read as a sticker.

A master that ships with its own baked shadow fights this, so
`tools/check-assets.py` flags one.

## Accepting an asset

Three checks, automated:

```sh
python tools/check-assets.py            # AXIS / GROUND / SCALE
python tools/check-assets.py --strict   # non-zero exit for CI
```

- **AXIS** — do the object's floor-plane edges run along the room's floor axes?
  Decidable for pieces that lie flat, where the silhouette edges *are* the floor
  axes.
- **GROUND** — is the pivot a plausible contact point, and is the master free of
  a baked shadow?
- **SCALE** — how much of its footprint does the art fill? Desks fill ~98 %,
  lamps and pets ~45–50 %; far outside that band reads as a toy or a giant.

Then look at it in the room, with the grid and footprints showing:

```text
/cozy/?asset-test=true
```

The golden test room: the empty room, the six reference pieces, every footprint,
anchor and tile size drawn on the floor, and no UI. **If an object's feet land
outside its footprint diamond, the sprite or its pivot is wrong.** It keeps its
own save and rebuilds itself on every load, so it never drifts.

## Known failures

The six rugs fail AXIS. Their two edges disagree with each other by 2–9°
(`rug-clay` is 30.4° against 36.1°), so they are not parallelograms and not one
isometric plane. No transform can rectify that — an affine map can take one
parallelogram to another, but these are not parallelograms, and a projective warp
would distort the pattern.

Rugs are the least forgiving case because they *are* the floor plane, so any
error shows immediately. They need redrawing against this reference, flat on the
24.10° floor.
