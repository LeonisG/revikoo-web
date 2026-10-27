import { DEBUG } from './config.mjs';
export function createEvents() {
  const listeners = new Set();
  return { subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, emit(name, payload) { for (const fn of listeners) fn(name, payload); trackEvent(name, payload); } };
}
export function trackEvent(name, payload) { if (DEBUG) console.debug('[cozy]', name, payload); }
