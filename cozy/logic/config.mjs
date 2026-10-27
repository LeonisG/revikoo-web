export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === 'true';
export const GAME_CONFIG = Object.freeze({
  version: 1, initialCoins: 20,
  rewards: { tasks: { small: 2, medium: 5, big: 10 }, focus: { 25: 5, 45: 10, 60: 15, 90: 25 }, book: 25 },
  focusDurations: [25, 45, 60, 90],
  animationDurations: { camera: 1000, reward: 3000 },
  featureFlags: { music: false, cat: true },
  storageKey: DEBUG ? 'cozy-room:debug:v1' : 'cozy-room:v1',
});
export const SLOTS = {
  'desk-left': { name: 'Escritorio · izquierda', x: 34, y: 53, size: 6 },
  'desk-right': { name: 'Escritorio · derecha', x: 58.8, y: 53.3, size: 6 },
  'shelf-top': { name: 'Estante superior', x: 75, y: 24, size: 7 },
  'shelf-middle': { name: 'Estante central', x: 78.4, y: 50, size: 6 },
  'floor-left': { name: 'Suelo · izquierda', x: 13.8, y: 79.5, size: 11 },
  'floor-right': { name: 'Suelo · derecha', x: 70.8, y: 87, size: 13 },
  'floor-center': { name: 'Centro de la habitación', x: 47.5, y: 89, size: 46 },
  'wall-left': { name: 'Pared · izquierda', x: 14.1, y: 38, size: 7 },
  'wall-center': { name: 'Pared · centro', x: 58, y: 33, size: 11 },
  'wall-right': { name: 'Pared · derecha', x: 85.2, y: 35, size: 7 },
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
