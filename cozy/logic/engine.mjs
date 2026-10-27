import { GAME_CONFIG, CATALOG, SLOTS } from './config.mjs';
import { initialState } from './storage.mjs';
import { createEvents } from './events.mjs';

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clean = (value, max = 180) => String(value ?? '').trim().slice(0, max);
const positiveInt = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export function createEngine(storage, { debug = false, now = () => Date.now() } = {}) {
  let state = storage.load();
  const events = createEvents();
  function transact(event, mutate) {
    const next = structuredClone(state);
    const payload = mutate(next) || {};
    next.revision = state.revision + 1;
    try { storage.save(next, state.revision); }
    catch (error) { state = storage.load(); events.emit('STATE_SYNCED', {}); throw error; }
    state = next;
    events.emit(event, payload);
    return payload;
  }
  function award(s, reason, amount) {
    if (s.ledger.includes(reason)) return 0;
    s.ledger.push(reason); s.coins += amount; return amount;
  }
  function finishBook(s, b) {
    b.completed = b.currentPage === b.totalPages;
    if (!b.completed || b.rewardClaimed) return 0;
    b.rewardClaimed = true;
    return award(s, `book:${b.id}`, GAME_CONFIG.rewards.book);
  }
  const api = {
    get state() { return structuredClone(state); }, subscribe: events.subscribe,
    sync() { const next = storage.load(); if (JSON.stringify(next) !== JSON.stringify(state)) { state = next; events.emit('STATE_SYNCED', {}); } },
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
    buyItem(id) {
      return transact('ITEM_PURCHASED', s => {
        const item = CATALOG.find(i => i.id === id);
        if (!item) throw new Error('No se encuentra este objeto.');
        if (s.inventory.includes(id)) throw new Error('Ya forma parte de tu colección.');
        if (s.coins < item.price) throw new Error('Aún te faltan algunas ✦. Tu habitación puede esperar.');
        s.coins -= item.price; s.inventory.push(id); return { item: id };
      });
    },
    equipItem(id, slot) {
      return transact('ITEM_EQUIPPED', s => {
        const item = CATALOG.find(i => i.id === id);
        if (!s.inventory.includes(id) || !SLOTS[slot] || !item?.compatibleSlots.includes(slot)) throw new Error('Este objeto no encaja en ese rincón.');
        for (const [key, value] of Object.entries(s.room.slots)) if (value === id) delete s.room.slots[key];
        s.room.slots[slot] = id;
        return { item: id, slot };
      });
    },
    unequipItem(id) { return transact('ITEM_UNEQUIPPED', s => { for (const [slot, value] of Object.entries(s.room.slots)) if (value === id) delete s.room.slots[slot]; }); },
    preference(key, value) {
      const valid = { sound: v => typeof v === 'boolean', ambient: v => Number.isFinite(v) && v >= 0 && v <= 100, reduceMotion: v => typeof v === 'boolean', lamp: v => typeof v === 'boolean', lighting: v => ['auto', 'morning', 'day', 'sunset', 'night'].includes(v), weather: v => ['clear', 'rain'].includes(v) };
      if (!valid[key]?.(value)) throw new Error('Preferencia no válida.');
      return transact('PREFERENCE_CHANGED', s => { s.preferences[key] = value; });
    },
    onboard() { return transact('ONBOARDED', s => { s.profile.onboardingCompleted = true; }); },
    reset() { return transact('RESET', s => { Object.assign(s, initialState()); }); },
    debug(action) {
      if (!debug) throw new Error('Solo disponible en el espacio de pruebas.');
      return transact('DEBUG_CHANGED', s => {
        if (action === 'coins') s.coins += 100;
        if (action === 'zero') s.coins = 0;
        if (action === 'unlock') s.inventory = CATALOG.map(i => i.id);
        if (action === 'finish' && s.activeFocus) s.activeFocus.endsAt = now();
      });
    },
  };
  return api;
}
