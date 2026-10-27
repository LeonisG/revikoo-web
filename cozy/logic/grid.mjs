// The room is a square grid of floor cells drawn in the diorama's orthographic
// projection. Everything spatial lives here and nothing in this module touches
// the DOM or storage, so placement rules can be reasoned about and tested alone.
//
// Coordinates come in three kinds and it is worth keeping them straight:
//   cell   (gx, gy)  integer grid indices, 0..size-1
//   world  (x, y, z) diorama units; x and y run along the floor, z is height
//   stage  (%, %)    position inside the 1400x900 scene box the room is drawn in
//
// gx grows toward the lower right of the screen, gy toward the lower left, so a
// cell's screen depth is simply gx + gy: larger means nearer the viewer.

export const CELL = 88;              // world units per cell
export const SCENE = { w: 1400, h: 900 };
export const ORIGIN = { x: 700, y: 480 };  // where world (0,0,0) lands on stage
export const TILT = .36;             // how far one unit of depth drops on screen

// A symbol's box is the same for every object so that two objects drawn at the
// same scale really are the same size in the room. The art is centred on the
// footprint and stands on the anchor line.
export const SYMBOL = { w: 420, h: 400, anchorX: 210, anchorY: 330 };

export const project = (x, y, z = 0) => [ORIGIN.x + x - y, ORIGIN.y + (x + y) * TILT - z];
export const toStage = (x, y, z = 0) => {
  const [sx, sy] = project(x, y, z);
  return { x: +(sx / SCENE.w * 100).toFixed(3), y: +(sy / SCENE.h * 100).toFixed(3) };
};

// Rotation only ever swaps the footprint; a quarter turn of a 2x1 desk is 1x2.
export const footprint = (item, rotation = 0) =>
  rotation % 180 === 0 ? { w: item.w, h: item.h } : { w: item.h, h: item.w };

export const cellsOf = (placement, item) => {
  const { w, h } = footprint(item, placement.rotation);
  const out = [];
  for (let x = placement.gx; x < placement.gx + w; x++)
    for (let y = placement.gy; y < placement.gy + h; y++) out.push(`${x},${y}`);
  return out;
};

export const inBounds = (placement, item, size) => {
  const { w, h } = footprint(item, placement.rotation);
  return Number.isInteger(placement.gx) && Number.isInteger(placement.gy)
    && [0, 90, 180, 270].includes(placement.rotation ?? 0)
    && placement.gx >= 0 && placement.gy >= 0 && placement.gx + w <= size && placement.gy + h <= size;
};

/** Surface slots are local to their host; rotate in world space before projecting. */
export function surfacePosition(host, item, slot) {
  const local = item.surfaces?.[slot];
  if (!local) return null;
  let x = local.x, y = local.y;
  if (host.rotation === 90) [x, y] = [item.h - y, x];
  if (host.rotation === 180) [x, y] = [item.w - x, item.h - y];
  if (host.rotation === 270) [x, y] = [y, item.w - x];
  return { x: host.gx + x, y: host.gy + y, z: item.top };
}

export function bindSurface(p, placed, catalog) {
  if (p.parentSurfaceId) return { ...p, on: true };
  const match = Object.entries(placed).find(([, host]) => catalog[host.item]?.surface
    && cellsOf(host, catalog[host.item]).includes(`${p.gx},${p.gy}`));
  if (!match) return { ...p, on: true };
  const [parentSurfaceId, host] = match, item = catalog[host.item];
  const slots = item.surfaces.map((_, i) => ({ i, pos: surfacePosition(host, item, i) }));
  slots.sort((a, b) => ((a.pos.x - p.gx - .5) ** 2 + (a.pos.y - p.gy - .5) ** 2)
    - ((b.pos.x - p.gx - .5) ** 2 + (b.pos.y - p.gy - .5) ** 2));
  return { ...p, on: true, parentSurfaceId, surfaceSlot: slots[0].i };
}

