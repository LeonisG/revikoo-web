import { DEBUG } from './logic/config.mjs';
import { createStorage } from './logic/storage.mjs';
import { createEngine } from './logic/engine.mjs';
import { createAudio } from './logic/audio.mjs';
import { createRoom } from './ui/room.mjs';
import { createPanels } from './ui/panels.mjs';

const storage = createStorage({ onWarning(message) { const warning = document.querySelector('#save-warning'); warning.textContent = message; warning.hidden = false; } });
const engine = createEngine(storage, { debug: DEBUG });
const room = createRoom(), audio = createAudio();
const panels = createPanels(engine, room, audio);
let timerFailed = false;

function update() {
  const state = engine.state; room.render(state); audio.update(state.preferences, !!state.activeFocus);
}
engine.subscribe((name, payload) => {
  update();
  if (payload.reward > 0) { room.reward(`${name === 'FOCUS_COMPLETED' ? 'Un rato bien cuidado.' : name.startsWith('BOOK') ? 'Una historia terminada.' : 'Un pequeño paso.'} +${payload.reward} ✦`); audio.play('reward'); }
  if (name === 'FOCUS_COMPLETED') {
    document.title = 'Tu rato de foco ha terminado · Cozy Room';
    const glow = document.querySelector('.lamp-glow'); glow.classList.remove('celebrate'); requestAnimationFrame(() => glow.classList.add('celebrate'));
  }
  if (name === 'ITEM_EQUIPPED') audio.play('page');
  if (name === 'STATE_SYNCED') panels.render();
});

document.addEventListener('click', event => {
  const target = event.target.closest('[data-open]');
  if (!target) return;
  if (engine.state.activeFocus && target.dataset.open !== 'debug') return;
  if (target.dataset.open === 'desk') {
    room.view('desk'); audio.play('page');
    if (!engine.state.profile.onboardingCompleted) panels.execute(() => engine.onboard(), '', false);
    document.querySelector('.journal-object').focus({ preventScroll: true });
  } else panels.open(target.dataset.open, target);
});
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
document.addEventListener('keydown', event => {
  audio.unlock();
  if (event.key === 'Escape' && !document.querySelector('dialog[open]') && !engine.state.activeFocus) { panels.close(); room.view('room'); document.querySelector('.hotspot-desk').focus(); }
});
document.querySelector('#back-room').addEventListener('click', () => { panels.close(); room.view('room'); document.querySelector('.hotspot-desk').focus(); });
document.querySelector('#welcome-dismiss').addEventListener('click', () => {
  panels.execute(() => engine.onboard(), '', false); room.view('desk'); document.querySelector('.journal-object').focus({ preventScroll: true });
});
document.querySelector('#sound-button').addEventListener('click', () => {
  panels.execute(() => engine.preference('sound', !engine.state.preferences.sound), '', false); audio.unlock();
});
document.querySelector('#lamp-button').addEventListener('click', () => {
  panels.execute(() => engine.preference('lamp', !engine.state.preferences.lamp), '', false); audio.play('switch');
});
document.querySelector('#cat-button').addEventListener('click', () => {
  if (document.querySelector('.cat-heart')) return;
  const heart = document.createElement('span'); heart.className = 'cat-heart'; heart.textContent = '♡  z z'; heart.setAttribute('aria-hidden', 'true');
  document.querySelector('#room-camera').append(heart); setTimeout(() => heart.remove(), 2200); audio.play('cat');
});
document.querySelector('#focus-cancel').addEventListener('click', () => panels.confirm('¿Volver a la habitación?', 'Está bien parar. Esta sesión no dará monedas y no contará como completada.', 'Terminar este rato', () => {
  if (panels.execute(() => engine.cancelFocus(), '', false)) { document.title = 'Cozy Room · Un ratito para ti'; room.reward('Descansar también está bien.'); document.querySelector('[data-open=focus]').focus(); }
}));
function tick() {
  if (timerFailed) return;
  const focus = engine.state.activeFocus;
  if (!focus) return;
  const left = Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000));
  const text = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  document.querySelector('#focus-countdown').textContent = text;
  document.querySelector('#focus-kicker').textContent = DEBUG ? 'PRUEBA ACELERADA · MINUTOS EN SEGUNDOS' : 'SOLO ESTE MOMENTO';
  document.title = `${text} · Tu rato de foco`;
  if (left === 0) {
    try { engine.completeFocus(); }
    catch (error) { timerFailed = true; const warning = document.querySelector('#save-warning'); warning.textContent = `${error.message} Recarga para volver a intentar guardar la sesión.`; warning.hidden = false; }
  }
}
window.addEventListener('storage', event => {
  if (event.key === storage.key || event.key === null) { engine.sync(); tick(); }
});
document.addEventListener('visibilitychange', () => { audio.update(engine.state.preferences, !!engine.state.activeFocus); if (!document.hidden) { engine.sync(); tick(); room.lighting(); } });
document.querySelector('#debug-badge').hidden = !DEBUG;
update(); tick();
setInterval(tick, 500);
setInterval(() => room.lighting(), 60000);
