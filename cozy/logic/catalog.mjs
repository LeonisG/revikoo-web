// Everything that can be owned and put in the room. One definition per object,
// in one place, so adding furniture never means touching placement, rendering,
// shop or economy code.
//
//   w, h        footprint in grid cells (before rotation)
//   placement   'floor'   stands on the grid
//               'surface' small enough to sit on a desk or a shelf
//               'wall'    hangs in the band along one of the two walls
//   surface     true when other objects may stand on top of this one
//   flat        true for rugs: they lie under everything and share their cells
//   rotatable   whether a quarter turn is offered in edit mode
//   starter     given with the room, not bought — the tools the loop needs
//   set         collection it belongs to, for the completion bonuses
//   comfort/focus  the two soft room values; no RPG, just a reason to choose

const item = (id, name, category, price, extra = {}) => ({
  id, name, category, price, asset: id,
  w: 1, h: 1, placement: 'floor', rotatable: false,
  surface: false, top: 0, flat: false, starter: false, set: null,
  comfort: 0, focus: 0, glow: 0, ...extra,
});

export const CATEGORIES = ['Muebles', 'Decoración', 'Plantas', 'Luz', 'Herramientas', 'Compañía'];

export const SETS = {
  woodland: { name: 'Bosque', bonus: 'Un helecho de regalo', reward: 'fern' },
  scholar: { name: 'Estudio', bonus: 'Un atardecer para la pared', reward: 'print-sunset' },
  vintage: { name: 'De segunda mano', bonus: 'Una radio de regalo', reward: 'radio' },
  plants: { name: 'Jardín de interior', bonus: 'Un poto colgante', reward: 'pothos' },
  amber: { name: 'Luz ámbar', bonus: 'Una vela que no se gasta', reward: 'candle' },
};

