import { GAME_CONFIG } from './config.mjs';

export function initialState() {
  return {
    version: GAME_CONFIG.version, revision: 0, profile: { onboardingCompleted: false }, coins: GAME_CONFIG.initialCoins,
    tasks: [], books: [], focusHistory: [], activeFocus: null, inventory: [], room: { slots: {} }, ledger: [],
    preferences: { sound: false, ambient: 35, reduceMotion: false, lighting: 'auto', weather: 'clear', lamp: true },
  };
}

export function validateState(s) {
  if (!s || s.version !== 1 || !Number.isSafeInteger(s.coins) || s.coins < 0 || !Number.isSafeInteger(s.revision)) return false;
  if (!s.profile || !s.preferences || !s.room?.slots || Array.isArray(s.room.slots)) return false;
  if (!['tasks', 'books', 'focusHistory', 'inventory', 'ledger'].every(k => Array.isArray(s[k]))) return false;
  if (!s.tasks.every(t => typeof t.id === 'string' && typeof t.title === 'string' && ['small', 'medium', 'big'].includes(t.difficulty))) return false;
  if (!s.books.every(b => typeof b.id === 'string' && typeof b.title === 'string' && typeof b.author === 'string' && Number.isSafeInteger(b.totalPages) && b.totalPages > 0 && Number.isSafeInteger(b.currentPage) && b.currentPage >= 0 && b.currentPage <= b.totalPages)) return false;
  if (!s.inventory.every(id => typeof id === 'string') || !s.ledger.every(id => typeof id === 'string')) return false;
  if (!s.focusHistory.every(f => typeof f.id === 'string' && GAME_CONFIG.focusDurations.includes(f.duration))) return false;
  if (s.activeFocus && !(typeof s.activeFocus.id === 'string' && GAME_CONFIG.focusDurations.includes(s.activeFocus.duration) && Number.isFinite(s.activeFocus.endsAt) && Number.isFinite(s.activeFocus.startedAt))) return false;
  return ['auto', 'morning', 'day', 'sunset', 'night'].includes(s.preferences.lighting) && ['clear', 'rain'].includes(s.preferences.weather) && Number.isFinite(s.preferences.ambient);
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
    if (!raw) return initialState();
    try {
      const saved = JSON.parse(raw);
      if (saved.version > GAME_CONFIG.version) {
        protectedData = true;
        warn('Estos datos pertenecen a una versión más reciente. Se han protegido; utiliza esa versión para continuar.');
        return initialState();
      }
      if (!validateState(saved)) throw new Error('Invalid state');
      return saved;
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
