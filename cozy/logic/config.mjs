export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === 'true';
// The golden test room: the empty room, the grid, the six reference pieces and
// nothing else. It is how an asset is judged against the floor it has to stand
// on, so it keeps its own save and never disturbs a real room.
export const ASSET_TEST = typeof location !== 'undefined' && new URLSearchParams(location.search).get('asset-test') === 'true';

export const GAME_CONFIG = Object.freeze({
  version: 2,
  // Enough to choose a room and furnish a corner of it, never enough to buy the
  // room you want AND everything in it. The first session should cost a decision.
  starterBudget: 450,
  // Selling back at three quarters keeps experimenting cheap without making
  // money out of nothing.
  resaleRate: .75,
  rewards: { tasks: { small: 2, medium: 5, big: 10 }, focus: { 25: 5, 45: 10, 60: 15, 90: 25 }, book: 25 },
  focusDurations: [25, 45, 60, 90],
  animationDurations: { camera: 1000, reward: 3000 },
  featureFlags: { music: false, companions: true, tokens: false },
  storageKey: ASSET_TEST ? 'cozy-room:assettest:v2' : DEBUG ? 'cozy-room:debug:v2' : 'cozy-room:v2',
});

// Room sizes are the first real decision: a bigger floor costs budget that then
// cannot go into furniture. `cells` is the side of the square grid.
export const ROOM_SIZES = Object.freeze({
  small: { id: 'small', name: 'Pequeña', cells: 4, price: 0, blurb: 'Un rincón. Cabe lo esencial y poco más.' },
  medium: { id: 'medium', name: 'Mediana', cells: 5, price: 120, blurb: 'Sitio para trabajar y para estar.' },
  large: { id: 'large', name: 'Grande', cells: 6, price: 260, blurb: 'Espacio de sobra. Tardarás en llenarla.' },
});
export const DEFAULT_SIZE = 'small';

// The room has levels, not the player. It is the space that grows.
export const ROOM_LEVELS = Object.freeze([
  { at: 0, name: 'Un rincón vacío' },
  { at: 3, name: 'Habitación recién hecha' },
  { at: 7, name: 'Un sitio acogedor' },
  { at: 12, name: 'Taller cálido' },
  { at: 18, name: 'Refugio' },
]);
export const roomLevel = placedCount =>
  ROOM_LEVELS.reduce((best, level) => (placedCount >= level.at ? level : best), ROOM_LEVELS[0]);

// Quests are invitations, never obligations: no timers, no streaks, nothing
// expires, and ignoring one costs nothing.
export const QUESTS = Object.freeze([
  { id: 'first-layout', name: 'Coloca tus tres primeras cosas', reward: 30, check: s => Object.keys(s.room.placed).length >= 3 },
  { id: 'first-task', name: 'Termina una tarea', reward: 15, check: s => s.tasks.some(t => t.completed) },
  { id: 'first-focus', name: 'Haz una sesión de concentración', reward: 25, check: s => s.focusHistory.length >= 1 },
  { id: 'first-shelf', name: 'Pon una estantería', reward: 30, check: s => Object.values(s.room.placed).some(p => p.item === 'bookshelf' || p.item === 'shelf-small') },
  { id: 'first-book', name: 'Añade un libro a tu biblioteca', reward: 20, check: s => s.books.length >= 1 },
  { id: 'first-rearrange', name: 'Cambia algo de sitio', reward: 20, check: s => s.stats.moves >= 1 },
  { id: 'first-plant', name: 'Trae una planta', reward: 25, check: s => Object.values(s.room.placed).some(p => ['monstera', 'fern', 'ficus', 'pothos'].includes(p.item)) },
  { id: 'cosy-room', name: 'Llega a un sitio acogedor', reward: 60, check: s => Object.keys(s.room.placed).length >= 7 },
]);

export const ACHIEVEMENTS = Object.freeze([
  { id: 'first-light', name: 'Primera luz', hint: 'Enciende tu primera lámpara' },
  { id: 'first-shelf', name: 'Primer estante', hint: 'Coloca una estantería' },
  { id: 'quiet-progress', name: 'Avance tranquilo', hint: 'Diez tareas terminadas' },
  { id: 'deep-focus', name: 'Concentración profunda', hint: 'Cinco sesiones de foco' },
  { id: 'book-nook', name: 'Rincón de lectura', hint: 'Termina tres libros' },
  { id: 'companion', name: 'Ya no estás solo', hint: 'Un compañero llega a casa' },
  { id: 'collector', name: 'Coleccionista', hint: 'Completa una colección' },
  { id: 'architect', name: 'Arquitecta de tu espacio', hint: 'Quince objetos colocados' },
]);

export { CATALOG, ITEMS, CATEGORIES, SETS, STARTER_ITEMS, setProgress } from './catalog.mjs';
