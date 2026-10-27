import { CATALOG, ROOM_SIZES } from '../logic/config.mjs';
import { placementError, cellsOf, footprint, cellPolygon, anchorOf, wallAnchor, WALL_SLOTS } from '../logic/grid.mjs';
import { art, escapeHTML, icon } from './helpers.mjs';

/**
 * Edit mode: the grid appears, the drawer opens and the room becomes the
 * interface. There are only two things to hold — something from the drawer that
 * is not placed yet, or something already in the room that is being moved — and
 * both behave the same from the moment they are picked up.
 */
export function createEdit(engine, room, { onChange = () => {}, onError = () => {} } = {}) {
  const app = document.querySelector('#app');
  const stage = document.querySelector('#room-stage');
  const bar = document.querySelector('#edit-bar');
  const tray = document.querySelector('#edit-tray');
  const heldBar = document.querySelector('#held-bar');
  const ghost = document.querySelector('#ghost-overlay');
  const hint = document.querySelector('#edit-hint');

  let editing = false;
  // held = { item, rotation, from: 'tray' | key }  — null when nothing is picked up.
  let held = null, hover = null;

  const cells = () => ROOM_SIZES[engine.state.room.size].cells;
  const isEditing = () => editing;

  function open() {
    if (editing) return;
    editing = true;
    app.classList.add('editing');
    bar.hidden = false;
    document.querySelector('#edit-toggle').setAttribute('aria-pressed', 'true');
    refresh();
  }
  function close() {
    if (!editing) return;
    editing = false; drop();
    app.classList.remove('editing');
    bar.hidden = true;
    ghost.innerHTML = '';
    document.querySelector('#grid-overlay').innerHTML = '';
    document.querySelector('#edit-toggle').setAttribute('aria-pressed', 'false');
    onChange();
  }
  const toggle = () => (editing ? close() : open());

  /** Put down whatever is being held, without moving anything. */
  function drop() {
    held = null; hover = null;
    heldBar.hidden = true;
    ghost.innerHTML = '';
    tray.querySelectorAll('[aria-pressed="true"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    app.classList.remove('holding');
    say('Elige algo para colocarlo, o toca un mueble para moverlo.');
    paintGrid();
  }
  const say = text => { hint.textContent = text; };

  function pickFromTray(id) {
    const item = CATALOG[id];
    if (!item) return;
    held = { item, rotation: 0, from: 'tray' };
    app.classList.add('holding');
    document.querySelector('#held-name').textContent = item.name;
    heldBar.hidden = false;
    heldBar.querySelector('[data-held=rotate]').hidden = !item.rotatable;
    heldBar.querySelector('[data-held=store]').hidden = true;
    say(item.placement === 'wall' ? 'Elige un hueco en la pared.' : 'Elige dónde va.');
    paintGrid();
  }

  function pickPlaced(key) {
    const placement = engine.state.room.placed[key];
    if (!placement) return;
    const item = CATALOG[placement.item];
    held = { item, rotation: placement.rotation || 0, from: key };
    app.classList.add('holding');
    document.querySelector('#held-name').textContent = item.name;
    heldBar.hidden = false;
    heldBar.querySelector('[data-held=rotate]').hidden = !item.rotatable;
    heldBar.querySelector('[data-held=store]').hidden = false;
    say('Muévelo a otro sitio, gíralo o guárdalo.');
    paintGrid();
  }

  /** Every wall slot on both walls, with whether it is free. */
  function wallSlots() {
    const taken = new Set(Object.values(engine.state.room.placed)
      .filter(p => p.wall).map(p => `${p.wall},${p.index}`));
    const out = [];
    for (const wall of ['left', 'right'])
      for (let index = 0; index < WALL_SLOTS; index++)
        out.push({ wall, index, ...wallAnchor(wall, index, cells()), free: !taken.has(`${wall},${index}`) });
    return out;
  }

  /** The grid itself: free cells, cells already taken, and the hovered footprint. */
  function paintGrid() {
    if (!editing) return;
    const n = cells();
    const state = engine.state;
    // Hanging something shows the hooks instead of the floor grid.
    if (held?.item.placement === 'wall') {
      room.drawGrid(n, {}, wallSlots());
      paintGhost();
      return;
    }
    const taken = {};
    for (const [key, placement] of Object.entries(state.room.placed)) {
      const item = CATALOG[placement.item];
      if (!item || item.placement === 'wall' || item.flat) continue;
      if (held?.from === key) continue;
      for (const cell of cellsOf(placement, item)) taken[cell] = 'taken';
    }
    room.drawGrid(n, taken);
    paintGhost();
  }

  /** The preview under the cursor: green when it fits, red when it does not. */
  function paintGhost() {
    if (!held || !hover) { ghost.innerHTML = ''; return; }
    const state = engine.state;
    const spot = held.item.placement === 'wall'
      ? { wall: hover.wall, index: hover.index }
      : { gx: hover.gx, gy: hover.gy, rotation: held.rotation, ...(held.item.placement === 'surface' ? { on: true } : {}) };
    const problem = placementError(spot, held.item, { placed: state.room.placed, cells: cells() }, CATALOG,
      held.from === 'tray' ? null : held.from);
    const klass = problem ? 'bad' : 'good';

    let svg = '';
    if (held.item.placement === 'wall') {
      const a = wallAnchor(hover.wall, hover.index, cells());
      svg = `<circle cx="${a.x / 100 * 1400}" cy="${a.y / 100 * 900}" r="46" class="ghost-wall ${klass}"/>`;
    } else {
      const { w, h } = footprint(held.item, held.rotation);
      for (let x = hover.gx; x < hover.gx + w; x++)
        for (let y = hover.gy; y < hover.gy + h; y++)
          if (x < cells() && y < cells()) svg += `<polygon points="${cellPolygon(x, y)}" class="ghost ${klass}"/>`;
    }
    ghost.innerHTML = svg;
    say(problem || `${held.item.name} cabe aquí.`);
  }

  /** Commit whatever is held to the cell under the cursor. */
  function put() {
    if (!held || !hover) return;
    const spot = held.item.placement === 'wall'
      ? { wall: hover.wall, index: hover.index }
      : { gx: hover.gx, gy: hover.gy, rotation: held.rotation, ...(held.item.placement === 'surface' ? { on: true } : {}) };
    try {
      if (held.from === 'tray') engine.placeItem(held.item.id, spot);
      else engine.moveItem(held.from, spot);
      drop(); refresh();
    } catch (error) { onError(error.message); say(error.message); }
  }

  function store() {
    if (!held || held.from === 'tray') return;
    try { engine.storeItem(held.from); drop(); refresh(); }
    catch (error) { onError(error.message); }
  }

  function rotate() {
    if (!held?.item.rotatable) return;
    held.rotation = (held.rotation + 90) % 360;
    paintGhost();
  }

  /** The drawer: one tile per spare unit sitting in the inventory. */
  function refresh() {
    if (!editing) return;
    const state = engine.state;
    const entries = Object.entries(state.inventory).filter(([, n]) => n > 0);
    tray.innerHTML = entries.length
      ? entries.map(([id, n]) => {
        const item = CATALOG[id];
        if (!item) return '';
        const { w, h } = footprint(item, 0);
        return `<button class="tray-item" data-pick="${id}" aria-pressed="false">
          <span class="tray-art">${art(id)}</span>
          <span class="tray-name">${escapeHTML(item.name)}</span>
          <span class="tray-meta">${w}×${h}${n > 1 ? ` · ${n}` : ''}</span></button>`;
      }).join('')
      : `<p class="tray-empty">No te queda nada guardado. Pasa por la tienda ${icon('arrow')}</p>`;
    paintGrid();
    onChange();
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  tray.addEventListener('click', event => {
    const button = event.target.closest('[data-pick]');
    if (!button) return;
    if (held?.from === 'tray' && held.item.id === button.dataset.pick) { drop(); return; }
    drop();
    button.setAttribute('aria-pressed', 'true');
    pickFromTray(button.dataset.pick);
  });

  heldBar.addEventListener('click', event => {
    const action = event.target.closest('[data-held]')?.dataset.held;
    if (action === 'rotate') rotate();
    if (action === 'store') store();
    if (action === 'cancel') drop();
  });

  stage.addEventListener('pointermove', event => {
    if (!editing || !held) return;
    hover = locate(event);
    paintGhost();
  });
  stage.addEventListener('pointerleave', () => { if (editing && held) { hover = null; ghost.innerHTML = ''; } });

  stage.addEventListener('click', event => {
    if (!editing) return;
    if (held) { hover = locate(event) || hover; put(); return; }
    // Nothing held: picking up whatever was clicked on.
    const placed = event.target.closest('.placed');
    if (placed) pickPlaced(placed.dataset.key);
  });

  /** Where the pointer is: the nearest wall hook, or the floor cell under it. */
  function locate(event) {
    if (held?.item.placement !== 'wall') return room.cellFromEvent(event, cells());
    const box = stage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width * 100;
    const y = (event.clientY - box.top) / box.height * 100;
    // Nearest hook wins, so a rough aim still lands somewhere sensible.
    return wallSlots().reduce((best, slot) => {
      const d = (slot.x - x) ** 2 + ((slot.y - y) * 1.6) ** 2;
      return !best || d < best.d ? { wall: slot.wall, index: slot.index, d } : best;
    }, null);
  }

  document.addEventListener('keydown', event => {
    if (!editing) return;
    if (event.key === 'Escape') { held ? drop() : close(); }
    if ((event.key === 'r' || event.key === 'R') && held) { event.preventDefault(); rotate(); }
  });

  document.querySelector('#edit-done').addEventListener('click', close);
  document.querySelector('#edit-toggle').addEventListener('click', toggle);

  return { open, close, toggle, refresh, isEditing, get held() { return held; } };
}