/** One occupancy index, shared by validation and the build overlay. */
export function occupancy(placed, catalog, ignoreId) {
  const map = new Map();
  for (const [key, p] of Object.entries(placed)) {
    const item = catalog[p.item];
    if (key === ignoreId || item?.placement !== 'floor') continue;
    for (const cell of cellsOf(p, item)) {
      if (!map.has(cell)) map.set(cell, []);
      map.get(cell).push({ key, flat: item.flat });
    }
  }
  return map;
}

// Where an object sits on the stage: centred over its footprint, standing on the
// floor at the footprint's centre. `depth` is the paint order.
export function anchorOf(placement, item, lift = 0) {
  const { w, h } = footprint(item, placement.rotation);
  const cx = (placement.gx + w / 2) * CELL;
  const cy = (placement.gy + h / 2) * CELL;
  return { ...toStage(cx, cy, lift), depth: Math.round((placement.gx + w + placement.gy + h) * 10) };
}

// The four stage corners of one cell, as a polygon for the edit-mode grid.
export function cellPolygon(gx, gy) {
  return [[gx, gy], [gx + 1, gy], [gx + 1, gy + 1], [gx, gy + 1]]
    .map(([x, y]) => project(x * CELL, y * CELL).map(n => +n.toFixed(1)).join(','))
    .join(' ');
}

// Which cell a point on the stage falls in. Inverting the projection is exact:
// screen x gives x - y and screen y gives x + y, so the pair solves directly.
export function cellAt(stageX, stageY, size) {
  const sx = stageX / 100 * SCENE.w - ORIGIN.x;
  const sy = stageY / 100 * SCENE.h - ORIGIN.y;
  const sum = sy / TILT, diff = sx;
  const gx = Math.floor(((sum + diff) / 2) / CELL);
  const gy = Math.floor(((sum - diff) / 2) / CELL);
  return gx >= 0 && gy >= 0 && gx < size && gy < size ? { gx, gy } : null;
}

// Wall objects hang in a band along one of the two walls, indexed left to right.
// They never collide with floor objects, only with each other.
export const WALL_SLOTS = 4;
export const wallAnchor = (wall, index, size) => {
  const along = (index + .5) / WALL_SLOTS * size * CELL;
  const height = CELL * 2.6;
  return wall === 'left'
    ? { ...toStage(0, along, height), depth: 0, surface: 'left' }
    : { ...toStage(along, 0, height), depth: 0, surface: 'right' };
};

/**
 * Can `item` go at `placement`, given everything already in the room?
 * Returns null when it fits, or a short reason why it does not — the edit UI
 * shows the reason, so it is phrased for a person rather than a log.
 */
export function placementError(placement, item, room, catalog, ignoreId = null) {
  const cells = room.cells;
  const placed = Object.entries(room.placed).filter(([id]) => id !== ignoreId);
  if (item.placement === 'wall') {
    if (placement.wall !== 'left' && placement.wall !== 'right') return 'Esa pared no existe.';
    if (!Number.isInteger(placement.index) || placement.index < 0 || placement.index >= WALL_SLOTS) return 'Ahí no cabe.';
    const taken = placed.some(([, p]) => p.wall === placement.wall && p.index === placement.index);
    return taken ? 'Ya hay algo colgado ahí.' : null;
  }
  if (!inBounds(placement, item, cells)) return 'No cabe dentro de la habitación.';
  const wanted = new Set(cellsOf(placement, item));

  if (item.placement === 'surface') {
    const bound = bindSurface(placement, room.placed, catalog);
    const host = room.placed[bound.parentSurfaceId];
    if (!host || !catalog[host.item]?.surface || !Number.isInteger(bound.surfaceSlot)
      || !surfacePosition(host, catalog[host.item], bound.surfaceSlot)) return 'Esto necesita apoyarse en un mueble.';
    const occupied = placed.some(([, p]) => p.on && (() => {
      const other = bindSurface(p, room.placed, catalog);
      return other.parentSurfaceId === bound.parentSurfaceId && other.surfaceSlot === bound.surfaceSlot;
    })());
    return occupied ? 'Ese punto del mueble ya tiene algo encima.' : null;
  }

  // Floor objects: a rug lies flat, so things may stand on it; everything else
  // needs its cells to itself.
  const map = occupancy(room.placed, catalog, ignoreId);
  for (const cell of wanted) {
    if (map.get(cell)?.some(other => Boolean(other.flat) === Boolean(item.flat)))
      return item.flat ? 'Ya hay una alfombra ahí.' : 'Ese espacio ya está ocupado.';
  }
  return null;
}

