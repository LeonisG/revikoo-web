import { ROOM_ASSETS } from '../assets/manifest.mjs';
import { CATALOG, SLOTS, GAME_CONFIG } from '../logic/config.mjs';
import { art, bookStyle, escapeHTML } from './helpers.mjs';

export function createRoom() {
  const app = document.querySelector('#app'), stage = document.querySelector('#room-stage');
  app.style.setProperty('--camera-duration', `${GAME_CONFIG.animationDurations.camera}ms`);
  let preferences = {}, lastDecor = '', lastBooks = '', lastCoins = null, rewardTimeout, frame = 0;
  document.querySelector('#room-background').src = ROOM_ASSETS.background;
  document.querySelector('#room-furniture').src = ROOM_ASSETS.furniture;
  document.querySelector('#room-foreground').src = ROOM_ASSETS.foreground;
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
    sound.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9Z${preferences.sound ? 'm9-1q5 4 0 8m3-11q8 7 0 14' : 'm4 0 5 6m0-6-5 6'}"/></svg>`;
    document.querySelector('#lamp-button').setAttribute('aria-label', preferences.lamp ? 'Apagar lámpara' : 'Encender lámpara');
    const decorKey = JSON.stringify(state.room.slots);
    if (decorKey !== lastDecor) {
      const buckets = { wall: [], middle: [], floor: [], rug: [] };
      for (const [slot, id] of Object.entries(state.room.slots)) {
        const item = CATALOG.find(i => i.id === id), position = SLOTS[slot];
        if (!item || !position) continue;
        const group = slot === 'floor-center' ? 'rug' : slot.startsWith('floor') ? 'floor' : slot.startsWith('wall') ? 'wall' : 'middle';
        buckets[group].push(`<div class="decoration" data-item="${id}" data-slot="${slot}" style="left:${position.x}%;top:${position.y}%;width:${position.size}%;aspect-ratio:${group === 'rug' ? '3.6' : '160/180'}" role="img" aria-label="${escapeHTML(item.name)} en ${escapeHTML(position.name)}">${art(item.asset, '', { stretch: group === 'rug' })}</div>`);
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
  function view(name) {
    stage.dataset.view = name;
    document.querySelector('#back-room').hidden = name === 'room';
    document.querySelector('#desk-note').hidden = name !== 'desk';
  }
  function reward(text) {
    const el = document.querySelector('#reward'); clearTimeout(rewardTimeout);
    el.textContent = text; el.classList.add('show');
    rewardTimeout = setTimeout(() => el.classList.remove('show'), GAME_CONFIG.animationDurations.reward);
  }
  document.querySelector('.room-viewport').addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduced.matches || preferences.reduceMotion || stage.dataset.view !== 'room' || app.classList.contains('focusing')) return;
    if (frame) return;
    const x = event.clientX / innerWidth - .5, y = event.clientY / innerHeight - .5;
    frame = requestAnimationFrame(() => { document.querySelectorAll('[data-depth]').forEach(layer => { const depth = Number(layer.dataset.depth); layer.style.translate = `${x * depth * 4}px ${y * depth * 3}px`; }); frame = 0; });
  });
  document.querySelector('.room-viewport').addEventListener('pointerleave', () => { document.querySelectorAll('[data-depth]').forEach(layer => { layer.style.translate = '0 0'; }); });
  return { render, view, reward, lighting };
}
