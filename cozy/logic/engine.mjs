import { GAME_CONFIG, ROOM_SIZES, QUESTS, SETS, setProgress, ACHIEVEMENTS } from './config.mjs';
import { CATALOG, STARTER_ITEMS, itemStatus } from './catalog.mjs';
import { initialState } from './storage.mjs';
import { createEvents } from './events.mjs';
import { placementError, inBounds, bindSurface, surfacePosition } from './grid.mjs';

/** The grid works in cell counts, so hand it the room with its size resolved. */
const gridRoom = s => ({ placed: s.room.placed, cells: ROOM_SIZES[s.room.size].cells });

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);
const positiveInt = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

const held = (s, id) => s.inventory[id] || 0;
const give = (s, id, n = 1) => { s.inventory[id] = held(s, id) + n; };
const take = (s, id, n = 1) => {
  if (held(s, id) < n) throw new Error('No tienes ese objeto guardado.');
  s.inventory[id] -= n;
  if (s.inventory[id] === 0) delete s.inventory[id];
};
/** Every item the player owns, whether it is standing in the room or put away. */
export const ownedIds = s => [...new Set([...Object.keys(s.inventory), ...Object.values(s.room.placed).map(p => p.item)])];

export function createEngine(storage, { debug = false, now = () => Date.now() } = {}) {
  const upgrade = s => {
    for (const [key, p] of Object.entries(s.room.placed)) {
      if (CATALOG[p.item]?.placement !== 'surface') continue;
      const bound = bindSurface(p, s.room.placed, CATALOG);
      if (bound.parentSurfaceId) s.room.placed[key] = bound;
      else { delete s.room.placed[key]; give(s, p.item); }
    }
    return s;
  };
  let state = upgrade(storage.load());
  const events = createEvents();

  function transact(event, mutate) {
    const next = structuredClone(state);
    const payload = mutate(next) || {};
    settle(next, payload);
    next.revision = state.revision + 1;
    try { storage.save(next, state.revision); }
    catch (error) { state = upgrade(storage.load()); events.emit('STATE_SYNCED', {}); throw error; }
    state = next;
    events.emit(event, payload);
    return payload;
  }

  function award(s, reason, amount) {
    if (s.ledger.includes(reason)) return 0;
    s.ledger.push(reason); s.coins += amount; return amount;
  }

  // Run after every change: unlocks are a consequence of play, never something
  // the player has to go and collect.
  function settle(s, payload) {
    const placed = Object.values(s.room.placed);
    const owned = ownedIds(s);
    const unlock = id => { if (!s.achievements.includes(id)) { s.achievements.push(id); (payload.unlocked ??= []).push(id); } };
    if (placed.some(p => ['candle', 'mushroom', 'vintage-lamp', 'lantern', 'floor-lamp'].includes(p.item))) unlock('first-light');
    if (placed.some(p => ['bookshelf', 'shelf-small'].includes(p.item))) unlock('first-shelf');
    if (s.tasks.filter(t => t.completed).length >= 10) unlock('quiet-progress');
    if (s.focusHistory.length >= 5) unlock('deep-focus');
    if (s.books.filter(b => b.completed).length >= 3) unlock('book-nook');
    if (placed.some(p => CATALOG[p.item]?.companion)) unlock('companion');
    if (placed.length >= 15) unlock('architect');
    // Completing a collection hands over its small gift, exactly once.
    for (const [id, set] of Object.entries(SETS)) {
      const progress = setProgress(id, owned);
      if (!progress.total || progress.have < progress.total) continue;
      unlock('collector');
      if (s.ledger.includes(`set:${id}`)) continue;
      s.ledger.push(`set:${id}`);
      if (CATALOG[set.reward]) give(s, set.reward);
      (payload.sets ??= []).push(id);
    }
  }

  const api = {
    get state() { return structuredClone(state); },
    subscribe: events.subscribe,
    /** Reconcile obsolete views without losing owned items or productivity data. */
    reconcileOrientations(views) {
      const unsupported = Object.entries(state.room.placed).filter(([, p]) =>
        views[p.item] && !views[p.item].includes(p.rotation ?? 0));
      if (!unsupported.length) return { adapted: 0, stored: 0 };
      return transact('ART_VIEWS_UPDATED', s => {
        let adapted = 0, stored = 0;
        for (const [key] of unsupported) {
          const p = s.room.placed[key]; if (!p) continue;
          const item = CATALOG[p.item], spot = { ...p, rotation: views[p.item][0] };
          if (!placementError(spot, item, gridRoom(s), CATALOG, key)) {
            s.room.placed[key] = spot; adapted++;
            for (const child of Object.values(s.room.placed).filter(c => c.parentSurfaceId === key)) {
              const pos = surfacePosition(spot, item, child.surfaceSlot);
              child.gx = Math.floor(pos.x); child.gy = Math.floor(pos.y);
            }
          } else {
            for (const [childKey, child] of Object.entries(s.room.placed).filter(([,c]) => c.parentSurfaceId === key)) {
              give(s, child.item); delete s.room.placed[childKey]; stored++;
            }
            give(s, p.item); delete s.room.placed[key]; stored++;
          }
        }
        return { adapted, stored };
      });
    },
    sync() { const next = upgrade(storage.load()); if (JSON.stringify(next) !== JSON.stringify(state)) { state = next; events.emit('STATE_SYNCED', {}); } },

    // ── Building the first room ───────────────────────────────────────────────
    startSetup() {
      return transact('SETUP_STARTED', s => {
        if (s.profile.setupCompleted || s.ledger.includes('starter-budget')) throw new Error('Tu habitación ya está empezada.');
        s.ledger.push('starter-budget');
        s.coins += GAME_CONFIG.starterBudget;
        for (const id of STARTER_ITEMS) give(s, id);
        return { budget: GAME_CONFIG.starterBudget };
      });
    },
    /**
     * Pick the room's size. During setup the previous choice is refunded so the
     * decision stays reversible; afterwards it is an expansion and costs in full.
     * Shrinking puts anything that no longer fits back in the inventory.
     */
    chooseSize(sizeId) {
      return transact('ROOM_RESIZED', s => {
        const size = ROOM_SIZES[sizeId];
        if (!size) throw new Error('Ese tamaño no existe.');
        if (size.id === s.room.size) return { size: sizeId, cost: 0 };
        const refund = s.profile.setupCompleted ? 0 : ROOM_SIZES[s.room.size].price;
        const cost = size.price - refund;
        if (cost > s.coins) throw new Error('Todavía no te llega para esta habitación.');
        // During setup `cost` can be negative: downgrading hands the difference
        // back, so the size choice stays genuinely reversible.
        s.coins -= cost;
        if (cost > 0) s.stats.spent += cost;
        s.room.size = size.id;
        let displaced = 0;
        for (const [key, placement] of Object.entries(s.room.placed)) {
          const item = CATALOG[placement.item];
          if (!item || item.placement === 'wall') continue;
          if (inBounds(placement, item, size.cells)) continue;
          delete s.room.placed[key]; give(s, placement.item); displaced++;
        }
        for (const [key, p] of Object.entries(s.room.placed)) {
          if (p.parentSurfaceId && !s.room.placed[p.parentSurfaceId]) { delete s.room.placed[key]; give(s, p.item); displaced++; }
        }
        return { size: sizeId, cost, displaced };
      });
    },
    completeSetup() {
      return transact('SETUP_COMPLETED', s => { s.profile.setupCompleted = true; s.profile.onboardingCompleted = true; });
    },

    // ── Economy ───────────────────────────────────────────────────────────────
    buyItem(id) {
      return transact('ITEM_PURCHASED', s => {
        const item = CATALOG[id];
        if (!item) throw new Error('No se encuentra este objeto.');
        if (item.starter) throw new Error('Esto ya viene con tu habitación.');
        if (itemStatus(s, id).access === 'LOCKED') throw new Error('Este objeto aún no está disponible.');
        if (s.coins < item.price) throw new Error('Aún te faltan algunas monedas. Tu habitación puede esperar.');
        s.coins -= item.price; s.stats.spent += item.price; give(s, id);
        return { item: id };
      });
    },
    /** Sell a spare unit from the inventory. Placed objects must be put away first. */
    sellItem(id) {
      return transact('ITEM_SOLD', s => {
        const item = CATALOG[id];
        if (!item) throw new Error('No se encuentra este objeto.');
        if (item.starter) throw new Error('Esto se queda contigo.');
        take(s, id);
        const refund = Math.floor(item.price * GAME_CONFIG.resaleRate);
        s.coins += refund; s.stats.sold += 1;
        return { item: id, refund };
      });
    },

    // ── Placement ─────────────────────────────────────────────────────────────
    placeItem(id, placement) {
      return transact('ITEM_PLACED', s => {
        const item = CATALOG[id];
        if (!item) throw new Error('No se encuentra este objeto.');
        const spot = normalise(item, placement, s.room.placed);
        const problem = placementError(spot, item, gridRoom(s), CATALOG);
        if (problem) throw new Error(problem);
        take(s, id);
        const key = uid();
        s.room.placed[key] = { item: id, ...spot };
        return { item: id, key };
      });
    },
    moveItem(key, placement) {
      return transact('ITEM_MOVED', s => {
        const current = s.room.placed[key];
        if (!current) throw new Error('Ese objeto ya no está en la habitación.');
        const item = CATALOG[current.item];
        const spot = normalise(item, placement, s.room.placed);
        const problem = placementError(spot, item, gridRoom(s), CATALOG, key);
        if (problem) throw new Error(problem);
        s.room.placed[key] = { item: current.item, ...(current.pose ? { pose: current.pose } : {}), ...spot };
        for (const p of Object.values(s.room.placed)) {
          if (p.parentSurfaceId !== key) continue;
          const local = surfacePosition(spot, item, p.surfaceSlot);
          p.gx = Math.floor(local.x); p.gy = Math.floor(local.y);
        }
        s.stats.moves += 1;
        return { item: current.item, key };
      });
    },
    setCompanionPose(key, pose) {
      return transact('COMPANION_POSE_CHANGED', s => {
        const p = s.room.placed[key];
        if (!CATALOG[p?.item]?.companion || !['idle', 'sleep', 'sit'].includes(pose)) throw new Error('Postura no válida.');
        p.pose = pose;
      });
    },
    storeItem(key) {
      return transact('ITEM_STORED', s => {
        const current = s.room.placed[key];
        if (!current) throw new Error('Ese objeto ya no está en la habitación.');
        // Anything resting on this one comes down with it.
        storeChildren(s, key);
        delete s.room.placed[key]; give(s, current.item);
        return { item: current.item };
      });
    },
    sellPlaced(key) {
      return transact('ITEM_SOLD', s => {
        const current = s.room.placed[key], item = CATALOG[current?.item];
        if (!item || item.starter) throw new Error('Este objeto no se puede vender.');
        storeChildren(s, key);
        delete s.room.placed[key];
        const refund = Math.floor(item.price * GAME_CONFIG.resaleRate);
        s.coins += refund; s.stats.sold++;
        return { item: item.id, refund };
      });
    },

    // ── Quests ────────────────────────────────────────────────────────────────
    claimQuest(id) {
      return transact('QUEST_CLAIMED', s => {
        const quest = QUESTS.find(q => q.id === id);
        if (!quest) throw new Error('Esa propuesta no existe.');
        if (s.quests.includes(id)) throw new Error('Ya la has recogido.');
        if (!quest.check(s)) throw new Error('Todavía no, pero no hay prisa.');
        s.quests.push(id);
        return { reward: award(s, `quest:${id}`, quest.reward), quest: id };
      });
    },

    // ── Productivity ──────────────────────────────────────────────────────────
    addTask(title, difficulty) {
      if (!clean(title)) throw new Error('Escribe algo que quieras hacer.');
      if (!Object.hasOwn(GAME_CONFIG.rewards.tasks, difficulty)) throw new Error('Elige un tamaño de tarea.');
      return transact('TASK_ADDED', s => { s.tasks.push({ id: uid(), title: clean(title), difficulty, completed: false, rewardClaimed: false }); });
    },
    editTask(id, title, difficulty) {
      if (!clean(title) || !Object.hasOwn(GAME_CONFIG.rewards.tasks, difficulty)) throw new Error('Revisa el título y el tamaño de la tarea.');
      return transact('TASK_EDITED', s => { const t = s.tasks.find(t => t.id === id); if (!t || t.completed) throw new Error('Esta tarea ya está cerrada.'); Object.assign(t, { title: clean(title), difficulty }); });
    },
    completeTask(id) {
      return transact('TASK_COMPLETED', s => {
        const t = s.tasks.find(t => t.id === id); if (!t || t.rewardClaimed) return { reward: 0 };
        t.completed = true; t.rewardClaimed = true;
        return { reward: award(s, `task:${id}`, GAME_CONFIG.rewards.tasks[t.difficulty]) };
      });
    },
    deleteTask(id) { return transact('TASK_DELETED', s => { s.tasks = s.tasks.filter(t => t.id !== id); }); },
    addBook(title, author, totalPages, currentPage = 0) {
      if (!clean(title) || !positiveInt(totalPages) || Number(totalPages) > 100000 || !Number.isSafeInteger(Number(currentPage)) || Number(currentPage) < 0 || Number(currentPage) > Number(totalPages)) throw new Error('Revisa el título y las páginas del libro.');
      return transact('BOOK_ADDED', s => {
        const b = { id: uid(), title: clean(title), author: clean(author, 100), totalPages: Number(totalPages), currentPage: Number(currentPage), rewardClaimed: false, completed: false };
        s.books.push(b); return { reward: finishBook(s, b), id: b.id };
      });
    },
    updateBook(id, page) {
      return transact('BOOK_UPDATED', s => {
        const b = s.books.find(b => b.id === id);
        if (!b || !Number.isSafeInteger(Number(page)) || Number(page) < 0 || Number(page) > b.totalPages) throw new Error('La página debe estar entre 0 y el total del libro.');
        b.currentPage = Number(page); return { reward: finishBook(s, b) };
      });
    },
    deleteBook(id) { return transact('BOOK_DELETED', s => { s.books = s.books.filter(b => b.id !== id); }); },
    startFocus(duration) {
      if (!GAME_CONFIG.focusDurations.includes(duration)) throw new Error('Elige una duración válida.');
      return transact('FOCUS_STARTED', s => {
        if (s.activeFocus) throw new Error('Ya hay una sesión en marcha.');
        s.activeFocus = { id: uid(), duration, startedAt: now(), endsAt: now() + duration * (debug ? 1000 : 60000), debug };
      });
    },
    cancelFocus() { return transact('FOCUS_CANCELLED', s => { s.activeFocus = null; }); },
    completeFocus() {
      if (!state.activeFocus || now() < state.activeFocus.endsAt) return false;
      return transact('FOCUS_COMPLETED', s => {
        const f = s.activeFocus; s.activeFocus = null;
        s.focusHistory.push({ ...f, completedAt: now() });
        return { reward: award(s, `focus:${f.id}`, GAME_CONFIG.rewards.focus[f.duration]), duration: f.duration };
      });
    },
    preference(key, value) {
      const valid = { sound: v => typeof v === 'boolean', ambient: v => Number.isFinite(v) && v >= 0 && v <= 100, reduceMotion: v => typeof v === 'boolean', lamp: v => typeof v === 'boolean', lighting: v => ['auto', 'morning', 'day', 'sunset', 'night'].includes(v), weather: v => ['clear', 'rain'].includes(v) };
      if (!valid[key]?.(value)) throw new Error('Preferencia no válida.');
      return transact('PREFERENCE_CHANGED', s => { s.preferences[key] = value; });
    },
    onboard() { return transact('ONBOARDED', s => { s.profile.onboardingCompleted = true; }); },
    reset() { return transact('RESET', s => { Object.assign(s, initialState()); }); },
    debug(action, value) {
      if (!debug) throw new Error('Solo disponible en el espacio de pruebas.');
      return transact('DEBUG_CHANGED', s => {
        if (action === 'coins') s.coins += 250;
        if (action === 'rich') s.coins += 2000;
        if (action === 'zero') s.coins = 0;
        if (action === 'unlock') { for (const id of Object.keys(CATALOG)) give(s, id); s.achievements = [...new Set([...s.achievements,...ACHIEVEMENTS.map(a=>a.id)])]; }
        if (action === 'add' && CATALOG[value]) give(s, value);
        if (action === 'pets') for (const id of ['cat','dog','rabbit']) give(s,id);
        if (action === 'clear') { for (const [key, p] of Object.entries(s.room.placed)) { give(s, p.item); delete s.room.placed[key]; } }
        if (action === 'resetSetup') { s.profile.setupCompleted = false; s.ledger = s.ledger.filter(e => e !== 'starter-budget'); }
        if (action === 'size' && ROOM_SIZES[value]) s.room.size = value;
        if (action === 'finish' && s.activeFocus) s.activeFocus.endsAt = now();
      });
    },
  };

  function finishBook(s, b) {
    b.completed = b.currentPage === b.totalPages;
    if (!b.completed || b.rewardClaimed) return 0;
    b.rewardClaimed = true;
    return award(s, `book:${b.id}`, GAME_CONFIG.rewards.book);
  }

  return api;
}

/** Keep only the fields that belong to this kind of placement, and sane values. */
function normalise(item, placement = {}, placed = {}) {
  if (item.placement === 'wall') return { wall: placement.wall, index: Number(placement.index) };
  const spot = {
    gx: Number(placement.gx), gy: Number(placement.gy),
    rotation: item.rotatable ? Number(placement.rotation ?? 0) : 0,
  };
  if (item.placement === 'surface') {
    const bound = bindSurface({ ...spot, parentSurfaceId: placement.parentSurfaceId, surfaceSlot: placement.surfaceSlot }, placed, CATALOG);
    const host = placed[bound.parentSurfaceId];
    const local = host && surfacePosition(host, CATALOG[host.item], bound.surfaceSlot);
    if (local) { bound.gx = Math.floor(local.x); bound.gy = Math.floor(local.y); }
    return bound;
  }
  return spot;
}

function storeChildren(s, key) {
  for (const [id, p] of Object.entries(s.room.placed)) {
    if (p.parentSurfaceId === key) { delete s.room.placed[id]; give(s, p.item); }
  }
}
