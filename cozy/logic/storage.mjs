import { GAME_CONFIG, ROOM_SIZES, DEFAULT_SIZE } from './config.mjs';
import { CATALOG } from './catalog.mjs';

export function initialState() {
  return {
    version: GAME_CONFIG.version, revision: 0,
    // `setupCompleted` gates the build-your-first-room flow; `onboardingCompleted`
    // is the gentler note shown once the room exists.
    profile: { onboardingCompleted: false, setupCompleted: false },
    coins: 0,
    tasks: [], books: [], focusHistory: [], activeFocus: null,
    // Units owned but not standing in the room, as itemId -> count.
    inventory: {},
    // The room itself: a square grid and what is standing on it, keyed by a
    // per-object instance id so the same item can be owned more than once.
    room: { size: DEFAULT_SIZE, placed: {} },
    quests: [], achievements: [], ledger: [],
    stats: { moves: 0, sold: 0, spent: 0 },
    preferences: { sound: false, ambient: 35, reduceMotion: false, lighting: 'auto', weather: 'clear', lamp: true },
  };
}

const isCount = v => Number.isSafeInteger(v) && v >= 0;

function validPlacement(p) {
  if (!p || typeof p.item !== 'string' || !CATALOG[p.item]) return false;
  if (CATALOG[p.item].placement === 'wall')
    return (p.wall === 'left' || p.wall === 'right') && Number.isSafeInteger(p.index) && p.index >= 0;
  return Number.isSafeInteger(p.gx) && Number.isSafeInteger(p.gy) && p.gx >= 0 && p.gy >= 0
    && [0, 90, 180, 270].includes(p.rotation);
}

export function validateState(s) {
  if (!s || s.version !== GAME_CONFIG.version || !Number.isSafeInteger(s.coins) || s.coins < 0 || !Number.isSafeInteger(s.revision)) return false;
  if (!s.profile || !s.preferences || !s.stats) return false;
  if (!s.room || !ROOM_SIZES[s.room.size] || !s.room.placed || typeof s.room.placed !== 'object' || Array.isArray(s.room.placed)) return false;
  if (!s.inventory || typeof s.inventory !== 'object' || Array.isArray(s.inventory)) return false;
  if (!Object.entries(s.inventory).every(([id, n]) => CATALOG[id] && isCount(n))) return false;
  if (!Object.values(s.room.placed).every(validPlacement)) return false;
  if (!['tasks', 'books', 'focusHistory', 'ledger', 'quests', 'achievements'].every(k => Array.isArray(s[k]))) return false;
  if (!s.tasks.every(t => typeof t.id === 'string' && typeof t.title === 'string' && ['small', 'medium', 'big'].includes(t.difficulty))) return false;
  if (!s.books.every(b => typeof b.id === 'string' && typeof b.title === 'string' && typeof b.author === 'string' && Number.isSafeInteger(b.totalPages) && b.totalPages > 0 && Number.isSafeInteger(b.currentPage) && b.currentPage >= 0 && b.currentPage <= b.totalPages)) return false;
  if (!s.focusHistory.every(f => typeof f.id === 'string' && GAME_CONFIG.focusDurations.includes(f.duration))) return false;
  if (s.activeFocus && !(typeof s.activeFocus.id === 'string' && GAME_CONFIG.focusDurations.includes(s.activeFocus.duration) && Number.isFinite(s.activeFocus.endsAt) && Number.isFinite(s.activeFocus.startedAt))) return false;
  if (!['moves', 'sold', 'spent'].every(k => Number.isSafeInteger(s.stats[k]))) return false;
  return ['auto', 'morning', 'day', 'sunset', 'night'].includes(s.preferences.lighting) && ['clear', 'rain'].includes(s.preferences.weather) && Number.isFinite(s.preferences.ambient);
}

// v1 kept the room in ten fixed named slots, which the grid replaces outright.
// Everything the player actually earned — coins, tasks, books, focus history,
// preferences — carries over, and they lay the room out again from scratch.
export function migrate(saved) {
  if (!saved || saved.version !== 1) return null;
  const next = initialState();
  const keep = ['coins', 'tasks', 'books', 'focusHistory', 'activeFocus', 'ledger'];
  for (const key of keep) if (saved[key] !== undefined) next[key] = saved[key];
  if (saved.preferences) Object.assign(next.preferences, saved.preferences);
  if (saved.profile?.onboardingCompleted) next.profile.onboardingCompleted = true;
  // Items they already paid for come back as units waiting in the inventory.
  for (const id of Array.isArray(saved.inventory) ? saved.inventory : []) {
    const mapped = id === 'vintage' ? 'vintage-lamp' : id;
    if (CATALOG[mapped]) next.inventory[mapped] = (next.inventory[mapped] || 0) + 1;
  }
  next.revision = Number.isSafeInteger(saved.revision) ? saved.revision + 1 : 1;
  return validateState(next) ? next : null;
}

// The only module that touches localStorage. Replace this adapter for remote persistence.
export function createStorage({ key = GAME_CONFIG.storageKey, backend, onWarning = () => {} } = {}) {
  let memory = null, unavailable = false, protectedData = false;
  try { backend ??= globalThis.localStorage; if (!backend) unavailable = true; } catch { unavailable = true; }
  const warn = message => onWarning(message);
  function load() {
    if (unavailable) { warn('El guardado no está disponible. Los cambios durarán solo esta visita.'); return memory || initialState(); }
    let raw;
    try { raw = backend.getItem(key); } catch { unavailable = true; return load(); }
    // A v1 room may still be sitting under the old key; bring it across once.
    if (!raw) {
      try {
        const legacy = backend.getItem(key.replace(':v2', ':v1'));
        const moved = legacy && migrate(JSON.parse(legacy));
        if (moved) {
          warn('Tu progreso anterior se ha conservado. La habitación se construye de nuevo desde cero.');
          return moved;
        }
      } catch { /* A legacy save that cannot be read is simply left alone. */ }
      return initialState();
    }
    try {
      const saved = JSON.parse(raw);
      if (saved.version > GAME_CONFIG.version) {
        protectedData = true;
        warn('Estos datos pertenecen a una versión más reciente. Se han protegido; utiliza esa versión para continuar.');
        return initialState();
      }
      const migrated = saved.version < GAME_CONFIG.version ? migrate(saved) : saved;
      if (!migrated || !validateState(migrated)) throw new Error('Invalid state');
      return migrated;
    } catch {
      try { backend.setItem(`${key}:recovery:${Date.now()}`, raw); backend.removeItem(key); }
      catch { protectedData = true; }
      warn('No se pudo leer el progreso anterior. Se ha intentado conservar una copia de recuperación.');
      return initialState();
    }
  }
  function save(state, expectedRevision) {
    if (protectedData) throw new Error('El guardado está protegido para no sobrescribir los datos anteriores.');
    if (unavailable) { memory = structuredClone(state); return; }
    try {
      const raw = backend.getItem(key);
      if (raw && JSON.parse(raw).revision !== expectedRevision) throw new Error('Tu habitación cambió en otra pestaña. Se ha actualizado; vuelve a intentarlo.');
      backend.setItem(key, JSON.stringify(state));
    } catch (error) {
      if (error.message.includes('otra pestaña')) throw error;
      throw new Error('No se ha podido guardar. Puede que el almacenamiento esté lleno o bloqueado. La acción no se ha aplicado.');
    }
  }
  return { key, load, save };
}
