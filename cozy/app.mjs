import { DEBUG, CATALOG, roomLevel } from './logic/config.mjs';
import { createStorage } from './logic/storage.mjs';
import { createEngine } from './logic/engine.mjs';
import { createAudio } from './logic/audio.mjs';
import { createRoom } from './ui/room.mjs';
import { createPanels } from './ui/panels.mjs';
import { createEdit } from './ui/edit.mjs';
import { createSetup } from './ui/setup.mjs';
import { coin } from './ui/helpers.mjs';

const storage = createStorage({ onWarning(message) { const warning = document.querySelector('#save-warning'); warning.textContent = message; warning.hidden = false; } });
const engine = createEngine(storage, { debug: DEBUG });
const room = createRoom(), audio = createAudio();
const edit = createEdit(engine, room, { onChange: () => update(), onError: message => room.reward(message) });
const panels = createPanels(engine, room, audio, edit);
edit.setConfirm(panels.confirm);
const setup = createSetup(engine, { onFinish: () => { update(); edit.open(); } });
let timerFailed = false;

function update() {
  const state = engine.state;
  room.render(state);
  audio.update(state.preferences, !!state.activeFocus);
  hint(state);
}

/** One line at the bottom, saying the next useful thing and nothing else. */
function hint(state) {
  const placed = Object.keys(state.room.placed).length;
  const spare = Object.values(state.inventory).reduce((n, c) => n + c, 0);
  const text = edit.isEditing() ? 'Toca un mueble para moverlo, o elige algo de abajo.'
    : spare ? `Tienes ${spare} ${spare === 1 ? 'cosa guardada' : 'cosas guardadas'}. Entra en Editar para colocarlas.`
    : placed === 0 ? 'Tu habitación está vacía. Eso es el principio.'
    : `${roomLevel(placed).name}. Haz algo tuyo y vuelve con monedas.`;
  document.querySelector('#context-hint').textContent = text;
}

engine.subscribe((name, payload) => {
  update();
  if (payload.reward > 0) {
    room.reward(`${name === 'FOCUS_COMPLETED' ? 'Un rato bien cuidado.' : name.startsWith('BOOK') ? 'Una historia terminada.' : name === 'QUEST_CLAIMED' ? 'Recogida.' : 'Un pequeño paso.'} +${payload.reward} ${coin}`);
    audio.play('reward');
  }
  if (payload.refund > 0) room.reward(`Vendido. +${payload.refund} ${coin}`);
  for (const id of payload.sets || []) room.reward('Colección completa. Te dejan un detalle en tus cosas.');
  if (name === 'FOCUS_COMPLETED') document.title = 'Tu rato de foco ha terminado · Cozy Room';
  if (name === 'ITEM_PLACED' || name === 'ITEM_MOVED' || name === 'ITEM_STORED') { audio.play('page'); edit.refresh(); }
  if (name === 'ROOM_RESIZED' && payload.displaced) room.reward(`${payload.displaced} ${payload.displaced === 1 ? 'objeto ha vuelto' : 'objetos han vuelto'} a tus cosas guardadas.`);
  if (name === 'STATE_SYNCED') panels.render();
});

document.addEventListener('click', event => {
  const target = event.target.closest('[data-open]');
  if (!target) return;
  if (engine.state.activeFocus && target.dataset.open !== 'debug') return;
  if (edit.isEditing()) edit.close();
  panels.open(target.dataset.open, target);
});
document.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
document.addEventListener('keydown', event => {
  audio.unlock();
  if (event.key === 'Escape' && !document.querySelector('dialog[open]') && !engine.state.activeFocus && !edit.isEditing()) {
    panels.close(); room.view('room');
  }
});
document.querySelector('#back-room').addEventListener('click', () => { panels.close(); room.view('room'); });
document.querySelector('#sound-button').addEventListener('click', () => {
  panels.execute(() => engine.preference('sound', !engine.state.preferences.sound), '', false); audio.unlock();
});
document.querySelector('#explore-toggle').addEventListener('click', event => {
  const nav = document.querySelector('#room-navigation');
  const open = nav.classList.toggle('is-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelector('#focus-cancel').addEventListener('click', () => panels.confirm('¿Volver a la habitación?', 'Está bien parar. Esta sesión no dará monedas y no contará como completada.', 'Terminar este rato', () => {
  if (panels.execute(() => engine.cancelFocus(), '', false)) { document.title = 'Cozy Room · Construye tu rincón'; room.reward('Descansar también está bien.'); }
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

update();
// A room that has never been built opens straight into building it.
if (!engine.state.profile.setupCompleted) setup.start();
tick();
setInterval(tick, 500);
setInterval(() => room.lighting(), 60000);
