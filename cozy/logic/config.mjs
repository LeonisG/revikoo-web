export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === 'true';
export const GAME_CONFIG = Object.freeze({
  version: 1, initialCoins: 20,
  rewards: { tasks: { small: 2, medium: 5, big: 10 }, focus: { 25: 5, 45: 10, 60: 15, 90: 25 }, book: 25 },
  focusDurations: [25, 45, 60, 90],
  animationDurations: { camera: 1000, reward: 3000 },
  featureFlags: { music: false, cat: true },
  storageKey: DEBUG ? 'cozy-room:debug:v1' : 'cozy-room:v1',
});
// Slots are the handful of places an object may stand. They are written in the
// diorama's own world coordinates — x and y run along the floor, z is height —
// and projected into stage percentages here, exactly as tools/draw-diorama.mjs
// projects the illustration. Keep the two in step: if the room's geometry moves,
// this is the single place the slots follow it.
const at = (x, y, z = 0) => ({ x: +((700 + x - y) / 14).toFixed(2), y: +((480 + (x + y) * .36 - z) / 9).toFixed(2) });
// `plane` tells the room which surface an object lies in: upright on a floor or
// a shelf, or flat against one of the two walls, which recede opposite ways.
const slot = (name, where, size, plane = 'floor') => ({ name, ...where, size, plane });
export const SLOTS = {
  'desk-left': slot('Escritorio · izquierda', at(168, 212, 156), 6),
  'desk-right': slot('Escritorio · derecha', at(352, 96, 156), 6),
  'shelf-top': slot('Estante superior', at(45, 190, 315), 6),
  'shelf-middle': slot('Estante central', at(50, 400, 172), 5.5),
  'floor-left': slot('Suelo · izquierda', at(70, 455), 11),
  'floor-right': slot('Suelo · derecha', at(468, 232), 11),
  'floor-center': slot('Centro de la habitación', at(295, 337), 46),
  'wall-left': slot('Pared · izquierda', at(0, 230, 315), 5, 'wall-left'),
  'wall-center': slot('Pared · centro', at(60, 0, 250), 8, 'wall-right'),
  'wall-right': slot('Pared · derecha', at(430, 0, 300), 8, 'wall-right'),
};
const item = (id, name, category, price, compatibleSlots, asset = id) => ({ id, name, category, price, asset, compatibleSlots, repeatable: false });
export const CATALOG = [
  item('monstera', 'Monstera pequeña', 'Plantas', 15, ['floor-left', 'floor-right']),
  item('fern', 'Helecho de bosque', 'Plantas', 20, ['floor-left', 'floor-right', 'shelf-top']),
  item('pothos', 'Poto colgante', 'Plantas', 25, ['shelf-top', 'shelf-middle']),
  item('mushroom', 'Lámpara seta', 'Lámparas', 30, ['desk-left', 'desk-right']),
  item('vintage', 'Lámpara de lectura', 'Lámparas', 40, ['desk-left', 'desk-right']),
  item('lantern', 'Farol de papel', 'Lámparas', 55, ['shelf-top', 'desk-right']),
  item('rug-cream', 'Alfombra de avena', 'Alfombras', 45, ['floor-center']),
  item('rug-moss', 'Alfombra de musgo', 'Alfombras', 45, ['floor-center']),
  item('rug-clay', 'Alfombra de arcilla', 'Alfombras', 60, ['floor-center']),
  item('candle', 'Vela de ámbar', 'Objetos', 12, ['desk-left', 'desk-right', 'shelf-middle']),
  item('vase', 'Jarrón de cerámica', 'Objetos', 18, ['desk-left', 'desk-right', 'shelf-top']),
  item('book-stack', 'Libros de segunda mano', 'Objetos', 20, ['desk-left', 'shelf-middle']),
  item('teapot', 'Tetera de domingo', 'Objetos', 28, ['desk-right', 'shelf-top']),
  item('print-botanical', 'Herbario enmarcado', 'Pared', 25, ['wall-left', 'wall-center', 'wall-right']),
  item('print-sunset', 'Un atardecer lento', 'Pared', 35, ['wall-left', 'wall-center', 'wall-right']),
  item('print-moon', 'Las fases de la calma', 'Pared', 80, ['wall-left', 'wall-center', 'wall-right']),
];
