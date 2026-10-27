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

## Axis correction

Most masters came back from generation at the wrong azimuth. Their two
floor-plane directions disagree with the room's floor **and with each other** —
`desk` measures 32.7° on the left and 19.5° on the right against a 24.10° floor.
That is what makes a piece look turned relative to the room it stands in, and no
pivot adjustment can help: the angles themselves are wrong.

`tools/measure-axes.py` reads both directions off the top of each silhouette
(on anything box-shaped the highest feature is its flat top, whose far edges run
along the floor axes by definition — the fits come in under 3 px) and derives the
affine that sends them to the canonical axes:

    x' = widen * x
    y' = shear * x + y

**Heights are deliberately untouched.** Under an orthographic camera at fixed
elevation, turning the azimuth does not change how tall anything appears, only
how its footprint projects. The whole error is horizontal, so squashing heights
would introduce a second, different mistake. Verticals stay vertical, which
matters more than anything else for this camera.

The correction is pinned at the pivot, so the object stays anchored, and it
travels with the catalogue thumbnail so the shop shows the object that will
actually be placed.

```sh
python tools/measure-axes.py            # write axisFix into sprites.mjs
python tools/measure-axes.py --report   # table of measured angles
```

It abstains wherever the top is not a flat floor-parallel face — a lampshade, a
cushion, foliage — and rejects any correction outside a plausible band, because
a 40 % squash means the measurement was of the wrong thing, not that the art is
that wrong. 33 of 88 sprites currently carry a correction; the rest already agree
with the room or cannot be measured this way.

**This is a correction, not a substitute for correct art.** A 2D map cannot
invent the faces a real azimuth change would reveal. Sprites regenerated properly
against `docs/canonical-room.png` measure as identity and the correction drops
out on its own. Run the tool after every regeneration.

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

The six rugs fail AXIS, and they are the one case the correction cannot rescue.
A rug is a flat quad, so its top and bottom edges must be parallel — but they
are not: `rug-cream` measures 30.6°/34.0° along the bottom and 31.0°/28.7° along
the top. The shape is not a parallelogram, so no affine map exists that takes it
to the floor plane; a projective warp would be needed and would distort the
pattern.

The correction still helps where it applies (`gamer-rug` goes from 29.5°/36.0°
to 26.7°/30.1°) but `tools/check-assets.py` keeps reporting them, which is
correct — they need redrawing flat on the 24.10° floor.

Rugs are the least forgiving case because they *are* the floor plane, so any
error shows immediately.