/** Every placed object, sorted so nearer things paint over farther ones. */
export function paintOrder(room, catalog) {
  const entries = Object.entries(room.placed)
    .map(([key, p]) => ({ key, placement: p, item: catalog[p.item] }))
    .filter(entry => entry.item);

  // Depth of each floor object, so anything standing on one can be slotted in
  // just above its host rather than sorted by its own footprint — otherwise a
  // lamp on the back half of a desk disappears behind it.
  const floors = entries.filter(e => e.item.placement === 'floor' && !e.item.flat);
  const hostOf = placement => floors.find(f => {
    const { w, h } = footprint(f.item, f.placement.rotation);
    return placement.gx >= f.placement.gx && placement.gx < f.placement.gx + w
      && placement.gy >= f.placement.gy && placement.gy < f.placement.gy + h;
  });

  return entries
    .map(entry => {
      const host = entry.placement.on ? (floors.find(f => f.key === entry.placement.parentSurfaceId) || hostOf(entry.placement)) : null;
      const local = host && surfacePosition(host.placement, host.item, entry.placement.surfaceSlot);
      const spot = entry.item.placement === 'wall'
        ? wallAnchor(entry.placement.wall, entry.placement.index, room.cells)
        // Something resting on a desk is lifted to the desk's top face, not left
        // standing on the floor the desk happens to occupy.
        : local ? { ...toStage(local.x * CELL, local.y * CELL, local.z), depth: anchorOf(host.placement, host.item).depth }
        : anchorOf(entry.placement, entry.item, host ? host.item.top : 0);
      // Wall art hangs behind everything, rugs lie flat under the furniture, and
      // objects on a surface ride one step in front of whatever holds them up.
      const layer = entry.item.placement === 'wall' ? -200
        : entry.item.flat ? -100
        : entry.placement.on ? (host ? anchorOf(host.placement, host.item).depth : spot.depth) + 1
        : spot.depth;
      return { ...entry, spot, layer };
    })
    .sort((a, b) => a.layer - b.layer);
}

/**
 * The room's outline on the stage, as a CSS polygon. The lighting passes are
 * clipped to this so they darken the room and nothing else; without it the area
 * outside the clip stays unshaded and reads as a bright halo around the walls.
 */
export function silhouette(cells) {
  const F = cells * CELL, H = wallHeight(cells);
  const corners = [[0, F, 0], [0, F, H], [0, 0, H], [F, 0, H], [F, 0, 0], [F, F, 0]].map(([x, y, z]) => toStage(x, y, z));
  const mid = corners.reduce((a, c) => ({ x: a.x + c.x / corners.length, y: a.y + c.y / corners.length }), { x: 0, y: 0 });
  // Pushed out a little so the clip never bites into the crown or the plinth.
  return corners
    .map((c, i) => {
      // Generous on purpose: the clip must sit outside the crown and the plinth,
      // or the outer edge of the room escapes the shading and reads as a halo.
      const grow = i === 5 ? 1.3 : 1.2;
      return `${(mid.x + (c.x - mid.x) * grow).toFixed(2)}% ${(mid.y + (c.y - mid.y) * grow).toFixed(2)}%`;
    })
    .join(', ');
}

/** Taller rooms feel taller; mirrors tools/draw-room.mjs. */
export const wallHeight = cells => Math.round(300 + cells * CELL * .15);
