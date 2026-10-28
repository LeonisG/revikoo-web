// Rendering metadata only. No price, ownership, rewards or productivity here.
// A GLB candidate may be recorded separately; it is never an implicit WebP fallback.
import { SPRITES } from './sprites.mjs';
import { RELEASED } from './released.mjs';

export const GOLDEN_IDS = Object.freeze(['desk', 'chair', 'bookshelf', 'wardrobe-oak', 'floor-lamp']);

export const SHADOW_PROFILES = Object.freeze({
  none: { contacts: [] },
  // x/y are fractions of the logical footprint about its centre. Radii are
  // scene units, not the sprite's foliage/bounding-box width. These are draft
  // support patterns, not contacts recovered from geometry or certified art.
  desk: { contacts: [[-.36,-.32,12], [.36,-.32,12], [-.36,.32,12], [.36,.32,16]] },
  chair: { contacts: [[-.3,-.3,8], [.3,-.3,8], [-.3,.3,8], [.3,.3,8]] },
  swivel: { contacts: [[0,-.3,7], [.29,-.09,7], [.18,.25,7], [-.18,.25,7], [-.29,-.09,7]] },
  cabinet: { contacts: [[-.29,0,22], [0,0,25], [.29,0,22]] },
  bed: { contacts: [[-.36,-.34,14], [.36,-.34,14], [-.36,.34,14], [.36,.34,14]] },
  lamp: { contacts: [[0,0,18]] },
  plant: { contacts: [[0,0,14]] },
  companion: { contacts: [[-.15,0,12], [.15,0,12]] },
  book: { contacts: [[-.1,0,11], [.1,0,11]] },
  compact: { contacts: [[0,0,10]] },
});

function profile(id) {
  if (/rug|print|poster|hoodie|hook|board|future-art/.test(id)) return 'none';
  if (/desk/.test(id)) return 'desk';
  if (/chair/.test(id)) return id === 'chair' ? 'chair' : 'swivel';
  if (/bed/.test(id)) return 'bed';
  if (/wardrobe|shelf|drawers|dresser|side-table/.test(id)) return 'cabinet';
  if (/lamp|mushroom|lantern|orb|coat-rack/.test(id)) return 'lamp';
  if (/plant|monstera|fern|ficus|pothos/.test(id)) return 'plant';
  if (/^(cat|dog|rabbit)$/.test(id)) return 'companion';
  if (/book|journal|games/.test(id)) return 'book';
  return 'compact';
}

// Image-relative emitter positions, intentionally separate from ground pivots.
// Draft annotations; final values must come from each approved view/pose.
const emitters = {
  'floor-lamp': [.5,.25], 'gamer-floor-lamp': [.5,.25], 'future-floor-lamp': [.5,.22],
  'industrial-floor-lamp': [.5,.26], 'vintage-lamp': [.52,.3], 'gamer-lamp': [.5,.3],
  'future-lamp': [.5,.3], 'industrial-lamp': [.5,.3], candle: [.5,.33],
  mushroom: [.5,.35], lantern: [.5,.48], 'future-orb': [.5,.4], laptop: [.5,.4],
};

const sources = {...SPRITES, ...Object.fromEntries(Object.entries(RELEASED).filter(([id])=>!SPRITES[id]).map(([id,a])=>[id,a.frames[0]]))};
export const ART_ASSETS = Object.freeze(Object.fromEntries(Object.entries(sources).map(([id, sprite]) => [id, Object.freeze({
  id, representation: 'webp', source: sprite.src, master: sprite.master,
  pivot: sprite.pivot, width: sprite.width, aspect: sprite.aspect,
  orientations: Object.freeze([0, ...Object.keys(sprite.orientations || {}).map(Number)]),
  shadowProfile: profile(id), lightAnchor: emitters[id] || null,
  visualStatus: 'DRAFT', projection: 'legacy-illustrated',
  reviewReason: 'Common camera and physical contacts not yet approved',
})])));

export function artDefinition(id) {
  const entry = ART_ASSETS[id];
  if (!entry) throw new Error(`Missing art definition: ${id}`);
  if (RELEASED[id]) return { ...entry, ...RELEASED[id].frames[0], source: RELEASED[id].frames[0].src,
    orientations: Object.keys(RELEASED[id].frames).map(Number), projection: 'glb-orthographic', visualStatus: 'RELEASED',
    reviewReason: 'Real geometry and four views reviewed; original texture limitations recorded' };
  return entry;
}
