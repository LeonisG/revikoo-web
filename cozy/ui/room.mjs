import { ROOM_ASSETS } from '../assets/manifest.mjs';
import { CATALOG, SLOTS, GAME_CONFIG } from '../logic/config.mjs';
import { art, bookStyle, escapeHTML, icon } from './helpers.mjs';

const MAX_TILT = 1; // degrees, deliberately barely perceptible
// atan(0.36) — the angle the diorama's horizontal surfaces recede at.
const WALL_ANGLE = 19.8;

export function createRoom() {
  const app = document.querySelector('#app'), stage = document.querySelector('#room-stage');
  app.style.setProperty('--camera-duration', `${GAME_CONFIG.animationDurations.camera}ms`);
  let preferences = {}, lastDecor = '', lastBooks = '', lastCoins = null, rewardTimeout, frame = 0;
  // Every illustrated layer is wired here; a missing entry silently empties the room.
  for (const [id, key] of Object.entries({
    'room-background': 'background', 'room-window': 'window', 'window-sunset': 'windowSunset',
    'window-night': 'windowNight', 'window-rain': 'windowRain', 'room-wall-decor': 'wallDecor',
    'room-bookshelf': 'bookshelf', 'room-furniture': 'furniture', 'room-foreground': 'foreground',
    'room-plant': 'plant', 'room-cat': 'cat', 'room-daylight': 'daylight',
  })) document.querySelector(`#${id}`).src = ROOM_ASSETS[key];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function lighting() {
    const now = new Date(), hour = now.getHours();
    const phase = preferences.lighting === 'auto' ? (hour >= 6 && hour < 10 ? 'morning' : hour >= 10 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'sunset' : 'night') : preferences.lighting || 'day';
    app.dataset.light = phase;
    document.querySelector('#day-label').textContent = { morning: 'La mañana se despierta', day: 'Una pausa en el día', sunset: 'La luz de última hora', night: 'El mundo baja el volumen' }[phase];
    document.querySelector('#local-time').textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  function render(state) {
    preferences = state.preferences;
    app.classList.toggle('reduce-motion', preferences.reduceMotion);
    app.dataset.weather = preferences.weather; app.dataset.lamp = preferences.lamp ? 'on' : 'off';
    app.classList.toggle('focusing', !!state.activeFocus);
    document.querySelector('#focus-active').hidden = !state.activeFocus;
    // The only way out of a session: without this the exit stays hidden and a
    // focus that is running cannot be ended.
    document.querySelector('#focus-cancel').hidden = !state.activeFocus;
    document.querySelector('.room-footer').inert = !!state.activeFocus;
    document.querySelector('#room-controls').inert = !!state.activeFocus;
    document.querySelector('#welcome-note').hidden = state.profile.onboardingCompleted || !!state.activeFocus;
    const coins = document.querySelector('#coins');
    coins.textContent = state.coins;
    coins.parentElement.setAttribute('aria-label', `${state.coins} monedas disponibles`);
    if (lastCoins !== null && state.coins !== lastCoins) {
      coins.parentElement.classList.remove('pop');
      requestAnimationFrame(() => coins.parentElement.classList.add('pop'));
    }
    lastCoins = state.coins;
    const sound = document.querySelector('#sound-button');
    sound.setAttribute('aria-label', preferences.sound ? 'Silenciar sonido' : 'Activar sonido');
    sound.setAttribute('aria-pressed', String(preferences.sound));
    sound.title = preferences.sound ? 'Silenciar sonido' : 'Activar sonido';
    sound.innerHTML = icon(preferences.sound ? 'sound-on' : 'sound-off');
    document.querySelector('#lamp-button').setAttribute('aria-label', preferences.lamp ? 'Apagar lámpara' : 'Encender lámpara');
    const decorKey = JSON.stringify(state.room.slots);
    if (decorKey !== lastDecor) {
      const buckets = { wall: [], middle: [], floor: [], rug: [] };
      for (const [slot, id] of Object.entries(state.room.slots)) {
        const item = CATALOG.find(i => i.id === id), position = SLOTS[slot];
        if (!item || !position) continue;
        const group = slot === 'floor-center' ? 'rug' : slot.startsWith('floor') ? 'floor' : slot.startsWith('wall') ? 'wall' : 'middle';
        // A framed piece has to lie in the plane of the wall it hangs on, and the
        // two walls recede in opposite directions, so each gets its own skew.
        const wall = position.plane === 'wall-left' ? ` wall-object" style="--surface-angle:-${WALL_ANGLE}deg;`
          : position.plane === 'wall-right' ? ` wall-object" style="--surface-angle:${WALL_ANGLE}deg;` : '" style="';
        buckets[group].push(`<div class="decoration${wall}left:${position.x}%;top:${position.y}%;width:${position.size}%;aspect-ratio:${group === 'rug' ? '3.6' : '160/180'}" data-item="${id}" data-slot="${slot}" role="img" aria-label="${escapeHTML(item.name)} en ${escapeHTML(position.name)}">${art(item.asset, '', { stretch: group === 'rug' })}</div>`);
      }
      document.querySelector('#wall-decor').innerHTML = buckets.wall.join('');
      document.querySelector('#middle-decor').innerHTML = buckets.middle.join('');
      document.querySelector('#floor-decor').innerHTML = buckets.floor.join('');
      document.querySelector('#floor-rug').innerHTML = buckets.rug.length ? buckets.rug.join('') : `<img src="${ROOM_ASSETS.rug}" alt="" width="1400" height="900">`;
      lastDecor = decorKey;
    }
    const booksKey = JSON.stringify(state.books.map(b => [b.id, b.title]));
    if (booksKey !== lastBooks) {
      document.querySelector('#room-books').innerHTML = state.books.slice(-7).map(b => `<i class="mini-book" style="${bookStyle(b.title)}"></i>`).join('');
      lastBooks = booksKey;
    }
    lighting();
  }
  // ── Placing an object ──────────────────────────────────────────────────────
  // Buying something ends in the room, not in a dropdown. The catalogue closes,
  // the corners the object fits in light up, and it lands where it is put.
  let placing = null;
  const slotTargets = document.querySelector('#slot-targets');
  const placementNote = document.querySelector('#placement-note');
  function place(item, onPick) {
    placing = { item, onPick };
    slotTargets.innerHTML = item.compatibleSlots.map(key => {
      const target = SLOTS[key];
      return `<button class="slot-target" data-slot="${key}" style="left:${target.x}%;top:${target.y}%;width:${Math.max(4.5, target.size * .55)}%" aria-label="Colocar ${escapeHTML(item.name)} en ${escapeHTML(target.name)}"><span>${escapeHTML(target.name)}</span></button>`;
    }).join('');
    app.classList.add('placing');
    document.querySelector('#placement-title').textContent = `¿Dónde va ${item.name}?`;
    placementNote.hidden = false;
    view('room');
    slotTargets.querySelector('.slot-target')?.focus({ preventScroll: true });
  }
  function cancelPlace() {
    if (!placing) return;
    placing = null; slotTargets.innerHTML = '';
    app.classList.remove('placing'); placementNote.hidden = true;
  }
  slotTargets.addEventListener('click', event => {
    const target = event.target.closest('[data-slot]');
    if (!target || !placing) return;
    const { onPick } = placing, slot = target.dataset.slot;
    cancelPlace(); onPick(slot);
  });
  document.querySelector('#placement-cancel').addEventListener('click', cancelPlace);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && placing) { cancelPlace(); document.querySelector('[data-open=shop]')?.focus(); } });

  function view(name) {
    stage.dataset.view = name;
    document.querySelector('#back-room').hidden = name === 'room';
    document.querySelector('#desk-note').hidden = name !== 'desk';
  }
  function reward(text) {
    const el = document.querySelector('#reward'); clearTimeout(rewardTimeout);
    el.innerHTML = text; el.classList.add('show');
    rewardTimeout = setTimeout(() => el.classList.remove('show'), GAME_CONFIG.animationDurations.reward);
  }
  // Pointer response is two effects at once: layers slide apart by depth, and the
  // whole model tips by at most a degree. Both are deliberately tiny — the goal is
  // the feeling of looking at a maquette on a table, not a 3D card flip.
  const tilt = document.querySelector('#room-tilt');
  const still = () => {
    document.querySelectorAll('[data-depth]').forEach(layer => { layer.style.translate = '0 0'; });
    tilt.style.setProperty('--tilt-x', '0deg'); tilt.style.setProperty('--tilt-y', '0deg');
  };
  function look(event) {
    if (event.pointerType === 'touch' || reduced.matches || preferences.reduceMotion || stage.dataset.view !== 'room' || app.classList.contains('focusing')) return;
    if (frame) return;
    const box = stage.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (event.clientX - box.left) / box.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - box.top) / box.height - .5));
    frame = requestAnimationFrame(() => {
      document.querySelectorAll('[data-depth]').forEach(layer => {
        const depth = Number(layer.dataset.depth);
        layer.style.translate = `${x * depth * 3.4}px ${y * depth * 2.6}px`;
      });
      tilt.style.setProperty('--tilt-x', `${(-y * 2 * MAX_TILT).toFixed(3)}deg`);
      tilt.style.setProperty('--tilt-y', `${(x * 2 * MAX_TILT).toFixed(3)}deg`);
      frame = 0;
    });
  }
  const viewport = document.querySelector('.room-viewport');
  viewport.addEventListener('pointermove', look);
  viewport.addEventListener('pointerleave', still);
  reduced.addEventListener('change', still);
  return { render, view, reward, lighting, place, cancelPlace, get placing() { return !!placing; } };
}
