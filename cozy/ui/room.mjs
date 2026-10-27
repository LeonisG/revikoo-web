import { roomAssets, roomFrame, objectAsset } from '../assets/manifest.mjs';
import { CATALOG, GAME_CONFIG, ROOM_SIZES, roomLevel, ASSET_TEST } from '../logic/config.mjs';
import { GLOW_TINTS } from '../logic/collections.mjs';
import { paintOrder, cellPolygon, cellAt, useRoomCamera, footprint, SCENE, CAMERA } from '../logic/grid.mjs';
import { art, escapeHTML, icon } from './helpers.mjs';
import { contactShadow } from './shadows.mjs';
import { artDefinition } from '../assets/art-registry.mjs';

const MAX_TILT = 1; // degrees, deliberately barely perceptible


export function createRoom() {
  const app = document.querySelector('#app'), stage = document.querySelector('#room-stage');
  const objects = document.querySelector('#room-objects');
  const glows = document.querySelector('#room-glows');
  app.style.setProperty('--camera-duration', `${GAME_CONFIG.animationDurations.camera}ms`);
  let preferences = {}, lastPaint = '', lastSize = '', lastCoins = null, rewardTimeout, frame = 0;
  let showFootprints = ASSET_TEST;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const preloaded = new Set();

  function useSize(size) {
    if (size === lastSize) return;
    // Aim the camera at this room's measured floor before projecting anything.
    useRoomCamera(size);
    const assets = roomAssets(size);
    for (const [id, key] of Object.entries({
      'room-shell': 'shell', 'room-window': 'window', 'window-sunset': 'windowSunset',
      'window-night': 'windowNight', 'window-rain': 'windowRain', 'room-daylight': 'daylight',
    })) document.querySelector(`#${id}`).src = assets[key];
    app.classList.toggle('illustrated-room', assets.illustrated);
    app.classList.toggle('modular-room', !!assets.modular);
    const shell = document.querySelector('#room-shell');
    shell.style.cssText = assets.illustrated ? `left:${assets.fit.x}%;top:${assets.fit.y}%;width:${assets.fit.w}%;height:${assets.fit.h}%;` : '';
    app.style.setProperty('--room-mask-size', assets.illustrated ? `${assets.fit.w}% ${assets.fit.h}%` : '100% 100%');
    app.style.setProperty('--room-mask-position', assets.illustrated ? `${assets.fit.w===100?50:assets.fit.x / (100-assets.fit.w)*100}% ${assets.fit.h===100?50:assets.fit.y/(100-assets.fit.h)*100}%` : '0 0');
    // The lighting passes are masked by the shell itself. A polygon is not good
    // enough: a multiply layer over a transparent backdrop paints its own colour,
    // so any part of the mask that is not actually room shows up as a pale block.
    app.style.setProperty('--room-mask', `url("${assets.mask}")`);
    app.dataset.size = size;
    lastSize = size;
  }

  function lighting() {
    const now = new Date(), hour = now.getHours();
    const phase = preferences.lighting === 'auto' ? (hour >= 6 && hour < 10 ? 'morning' : hour >= 10 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'sunset' : 'night') : preferences.lighting || 'day';
    app.dataset.light = phase;
    if(lastSize && app.classList.contains('modular-room')) {
      const src=roomFrame(lastSize,phase,preferences.weather);
      const shell=document.querySelector('#room-shell');if(shell.src!==src)shell.src=src;
    }
    document.querySelector('#day-label').textContent = { morning: 'La mañana se despierta', day: 'Una pausa en el día', sunset: 'La luz de última hora', night: 'El mundo baja el volumen' }[phase];
    document.querySelector('#local-time').textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Draw everything standing in the room. Each object is one absolutely placed
   * box of the same size, anchored where it meets its surface; what differs is
   * only where it sits and in what order it paints.
   */
  function paint(state) {
    const cells = ROOM_SIZES[state.room.size].cells;
    const order = paintOrder({ placed: state.room.placed, cells }, CATALOG);
    const key = JSON.stringify([state.room.size, order.map(o => [o.key, o.placement, o.layer])]);
    if (key === lastPaint) return order;
    lastPaint = key;
    // Only placed pieces are prioritised. Catalog previews remain lazy.
    for (const { item, placement } of order) {
      const asset = objectAsset(item.id, placement.rotation, placement.pose || 'idle');
      if (asset.type !== 'image' || preloaded.has(asset.src)) continue;
      preloaded.add(asset.src);
      const preload = document.createElement('link'); preload.rel = 'preload'; preload.as = 'image'; preload.href = asset.src;
      document.head.append(preload);
    }

    objects.innerHTML = order.map(({ key, item, spot, placement, layer }) => {
      // Normalised depth drives the parallax: one custom property on the
      // container moves every object by its own distance, with no per-frame work.
      const depth = Math.min(1, Math.max(0, (spot.depth || 0) / (cells * 22)));
      return `<div class="placed ${item.flat ? 'is-flat' : ''} ${item.companion ? 'is-companion' : ''}" data-key="${key}" data-item="${item.id}" data-pose="${placement.pose || 'idle'}"
        style="left:${spot.x}%;top:${spot.y}%;z-index:${layer + 500};--d:${depth.toFixed(3)};${spot.surface ? `--wall:${spot.surface === 'left' ? '-' : ''}${Math.atan(CAMERA.tilt) * 180 / Math.PI}deg;` : ''}"
        role="button" tabindex="0" aria-label="Editar ${escapeHTML(item.name)}">${contactShadow(item, placement)}${art(item.id, '', placement.rotation, placement.pose || 'idle', true)}</div>`;
    }).join('');

    // Light sources are whatever the player has actually put down.
    glows.innerHTML = order.filter(o => o.item.glow > 0).map(({ item, spot, placement }) => {
      const tint = GLOW_TINTS[item.collection] || GLOW_TINTS['oak-cozy'];
      const asset = objectAsset(item.id, placement.rotation, placement.pose || 'idle');
      const emitter = artDefinition(item.id).lightAnchor || [.5, .5];
      const x = spot.x + (emitter[0] - asset.pivot.x) * asset.width / SCENE.w * 100;
      const y = spot.y + (emitter[1] - asset.pivot.y) * asset.width / asset.aspect / SCENE.h * 100;
      return `<div class="object-glow" data-light-item="${item.id}" style="left:${x}%;top:${y}%;--glow:${item.glow};--glow-core:${tint.core};--glow-mid:${tint.mid}"></div>`;
    }).join('');
    app.dataset.lit = order.some(o => o.item.glow >= .8) ? 'bright' : order.some(o => o.item.glow > 0) ? 'dim' : 'none';
    return order;
  }

  /**
   * Footprint debug: the tiles an object occupies, its anchor and its pivot,
   * drawn on the floor plane. If a chair's legs land outside its diamond, the
   * sprite's width or pivot is wrong — that is the check this exists for.
   */
  function drawFootprints(state, cells) {
    const layer = document.querySelector('#footprint-overlay');
    if (!layer) return;
    if (!showFootprints) { layer.innerHTML = ''; return; }
    layer.innerHTML = paintOrder({ placed: state.room.placed, cells }, CATALOG)
      .filter(({ item }) => item.placement !== 'wall')
      .map(({ item, placement, spot }) => {
        const { w, h } = footprint(item, placement.rotation);
        const tiles = [];
        for (let x = placement.gx; !placement.on && x < placement.gx + w; x++)
          for (let y = placement.gy; y < placement.gy + h; y++)
            tiles.push(`<polygon points="${cellPolygon(x, y)}" class="fp-tile"/>`);
        const cx = spot.x / 100 * SCENE.w, cy = spot.y / 100 * SCENE.h;
        return `${tiles.join('')}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" class="fp-anchor"/>`
          + `<text x="${cx.toFixed(1)}" y="${(cy - 12).toFixed(1)}" class="fp-label">${w}×${h}</text>`;
      }).join('');
  }

  /** The grid, drawn only while editing; wall hooks replace it for wall items. */
  function drawGrid(cells, marks = {}, hooks = null) {
    const overlay = document.querySelector('#grid-overlay');
    let svg = '';
    if (hooks) {
      svg = hooks.map(hook => `<circle cx="${hook.x / 100 * 1400}" cy="${hook.y / 100 * 900}" r="34" class="hook ${hook.free ? '' : 'taken'}"/>`).join('');
    } else {
      for (let gx = 0; gx < cells; gx++) for (let gy = 0; gy < cells; gy++)
        svg += `<polygon points="${cellPolygon(gx, gy)}" class="cell ${marks[`${gx},${gy}`] || ''}" data-gx="${gx}" data-gy="${gy}"/>`;
    }
    overlay.innerHTML = svg;
  }
  /** Which cell a pointer event is over, in grid coordinates. */
  function cellFromEvent(event, cells) {
    const box = stage.getBoundingClientRect();
    return cellAt((event.clientX - box.left) / box.width * 100, (event.clientY - box.top) / box.height * 100, cells);
  }

  function render(state) {
    preferences = state.preferences;
    useSize(state.room.size);
    app.classList.toggle('reduce-motion', preferences.reduceMotion);
    app.dataset.weather = preferences.weather;
    app.dataset.lamp = preferences.lamp ? 'on' : 'off';
    app.classList.toggle('focusing', !!state.activeFocus);
    document.querySelector('#focus-active').hidden = !state.activeFocus;
    document.querySelector('#focus-cancel').hidden = !state.activeFocus;
    document.querySelector('.room-footer').inert = !!state.activeFocus;
    document.querySelector('#room-controls').inert = !!state.activeFocus;

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

    const order = paint(state);
    drawFootprints(state, ROOM_SIZES[state.room.size].cells);
    hotspots(order);
    const level = roomLevel(Object.keys(state.room.placed).length);
    document.querySelector('#room-level').textContent = level.name;
    lighting();
  }

  /**
   * The room is the navigation: a journal you placed is how you open your tasks.
   * The footer keeps a plain list of the same destinations for keyboard and for
   * anything not yet bought.
   */
  function hotspots(order) {
    const controls = document.querySelector('#room-controls');
    controls.innerHTML = order.filter(o => o.item.opens).map(({ key, item, spot }) =>
      `<button class="hotspot" data-room-key="${key}" data-open="${item.opens}" style="left:${spot.x}%;top:${spot.y}%"
        aria-label="Abrir ${escapeHTML(item.name)}"><span>${escapeHTML(item.name)} ${icon('arrow')}</span></button>`).join('');
  }

  function view(name) {
    stage.dataset.view = name;
    document.querySelector('#back-room').hidden = name === 'room';
  }

  function reward(text) {
    const el = document.querySelector('#reward'); clearTimeout(rewardTimeout);
    el.innerHTML = text; el.classList.add('show');
    rewardTimeout = setTimeout(() => el.classList.remove('show'), GAME_CONFIG.animationDurations.reward);
  }

  // Pointer response is two effects at once: layers slide apart by depth, and the
  // whole model tips by at most a degree. Both are deliberately tiny — the goal
  // is the feeling of looking at a maquette on a table, not a 3D card flip.
  const tilt = document.querySelector('#room-tilt');
  const still = () => {
    tilt.style.setProperty('--tilt-x', '0deg'); tilt.style.setProperty('--tilt-y', '0deg');
    stage.style.setProperty('--px', '0px'); stage.style.setProperty('--py', '0px');
  };
  function look(event) {
    if (event.pointerType === 'touch' || reduced.matches || preferences.reduceMotion
      || stage.dataset.view !== 'room' || app.classList.contains('focusing') || app.classList.contains('editing')) return;
    if (frame) return;
    const box = stage.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (event.clientX - box.left) / box.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - box.top) / box.height - .5));
    frame = requestAnimationFrame(() => {
      stage.style.setProperty('--px', `${(x * 9).toFixed(2)}px`);
      stage.style.setProperty('--py', `${(y * 7).toFixed(2)}px`);
      tilt.style.setProperty('--tilt-x', `${(-y * 2 * MAX_TILT).toFixed(3)}deg`);
      tilt.style.setProperty('--tilt-y', `${(x * 2 * MAX_TILT).toFixed(3)}deg`);
      frame = 0;
    });
  }
  const viewport = document.querySelector('.room-viewport');
  viewport.addEventListener('pointermove', look);
  viewport.addEventListener('pointerleave', still);
  reduced.addEventListener('change', still);

  return { render, view, reward, lighting, drawGrid, cellFromEvent, repaint: () => { lastPaint = ''; },
    toggleFootprints: on => { showFootprints = on ?? !showFootprints; return showFootprints; } };
}
