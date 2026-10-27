// Loaded only for ?art-debug=true. Uses a separate save selected in config.mjs.
import { CATALOG, ROOM_SIZES } from '../logic/config.mjs';
import { ART_ASSETS, GOLDEN_IDS } from '../assets/art-registry.mjs';
import { objectAsset, availableOrientations, ART_PILOT } from '../assets/manifest.mjs';
import { CAMERA, SCENE, CELL, project, cellPolygon, paintOrder, occupancy } from '../logic/grid.mjs';
import { escapeHTML } from './helpers.mjs';
import { geometryProfile } from '../logic/geometry-profile.mjs';

export function createArtDebug(engine, room, onChange, resetGolden) {
  const style = document.createElement('link'); style.rel = 'stylesheet';
  style.href = new URL('../styles/art-debug.css', import.meta.url).href; document.head.append(style);
  const app = document.querySelector('#app');
  app.classList.add('art-debug');
  const panel = document.createElement('aside');
  panel.className = 'art-inspector'; panel.setAttribute('aria-label', 'Inspección artística');
  panel.innerHTML = `<details open><summary>Cozy · inspección artística <span>DRAFT</span></summary>
    <p>Revisión local · guardado separado</p>
    <div class="art-toolbar"><label>Habitación <select id="art-size">${Object.values(ROOM_SIZES).map(s => `<option value="${s.id}">${s.cells} × ${s.cells}</option>`).join('')}</select></label>
    <label>Luz <select id="art-light"><option value="day">Día neutro</option><option value="night">Noche</option><option value="sunset">Atardecer</option></select></label></div>
    <label>Objeto <select id="art-item">${Object.values(CATALOG).map(i => `<option value="${i.id}">${escapeHTML(i.name)}</option>`).join('')}</select></label>
    <div class="art-toolbar"><button type="button" id="art-golden">Golden candidato</button><button type="button" id="art-empty">Room vacía</button><button type="button" id="art-solo">Objeto solo</button></div>
    ${ART_PILOT ? `<p>Piloto Tripo · fuente GLB · 4 vistas renderizadas · DRAFT</p><div class="art-toolbar"><button type="button" id="art-pilot-fixture">Escritorio + taza</button><label>Giro real <select id="art-rotation"><option>0</option><option>90</option><option>180</option><option>270</option></select></label></div><p>Superficie calibrada al GLB: 113,7 unidades proyectadas. El original conserva 132. Revisar acabado y contactos.</p><a href="./tools/model-review.html" target="_blank" rel="noopener">Inspeccionar GLB y geometría</a><a href="?art-debug=true">Comparar con arte original</a>` : '<a href="?art-debug=true&pilot=tripo-desk">Abrir piloto Tripo (sin generar)</a>'}
    <fieldset><legend>Capas de revisión</legend>${[['axes','Ejes y grid'],['bounds','Límites de imagen'],['footprints','Footprints y pivots'],['shadows','Contactos'],['lights','Emisores y atmósfera']].map(([key,label]) => `<label><input type="checkbox" data-art-layer="${key}" checked> ${label}</label>`).join('')}</fieldset>
    <output id="art-readout"></output><p class="art-error" id="art-error" role="status"></p>
    <a href="./docs/ASSET_AUDIT.md" target="_blank" rel="noopener">Auditoría y limitaciones</a>
    </details>`;
  app.append(panel);
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  layer.id = 'art-overlay'; layer.setAttribute('viewBox', `0 0 ${SCENE.w} ${SCENE.h}`);
  layer.setAttribute('aria-hidden', 'true'); document.querySelector('#room-tilt').append(layer);
  const byId = id => panel.querySelector(`#art-${id}`);
  const enabled = key => panel.querySelector(`[data-art-layer="${key}"]`).checked;
  const guarded = fn => { try { fn(); byId('error').textContent = ''; } catch (error) { byId('error').textContent = error.message; } refresh(); };
  byId('size').value = engine.state.room.size;
  byId('size').addEventListener('change', () => guarded(() => resetGolden(byId('size').value)));
  byId('light').addEventListener('change', () => guarded(() => { engine.preference('lighting', byId('light').value); onChange(); }));
  byId('golden').addEventListener('click', () => guarded(() => resetGolden(engine.state.room.size)));
  byId('empty').addEventListener('click', () => guarded(() => { engine.debug('clear'); onChange(); }));
  byId('solo').addEventListener('click', () => guarded(() => {
    const item = CATALOG[byId('item').value];
    engine.debug('clear'); engine.debug('add', item.id);
    if (item.placement === 'surface') {
      engine.debug('add', 'desk');
      const host = engine.placeItem('desk', { gx: 1, gy: 1, rotation: 0 });
      engine.placeItem(item.id, { gx: 1, gy: 1, parentSurfaceId: host.key, surfaceSlot: 0, rotation: 0 });
    } else engine.placeItem(item.id, item.placement === 'wall' ? { wall: 'left', index: 1, rotation: 0 } : { gx: 1, gy: 1, rotation: 0 });
    onChange();
  }));
  byId('item').addEventListener('change', refresh);
  if (ART_PILOT) {
    byId('pilot-fixture').addEventListener('click', () => guarded(() => {
      engine.debug('clear'); engine.debug('add','desk'); engine.debug('add','mug');
      const host=engine.placeItem('desk',{gx:1,gy:1,rotation:0});
      engine.placeItem('mug',{gx:1,gy:1,parentSurfaceId:host.key,surfaceSlot:0});
      byId('item').value='desk';byId('rotation').value='0';onChange();
    }));
    byId('rotation').addEventListener('change', () => guarded(() => {
      const entry=Object.entries(engine.state.room.placed).find(([,p])=>p.item==='desk');
      if(!entry)throw new Error('Coloca primero el escritorio.');
      engine.moveItem(entry[0],{...entry[1],rotation:Number(byId('rotation').value)});onChange();
    }));
  }
  panel.querySelectorAll('[data-art-layer]').forEach(input => input.addEventListener('change', () => {
    app.classList.toggle('art-no-shadows', !enabled('shadows'));
    app.classList.toggle('art-no-lights', !enabled('lights'));
    room.toggleFootprints(enabled('footprints')); onChange(); refresh();
  }));

  function refresh() {
    const state = engine.state, cells = ROOM_SIZES[state.room.size].cells;
    byId('size').value = state.room.size; byId('light').value = state.preferences.lighting;
    const order = paintOrder({ placed: state.room.placed, cells }, CATALOG);
    const selected = byId('item').value, meta = ART_ASSETS[selected], item = CATALOG[selected];
    const placed = order.find(o => o.item.id === selected);
    const frame = objectAsset(selected,placed?.placement.rotation || 0);
    const matrix = `[[1,-1,0],[${CAMERA.tilt},${CAMERA.tilt},-1]]`;
    const text = [
      `Cámara raster heredada · ±${(Math.atan(CAMERA.tilt)*180/Math.PI).toFixed(3)}°`,
      `M ${matrix} · origen ${CAMERA.origin.x}, ${CAMERA.origin.y}`,
      `Celda ${CELL} · escena ${SCENE.w}×${SCENE.h}`,
      `${selected} · ${meta.representation} · ${meta.visualStatus}`,
      `Footprint ${item.w}×${item.h} · ancho ${frame.width.toFixed(1)} · pivot ${frame.pivot.x}, ${frame.pivot.y}`,
      `Altura de superficie ${geometryProfile(item).top.toFixed(2)}`,
      `Orientaciones reales: ${availableOrientations(selected).join(', ')}° · ${frame.candidate ? 'GLB renderizado, candidato' : 'material pintado'}`,
      `Sombra ${frame.shadowSrc ? 'render desde geometría, pase separado' : meta.shadowProfile+' (aproximado)'} · emisor ${meta.lightAnchor?.join(', ') || 'ninguno'}`,
      placed ? `Posición ${JSON.stringify(placed.placement)}` : 'Objeto seleccionado sin colocar',
      `${order.length} colocados · ${occupancy(state.room.placed, CATALOG).size} celdas ocupadas`,
      `Golden: ${GOLDEN_IDS.filter(id => order.some(o => o.item.id === id)).length}/5 candidatos`,
      'Cian: grid · amarillo: pivot · coral: imagen · verde: emisor',
      frame.candidate ? 'Piloto sin affine: cuatro renders geométricos.' : 'Arte heredado: comprobar axisFix en el manifiesto actual.',
      'Un residual bajo no aprueba la cámara ni el material.',
    ];
    byId('readout').textContent = text.join('\n');
    const parts = [];
    if (enabled('axes')) {
      for (let x=0; x<cells; x++) for (let y=0; y<cells; y++) parts.push(`<polygon class="art-cell" points="${cellPolygon(x,y)}"/>`);
      const o = project(0,0), x = project(CELL*2,0), y = project(0,CELL*2), z = project(0,0,CELL*2);
      for (const [name,p] of [['X',x],['Y',y],['Z',z]]) parts.push(`<path class="art-axis" d="M${o}L${p}"/><text x="${p[0]}" y="${p[1]-10}">${name}</text>`);
    }
    for (const {item,spot,placement} of order) {
      const asset = objectAsset(item.id,placement.rotation,placement.pose || 'idle');
      const x=spot.x/100*SCENE.w, y=spot.y/100*SCENE.h, w=asset.width, h=w/asset.aspect;
      if (enabled('bounds')) parts.push(`<rect class="art-bounds" x="${x-w*asset.pivot.x}" y="${y-h*asset.pivot.y}" width="${w}" height="${h}"/><text class="art-bound-label" x="${x-w*asset.pivot.x}" y="${y-h*asset.pivot.y-6}">${escapeHTML(item.id)}</text>`);
      const emitter = ART_ASSETS[item.id].lightAnchor;
      if (enabled('lights') && emitter) parts.push(`<circle class="art-emitter" cx="${x+(emitter[0]-asset.pivot.x)*w}" cy="${y+(emitter[1]-asset.pivot.y)*h}" r="6"/>`);
    }
    layer.innerHTML = parts.join('');
  }
  engine.subscribe(() => queueMicrotask(refresh));
  refresh();
  return { refresh };
}
