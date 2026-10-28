import { CATALOG, ROOM_SIZES, GAME_CONFIG } from '../logic/config.mjs';
import { placementError, footprint, cellPolygon, wallAnchor, WALL_SLOTS, paintOrder, occupancy, bindSurface, surfacePosition, toStage, CELL, CAMERA } from '../logic/grid.mjs';
import { art, escapeHTML } from './helpers.mjs';
import { availableOrientations, objectAsset } from '../assets/manifest.mjs';
import { spriteHit } from '../logic/sprite-hit.mjs';
import { contactShadow } from './shadows.mjs';

// A gesture is speculative: only a valid release/Enter writes to the engine.
export function createEdit(engine, room, { onChange = () => {}, onError = () => {} } = {}) {
  const app = document.querySelector('#app'), stage = document.querySelector('#room-stage');
  const bar = document.querySelector('#edit-bar'), tray = document.querySelector('#edit-tray');
  const heldBar = document.querySelector('#held-bar'), ghost = document.querySelector('#ghost-overlay');
  const objects = document.querySelector('#room-objects'), hint = document.querySelector('#edit-hint');
  const context = document.createElement('div');
  context.className = 'object-actions'; context.hidden = true; context.setAttribute('role', 'group');
  context.setAttribute('aria-label', 'Editar objeto'); app.append(context);
  hint.setAttribute('role', 'status'); hint.setAttribute('aria-live', 'polite');
  let editing = false, held = null, hover = null, gesture = null, selected = null, suppressClick = false, longPress, confirmSale;
  const cells = () => ROOM_SIZES[engine.state.room.size].cells;
  const say = text => { if (hint.textContent !== text) hint.textContent = text; };
  const isEditing = () => editing;
  function open() {
    room.view('room'); if (editing) return;
    editing = true; app.classList.add('editing'); bar.hidden = false;
    document.querySelector('#edit-toggle').setAttribute('aria-pressed', 'true'); refresh();
  }
  function clearPreview() {
    ghost.innerHTML = '';
    objects.querySelectorAll('.placement-preview').forEach(el => el.remove());
    objects.querySelectorAll('.is-moving').forEach(el => el.classList.remove('is-moving'));
  }
  function drop() {
    held = null; hover = null; gesture = null; clearTimeout(longPress);
    heldBar.hidden = true; clearPreview(); app.classList.remove('holding', 'dragging');
    tray.querySelectorAll('[aria-pressed=true]').forEach(el => el.setAttribute('aria-pressed', 'false'));
    say('Arrastra algo a la habitación. También puedes elegirlo y usar las flechas.'); paintGrid();
  }
  function close() {
    editing = false; drop(); hideContext(); app.classList.remove('editing'); bar.hidden = true;
    document.querySelector('#grid-overlay').innerHTML = '';
    document.querySelector('#edit-toggle').setAttribute('aria-pressed', 'false'); onChange();
  }
  function hideContext() { selected = null; context.hidden = true; }
  function select(key) {
    const p = engine.state.room.placed[key]; if (!p) return;
    selected = key; const item = CATALOG[p.item];
    context.innerHTML = `<span>${escapeHTML(item.name)}</span><button data-edit="move">Mover</button>
      ${item.rotatable && availableOrientations(item.id).length > 1 ? '<button data-edit="rotate">Girar</button>' : ''}<button data-edit="store">Guardar</button>
      ${!item.starter && !item.editorOnly ? '<button data-edit="sell">Vender</button>' : ''}
      ${item.companion ? `<label>Postura <select data-pet-pose aria-label="Postura del compañero">${[['idle','Descansar'],['sleep','Dormir'],['sit','Sentarse']].map(([value,label])=>`<option value="${value}" ${value === (p.pose || 'idle') ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}
      <button data-edit="dismiss" aria-label="Cerrar controles">×</button>`;
    context.hidden = false;
  }
  function begin(id, from = 'tray') {
    if (!CATALOG[id] || (from === 'tray' && !engine.state.inventory[id])) return;
    const wasEditing = editing;
    drop(); hideContext(); open();
    const p = engine.state.room.placed[from], item = CATALOG[id];
    held = { item, from, rotation: p?.rotation || 0, pose: p?.pose || 'idle', wasEditing }; hover = p ? { ...p } : null;
    heldBar.hidden = false; app.classList.add('holding');
    document.querySelector('#held-name').textContent = item.name;
    heldBar.querySelector('[data-held=rotate]').hidden = !item.rotatable || availableOrientations(id).length < 2;
    heldBar.querySelector('[data-held=store]').hidden = from === 'tray';
    tray.querySelector(`[data-pick="${id}"]`)?.setAttribute('aria-pressed', 'true');
    say(`Arrastra y suelta${availableOrientations(id).length > 1 ? ' · R gira' : ''} · Esc cancela.`); paintGrid();
  }
  function spot() {
    if (!held || !hover) return null;
    const p = { ...hover, rotation: held.rotation };
    return held.item.placement === 'surface' ? bindSurface(p, engine.state.room.placed, CATALOG) : p;
  }
  function wallSlots() {
    return ['left', 'right'].flatMap(wall => Array.from({ length: WALL_SLOTS }, (_, index) => ({
      wall, index, ...wallAnchor(wall, index, cells()),
      free: !Object.entries(engine.state.room.placed).some(([key, p]) => key !== held?.from && p.wall === wall && p.index === index),
    })));
  }
  function paintGrid() {
    if (!editing) return;
    const marks = Object.fromEntries([...occupancy(engine.state.room.placed, CATALOG, held?.from)]
      .filter(([, entries]) => entries.some(p => !p.flat)).map(([cell]) => [cell, 'taken']));
    room.drawGrid(cells(), marks, held?.item.placement === 'wall' ? wallSlots() : null); paintGhost();
  }
  function paintGhost() {
    clearPreview(); if (!held) return;
    const state = engine.state, p = spot();
    const moving = new Set([held.from, ...Object.entries(state.room.placed).filter(([, v]) => v.parentSurfaceId === held.from).map(([k]) => k)]);
    objects.querySelectorAll('.placed').forEach(el => el.classList.toggle('is-moving', moving.has(el.dataset.key)));
    if (!p) return;
    const problem = placementError(p, held.item, { placed: state.room.placed, cells: cells() }, CATALOG, held.from);
    const klass = problem ? 'bad' : 'good';
    if (held.item.placement === 'wall') {
      const a = wallAnchor(p.wall, p.index, cells());
      ghost.innerHTML = `<circle cx="${a.x * 14}" cy="${a.y * 9}" r="35" class="ghost-wall ${klass}"/>`;
    } else {
      const { w, h } = footprint(held.item, held.rotation);
      ghost.innerHTML = Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) =>
        `<polygon points="${cellPolygon(p.gx + x, p.gy + y)}" class="ghost ${klass}"/>`).join('')).join('');
    }
    const key = held.from === 'tray' ? '__preview' : held.from;
    const preview = { ...state.room.placed, [key]: { item: held.item.id, ...p, pose: held.pose } };
    for (const entry of paintOrder({ placed: preview, cells: cells() }, CATALOG).filter(e => e.key === key || e.placement.parentSurfaceId === key)) {
      const el = document.createElement('div'); el.className = `placement-preview ${klass}`; el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `left:${entry.spot.x}%;top:${entry.spot.y}%;z-index:${entry.layer + 500};${entry.spot.surface ? `--wall:${entry.spot.surface === 'left' ? '-' : ''}${Math.atan(CAMERA.tilt) * 180 / Math.PI}deg;` : ''}`;
      el.innerHTML = contactShadow(entry.item, entry.placement, preview) + art(entry.item.id, '', entry.placement.rotation, entry.placement.pose || 'idle', true); objects.append(el);
    }
    say(problem || `${held.item.name} cabe aquí. Suelta para colocarlo.`);
    app.dataset.placement = problem ? 'invalid' : 'valid';
  }
  function put(returnOnFailure = false) {
    const p = spot(); if (!held) return;
    if (!p) { if (returnOnFailure) reject('Fuera de la habitación. El objeto vuelve a su sitio.'); return; }
    try {
      const result = held.from === 'tray' ? engine.placeItem(held.item.id, p) : engine.moveItem(held.from, p);
      drop(); refresh(); objects.querySelector(`[data-key="${result.key}"]`)?.classList.add('just-placed');
      return true;
    } catch (error) { if (returnOnFailure) reject(error.message); else { onError(error.message); say(error.message); } }
  }
  function reject(message) {
    const id = held?.item.id; drop(); const tile = tray.querySelector(`[data-pick="${id}"]`);
    tile?.classList.remove('returned'); void tile?.offsetWidth; tile?.classList.add('returned'); onError(message); say(message);
  }
  function store() {
    if (!held || held.from === 'tray') return;
    try { engine.storeItem(held.from); drop(); refresh(); } catch (e) { onError(e.message); }
  }
  function rotate() {
    if (!held?.item.rotatable) return;
    const views = availableOrientations(held.item.id);
    if (views.length < 2) { say('Esta pieza tiene una orientación ilustrada.'); return; }
    held.rotation = views[(views.indexOf(held.rotation) + 1) % views.length]; paintGhost();
  }
  function cancel() { const wasEditing = held?.wasEditing; drop(); if (wasEditing === false) close(); }
  function refresh() {
    if (!editing) return;
    tray.innerHTML = Object.entries(engine.state.inventory).filter(([, n]) => n > 0).map(([id, n]) => {
      const item = CATALOG[id];
      return `<button class="tray-item" data-pick="${id}" aria-pressed="${held?.item.id === id}" aria-label="Colocar ${escapeHTML(item.name)}. ${n} guardados">
        <span class="tray-art">${art(id)}</span><span class="tray-name">${escapeHTML(item.name)}</span>
        <span class="tray-meta">${item.w}×${item.h} · ${n} guardado${n > 1 ? 's' : ''}</span></button>`;
    }).join('') || '<p class="tray-empty">Todo está en su sitio. Encontrarás más cosas en la tienda.</p>';
    paintGrid(); onChange();
  }
  function surfaceSlots() {
    return Object.entries(engine.state.room.placed).flatMap(([key, host]) => CATALOG[host.item].surfaces.map((_, i) => {
      const pos = surfacePosition(host, CATALOG[host.item], i), a = toStage(pos.x * CELL, pos.y * CELL, pos.z);
      return { parentSurfaceId: key, surfaceSlot: i, gx: Math.floor(pos.x), gy: Math.floor(pos.y), x: a.x, y: a.y };
    }));
  }
  function locate(event) {
    const box = stage.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width * 100, y = (event.clientY - box.top) / box.height * 100;
    const nearest = list => list.map(slot => ({ ...slot, d: Math.hypot((slot.x - x) * 14, (slot.y - y) * 9) })).sort((a, b) => a.d - b.d)[0];
    if (held?.item.placement === 'wall') { const n = nearest(wallSlots()); return n?.d < 100 ? n : null; }
    if (held?.item.placement === 'surface') { const n = nearest(surfaceSlots()); if (n?.d < 65) return n; }
    return room.cellFromEvent(event, cells());
  }
  function hitObject(event) {
    // Transparent image margins must not steal gestures from the object behind.
    const layers = [...objects.querySelectorAll('.placed:not(.is-moving)')].reverse()
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex));
    for (const el of layers) {
      const img = el.querySelector('.item-sprite');
      if (!img) { if (el.contains(event.target)) return el.dataset.key; continue; }
      const bounds = img.getBoundingClientRect(), p = engine.state.room.placed[el.dataset.key];
      const asset = objectAsset(p.item, p.rotation, p.pose || 'idle');
      // The hit mask is stored against the authored image, but what the pointer
      // meets on screen is the transformed one. getBoundingClientRect reports the
      // transformed box, so normalising against it samples the wrong pixel unless
      // the transform is undone first. Floor art carries the measured axisFix;
      // wall art carries the planar skew. An asset never has both — measure-axes
      // skips wall placements — so these are two branches, never a composition.
      let nx, ny;
      if (asset.axisFix) {
        // Undo x' = widen*x, y' = shear*x + y, taken about the pivot, in units
        // of the untransformed box. k is the shear expressed against height.
        const { widen, shear } = asset.axisFix;
        const a = asset.pivot.x, k = shear * (asset.aspect || 1);
        const spanY = 1 + Math.abs(k), minY = k > 0 ? -k * a : k * (1 - a);
        const u = (event.clientX - bounds.left) / bounds.width * widen + a * (1 - widen);
        const v = (event.clientY - bounds.top) / bounds.height * spanY + minY;
        nx = a + (u - a) / widen;
        ny = v - k * (nx - a);
      } else {
        nx = (event.clientX - bounds.left) / bounds.width;
        // Invert planar wall skew. Bounding-rect normalization alone samples the
        // wrong alpha row near the upper/lower corners of a hanging picture.
        const slope = p.wall ? (p.wall === 'left' ? -1 : 1) * CAMERA.tilt : 0;
        const originalHeight = bounds.height - Math.abs(slope) * bounds.width;
        ny = slope
          ? (event.clientY - bounds.top - Math.abs(slope) * bounds.width / 2 - slope * (nx - .5) * bounds.width) / originalHeight
          : (event.clientY - bounds.top) / bounds.height;
      }
      if (spriteHit(asset.hitMask, nx, ny)) return el.dataset.key;
    }
    return null;
  }
  function pointerDown(event) {
    if (event.button !== 0 || event.target.closest('button:not(.tray-item):not(.hotspot)') || engine.state.activeFocus) return;
    const tile = event.target.closest('[data-pick]');
    const key = tile ? null : event.target.closest('[data-room-key]')?.dataset.roomKey || hitObject(event);
    if ((!tile && !key) || (held && !tile)) return;
    gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, tile: tile?.dataset.pick, key, active: false, target: event.currentTarget, wasEditing: editing };
    if (key && event.pointerType === 'touch') longPress = setTimeout(() => {
      if (!gesture || gesture.active) return; select(gesture.key); gesture = null; suppressClick = true;
    }, 450);
  }
  tray.addEventListener('pointerdown', pointerDown); stage.addEventListener('pointerdown', pointerDown);
  document.addEventListener('pointermove', event => {
    if (gesture && gesture.pointerId === event.pointerId) {
      if (!gesture.active && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) {
        clearTimeout(longPress); const g = gesture;
        begin(g.tile || engine.state.room.placed[g.key]?.item, g.tile ? 'tray' : g.key);
        gesture = { ...g, active: true }; app.classList.add('dragging'); suppressClick = true;
        // Capture keeps the drag alive outside the tile, but the pointer can
        // already be gone (cancelled, or synthesised by a test or assistive
        // tool). Losing capture is survivable; letting it throw would abort
        // the drag mid-gesture.
        try { g.target.setPointerCapture(event.pointerId); } catch { /* drag continues without capture */ }
      }
      if (gesture?.active) { event.preventDefault(); hover = locate(event); paintGhost(); }
    } else if (held && editing && stage.contains(event.target)) { hover = locate(event); paintGhost(); }
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    clearTimeout(longPress); if (!gesture || event.pointerId !== gesture.pointerId) return;
    const g = gesture; gesture = null;
    if (g.active) {
      hover = locate(event); const committed = put(true);
      if (!committed && !g.wasEditing) close();
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    }
    if (g.target.hasPointerCapture(event.pointerId)) g.target.releasePointerCapture(event.pointerId);
  });
  document.addEventListener('pointercancel', cancel);
  window.addEventListener('blur', () => { if (gesture?.active) cancel(); });
  tray.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    const id = event.target.closest('[data-pick]')?.dataset.pick; if (id) begin(id);
  });
  stage.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; event.stopPropagation(); return; }
    if (held) { hover = locate(event); put(); return; }
    if (event.target.closest('[data-room-key]')) return;
    const key = hitObject(event); if (key) select(key); else hideContext();
  });
  stage.addEventListener('contextmenu', event => {
    const key = event.target.closest('[data-room-key]')?.dataset.roomKey || hitObject(event);
    if (key) { event.preventDefault(); drop(); select(key); }
  });
  context.addEventListener('click', event => {
    const action = event.target.closest('[data-edit]')?.dataset.edit;
    const key = selected, p = engine.state.room.placed[key]; if (!p) { hideContext(); return; }
    if (action === 'move' || action === 'rotate') { begin(p.item, key); if (action === 'rotate') rotate(); }
    if (action === 'store') { try { engine.storeItem(key); refresh(); hideContext(); } catch (e) { onError(e.message); } }
    if (action === 'sell') confirmSale?.('¿Vender este objeto?', `Recibirás ${Math.floor(CATALOG[p.item].price * GAME_CONFIG.resaleRate)} monedas. Sus accesorios volverán al inventario.`, 'Vender', () => {
      try { engine.sellPlaced(key); refresh(); hideContext(); } catch (e) { onError(e.message); }
    });
    if (action === 'dismiss') hideContext();
  });
  context.addEventListener('change', event => {
    if (!event.target.matches('[data-pet-pose]') || !selected) return;
    try { engine.setCompanionPose(selected, event.target.value); } catch(error) { onError(error.message); }
  });
  heldBar.addEventListener('click', event => {
    const action = event.target.closest('[data-held]')?.dataset.held;
    if (action === 'rotate') rotate(); if (action === 'store') store(); if (action === 'cancel') cancel(); if (action === 'place') put();
  });
  document.addEventListener('keydown', event => {
    if (event.target.matches('input,textarea,select') || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') { if (held) cancel(); else if (selected) hideContext(); else if (editing) close(); }
    if (!held) {
      const key = event.target.closest('.placed')?.dataset.key;
      if (key && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(key); context.querySelector('button').focus(); }
      return;
    }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); rotate(); }
    if (event.key === 'Enter') { event.preventDefault(); put(); }
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      if (held.item.placement !== 'floor') {
        const slots = held.item.placement === 'wall' ? wallSlots() : surfaceSlots();
        const index = slots.findIndex(s => held.item.placement === 'wall' ? s.wall === hover?.wall && s.index === hover?.index : s.parentSurfaceId === hover?.parentSurfaceId && s.surfaceSlot === hover?.surfaceSlot);
        const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
        hover = slots[(index + delta + slots.length) % slots.length] || null;
      } else {
        const delta = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[event.key];
        hover = hover ? { gx: Math.max(0, Math.min(cells() - 1, hover.gx + delta[0])), gy: Math.max(0, Math.min(cells() - 1, hover.gy + delta[1])) } : { gx: 0, gy: 0 };
      }
      paintGhost();
    }
  });
  document.querySelector('#edit-done').addEventListener('click', close);
  const toggle = () => editing ? close() : open();
  document.querySelector('#edit-toggle').addEventListener('click', toggle);
  return { open, close, toggle, refresh, isEditing, startPlacement: begin, cancel,
    setConfirm: callback => { confirmSale = callback; }, get held() { return held; } };
}