export const ITEMS = [
  // ── Muebles ────────────────────────────────────────────────────────────────
  item('desk', 'Escritorio sencillo', 'Muebles', 180, { w: 2, h: 1, surface: true, top: 142, rotatable: true, focus: 2, set: 'scholar' }),
  item('desk-wide', 'Escritorio largo', 'Muebles', 290, { w: 3, h: 1, surface: true, top: 142, rotatable: true, focus: 3, set: 'scholar' }),
  item('chair', 'Silla tapizada', 'Muebles', 90, { rotatable: true, comfort: 2 }),
  item('bookshelf', 'Biblioteca alta', 'Muebles', 240, { w: 2, h: 1, surface: true, top: 300, rotatable: true, focus: 1, comfort: 1, set: 'scholar' }),
  item('shelf-small', 'Estante bajo', 'Muebles', 120, { surface: true, top: 118, rotatable: true }),
  item('drawers', 'Cajonera', 'Muebles', 150, { surface: true, top: 120, rotatable: true, comfort: 1, set: 'vintage' }),
  item('side-table', 'Mesita auxiliar', 'Muebles', 95, { surface: true, top: 92, comfort: 1, set: 'vintage' }),
  item('wardrobe-oak', 'Armario de roble', 'Muebles', 280, { w: 2, h: 1, rotatable: true, comfort: 2, set: 'woodland' }),
  item('wardrobe-dark', 'Armario de nogal', 'Muebles', 320, { w: 2, h: 1, rotatable: true, comfort: 2 }),
  item('wardrobe-rack', 'Perchero abierto', 'Muebles', 190, { w: 2, h: 1, rotatable: true, set: 'vintage' }),

  // ── Decoración ─────────────────────────────────────────────────────────────
  item('rug-cream', 'Alfombra de avena', 'Decoración', 55, { w: 2, h: 2, flat: true, comfort: 1 }),
  item('rug-moss', 'Alfombra de musgo', 'Decoración', 55, { w: 2, h: 2, flat: true, comfort: 1, set: 'woodland' }),
  item('rug-clay', 'Alfombra de arcilla', 'Decoración', 70, { w: 2, h: 2, flat: true, comfort: 2 }),
  item('vase', 'Jarrón de cerámica', 'Decoración', 24, { placement: 'surface', comfort: 1 }),
  item('book-stack', 'Libros de segunda mano', 'Decoración', 26, { placement: 'surface', focus: 1, set: 'scholar' }),
  item('teapot', 'Tetera de domingo', 'Decoración', 34, { placement: 'surface', comfort: 1, set: 'vintage' }),
  item('radio', 'Radio de madera', 'Decoración', 60, { placement: 'surface', comfort: 2, set: 'vintage' }),
  item('print-botanical', 'Herbario enmarcado', 'Decoración', 30, { placement: 'wall', set: 'plants' }),
  item('print-sunset', 'Un atardecer lento', 'Decoración', 40, { placement: 'wall', comfort: 1 }),
  item('print-moon', 'Las fases de la calma', 'Decoración', 85, { placement: 'wall', comfort: 2 }),
  item('cork-board', 'Tablón de corcho', 'Decoración', 45, { placement: 'wall', focus: 1, set: 'scholar' }),

  // ── Plantas ────────────────────────────────────────────────────────────────
  item('monstera', 'Monstera pequeña', 'Plantas', 20, { comfort: 1, set: 'plants' }),
  item('fern', 'Helecho de bosque', 'Plantas', 26, { comfort: 1, set: 'woodland' }),
  item('ficus', 'Ficus de suelo', 'Plantas', 75, { comfort: 2, set: 'plants' }),
  item('pothos', 'Poto colgante', 'Plantas', 32, { placement: 'surface', comfort: 1, set: 'plants' }),

  // ── Luz ────────────────────────────────────────────────────────────────────
  item('candle', 'Vela de ámbar', 'Luz', 16, { placement: 'surface', glow: 0.45, comfort: 1, set: 'amber' }),
  item('mushroom', 'Lámpara seta', 'Luz', 38, { placement: 'surface', glow: 0.8, comfort: 1, focus: 1, set: 'amber' }),
  item('vintage-lamp', 'Lámpara de lectura', 'Luz', 48, { placement: 'surface', glow: 0.9, focus: 2, set: 'amber' }),
  item('lantern', 'Farol de papel', 'Luz', 62, { placement: 'surface', glow: 1.0, comfort: 2, set: 'amber' }),
  item('floor-lamp', 'Lámpara de pie', 'Luz', 110, { glow: 1.35, comfort: 2, focus: 1, set: 'amber' }),

  // ── Herramientas ───────────────────────────────────────────────────────────
  // The journal and the timer come with the room: the whole loop runs on them,
  // so they must never be something a new room cannot afford.
  item('journal', 'Tu cuaderno', 'Herramientas', 0, { placement: 'surface', starter: true, opens: 'tasks', focus: 1 }),
  item('timer', 'Reloj de concentración', 'Herramientas', 0, { placement: 'surface', starter: true, opens: 'focus', focus: 1 }),
  item('laptop', 'Portátil', 'Herramientas', 130, { placement: 'surface', glow: 0.35, opens: 'stats', focus: 2, set: 'scholar' }),
  item('savings-jar', 'Bote de ahorros', 'Herramientas', 70, { placement: 'surface', opens: 'stats', comfort: 1 }),
  item('goal-board', 'Tablón de objetivos', 'Herramientas', 95, { placement: 'wall', opens: 'quests', focus: 2 }),

  // ── Compañía ───────────────────────────────────────────────────────────────
  // Deliberately out of reach for a long while. A companion should be the thing
  // somebody saves toward for weeks, not another prop in the catalogue.
  item('cat', 'Un gato que duerme', 'Compañía', 420, { comfort: 5, companion: true }),
  item('rabbit', 'Un conejo tranquilo', 'Compañía', 380, { comfort: 4, companion: true }),
  item('dog', 'Un perro soñoliento', 'Compañía', 480, { comfort: 5, companion: true }),
];

export const CATALOG = Object.freeze(Object.fromEntries(ITEMS.map(i => [i.id, Object.freeze(i)])));
export const STARTER_ITEMS = ITEMS.filter(i => i.starter).map(i => i.id);

/** Items in a set, and how many of them the player owns. */
export function setProgress(setId, owned) {
  const members = ITEMS.filter(i => i.set === setId).map(i => i.id);
  return { members, have: members.filter(id => owned.includes(id)).length, total: members.length };
}
