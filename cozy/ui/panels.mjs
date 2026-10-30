import { CATALOG, ITEMS, CATEGORIES, SETS, setProgress, GAME_CONFIG, ROOM_SIZES, QUESTS, ACHIEVEMENTS, roomLevel, DEBUG } from '../logic/config.mjs';
import { ownedIds } from '../logic/engine.mjs';
import { itemStatus } from '../logic/catalog.mjs';
import { COLLECTIONS, ITEM_GROUPS } from '../logic/collections.mjs';
import { escapeHTML as e, art, bookStyle, difficultyName, difficulties, icon, coin } from './helpers.mjs';

const titles = {
  tasks: ['UN PEQUEÑO PASO CADA VEZ', 'Tu cuaderno'], focus: ['HAZ ESPACIO PARA UNA SOLA COSA', 'Un rato de foco'],
  books: ['HISTORIAS QUE TE ACOMPAÑAN', 'Tu biblioteca'], shop: ['COSAS PARA TU RINCÓN', 'La tienda'],
  settings: ['QUE AQUÍ SE ESTÉ BIEN', 'A tu manera'], window: ['AL OTRO LADO DEL CRISTAL', 'El ambiente'],
  stats: ['LO QUE HAS IDO CULTIVANDO', 'Pequeños avances'], quests: ['SIN PRISA Y SIN RACHAS', 'Tu progreso'],
  debug: ['GUARDADO SEPARADO · SOLO PRUEBAS', 'Mesa de pruebas'],
};

export function createPanels(engine, room, audio, edit) {
  const dialog = document.querySelector('#world-panel'), content = document.querySelector('#panel-content');
  let current = '', selectedDuration = 25, selectedBook = null, shopFilter = 'Todo', editingTask = null, previousFocus, openTimer;
  let justCompleted = null, confirmAction = null;
  let shopCollection = 'all';
  const confirmation = document.querySelector('#confirmation');

  function feedback(html, error = false) {
    const el = document.querySelector('#panel-feedback'); el.innerHTML = html; el.classList.toggle('error', error);
  }
  function execute(action, success, renderAfter = true) {
    try { const result = action(); if (renderAfter && dialog.open) render(); if (success) feedback(`${success}${result?.reward ? ` +${result.reward} ${coin}` : ''}`); return result; }
    catch (error) { feedback(e(error.message), true); if (!dialog.open) room.reward(e(error.message)); return null; }
  }
  function confirm(title, copy, label, action) {
    document.querySelector('#confirm-title').textContent = title;
    document.querySelector('#confirm-copy').textContent = copy;
    document.querySelector('#confirm-yes').textContent = label;
    confirmAction = action; confirmation.showModal(); document.querySelector('#confirm-no').focus();
  }
  document.querySelector('#confirm-no').addEventListener('click', () => { confirmAction = null; confirmation.close(); });
  document.querySelector('#confirm-yes').addEventListener('click', () => { const action = confirmAction; confirmAction = null; confirmation.close(); action?.(); });
  confirmation.addEventListener('cancel', () => { confirmAction = null; });

  function open(name, source = document.activeElement) {
    if (!titles[name] || (name === 'debug' && !DEBUG)) return;
    clearTimeout(openTimer); previousFocus = source; current = name; editingTask = null;
    audio.play('page');
    render();
    if (dialog.open) return;
    openTimer = setTimeout(() => { dialog.showModal(); dialog.querySelector('.close-panel').focus(); },
      engine.state.preferences.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280);
  }
  function close() { clearTimeout(openTimer); if (dialog.open) dialog.close(); else current = ''; }
  dialog.addEventListener('close', () => { current = ''; previousFocus?.focus?.(); });
  dialog.querySelector('.close-panel').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });

  // ── Shop ──────────────────────────────────────────────────────────────────
  function shop(s) {
    const owned = ownedIds(s);
    const filters = ['Todo', ...Object.values(ITEM_GROUPS), 'Mi colección'];
    const list = ITEMS.filter(i => !i.starter).filter(i =>
      shopFilter === 'Todo' ? true : shopFilter === 'Mi colección' ? owned.includes(i.id) : ITEM_GROUPS[i.group] === shopFilter)
      .filter(i => shopCollection === 'all' || i.collection === shopCollection);
    return `<p class="panel-intro">Tu habitación crece con lo que haces. Esto es lo que puedes traerle.</p>
      <label class="collection-select">Colección <select data-collection aria-label="Colección"><option value="all">Todas las colecciones</option>${Object.entries(COLLECTIONS).map(([id,name])=>`<option value="${id}" ${id === shopCollection ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
      <div class="shop-tabs" role="group" aria-label="Tipos de objeto">${filters.map(f =>
        `<button data-action="filter" data-filter="${f}" aria-pressed="${f === shopFilter}">${f}</button>`).join('')}</div>
      <div class="shop-grid">${list.map(item => {
        const { stored: spare, placed, access } = itemStatus(s, item.id);
        const afford = access === 'AVAILABLE' && s.coins >= item.price;
        return `<article class="shop-item ${item.companion ? 'is-companion' : ''}">
          ${placed || spare ? `<span class="owned-label">${placed ? `${placed} EN LA HABITACIÓN` : `${spare} GUARDADO${spare > 1 ? 'S' : ''}`}</span>` : ''}
          <div class="shop-illustration">${art(item.id, item.name)}</div>
          <h3>${e(item.name)}</h3>
          <p class="item-collection">${COLLECTIONS[item.collection]}</p><p class="item-price">${item.w}×${item.h} · ${item.price} ${coin}</p>
          ${item.companion ? '<p class="companion-note">Tardarás en poder permitírtelo. Esa es la idea.</p>' : ''}
          <button class="${afford ? 'primary' : 'secondary'}" data-action="buy" data-id="${item.id}" ${afford ? '' : 'disabled'}>${access === 'LOCKED' ? 'Por descubrir' : `Comprar · ${item.price} ${coin}`}</button>
          ${spare ? `<button class="text-button" data-action="place" data-id="${item.id}">Colocar ahora ${icon('arrow')}</button>
            <button class="text-button" data-action="sell" data-id="${item.id}">Vender · ${Math.floor(item.price * GAME_CONFIG.resaleRate)} ${coin}</button>` : ''}
        </article>`;
      }).join('') || '<div class="empty-state collection-empty"><h3>Aquí no hay nada todavía.</h3></div>'}</div>
      <p class="quiet-note">Lo que vendas te devuelve el ${Math.round(GAME_CONFIG.resaleRate * 100)} % de su precio, así que puedes probar sin miedo.</p>`;
  }

  // ── Progress: room level, quests, collections, moments ────────────────────
  function quests(s) {
    const placedCount = Object.keys(s.room.placed).length;
    const level = roomLevel(placedCount);
    const owned = ownedIds(s);
    const comfort = Object.values(s.room.placed).reduce((n, p) => n + (CATALOG[p.item]?.comfort || 0), 0);
    const focusValue = Object.values(s.room.placed).reduce((n, p) => n + (CATALOG[p.item]?.focus || 0), 0);
    return `<p class="panel-intro">Nada de esto caduca. Si hoy no te apetece, no pasa nada.</p>
      <div class="level-card">
        <span class="eyebrow">TU HABITACIÓN</span>
        <strong>${e(level.name)}</strong>
        <p>${placedCount} objetos colocados · ${ROOM_SIZES[s.room.size].name}</p>
        <div class="values"><span>Confort <b>${comfort}</b></span><span>Concentración <b>${focusValue}</b></span></div>
      </div>
      <h3 class="section-head">Propuestas</h3>
      <ul class="quest-list">${QUESTS.map(q => {
        const done = s.quests.includes(q.id), ready = !done && q.check(s);
        return `<li class="quest ${done ? 'done' : ''}">
          <span class="quest-mark">${done ? icon('check') : ''}</span>
          <span class="quest-name">${e(q.name)}</span>
          ${done ? '<span class="quest-reward">Recogida</span>'
            : ready ? `<button class="primary" data-action="claim" data-id="${q.id}">Recoger · ${q.reward} ${coin}</button>`
            : `<span class="quest-reward">${q.reward} ${coin}</span>`}</li>`;
      }).join('')}</ul>
      <h3 class="section-head">Colecciones</h3>
      <div class="set-list">${Object.entries(SETS).map(([id, set]) => {
        const p = setProgress(id, owned);
        return `<div class="set ${p.have === p.total ? 'complete' : ''}">
          <strong>${e(set.name)}</strong><span>${p.have} / ${p.total}</span>
          <small>${p.have === p.total ? 'Completa' : e(set.bonus)}</small></div>`;
      }).join('')}</div>
      <h3 class="section-head">Momentos</h3>
      <div class="badge-list">${ACHIEVEMENTS.map(a => {
        const got = s.achievements.includes(a.id);
        return `<div class="badge ${got ? 'got' : ''}"><b>${e(a.name)}</b><small>${got ? 'Conseguido' : e(a.hint)}</small></div>`;
      }).join('')}</div>`;
  }

  // ── Productivity panels ───────────────────────────────────────────────────
  function tasks(s) {
    return `<p class="panel-intro">No hace falta hacerlo todo. Solo empezar por algo.</p>
      <form id="task-form" class="task-form"><div class="form-row"><label>¿Qué tienes entre manos?<input name="title" maxlength="180" placeholder="Un pequeño paso para hoy…" required autocomplete="off"></label><label>Tamaño<select name="difficulty">${difficulties('medium')}</select></label><button class="primary" type="submit">Añadir</button></div></form>
      ${s.tasks.length ? `<ul class="task-list">${s.tasks.map(t => editingTask === t.id ? `<li class="task-row"><form class="edit-task-form" data-id="${t.id}"><label>Editar tarea<input name="title" value="${e(t.title)}" maxlength="180" required></label><div class="form-row"><label>Tamaño<select name="difficulty">${difficulties(t.difficulty)}</select></label><button class="primary">Guardar</button><button type="button" class="text-button" data-action="cancel-edit">Cancelar</button></div></form></li>` : `<li class="task-row ${t.completed ? 'done' : ''}${justCompleted === t.id ? ' just-done' : ''}"><button class="task-check" data-action="complete-task" data-id="${t.id}" aria-label="${t.completed ? 'Completada' : 'Completar'}: ${e(t.title)}" ${t.completed ? 'disabled' : ''}>${t.completed ? icon('check') : ''}</button><div class="task-body"><span class="task-title">${e(t.title)}</span><span class="task-meta">${difficultyName[t.difficulty]}${t.completed ? ' · Ya tiene su recompensa' : ''}</span></div><span class="task-reward">${t.completed ? icon('check') : `+${GAME_CONFIG.rewards.tasks[t.difficulty]} ${coin}`}</span>${!t.completed ? `<button class="text-button" data-action="edit-task" data-id="${t.id}" aria-label="Editar: ${e(t.title)}">Editar</button>` : ''}<button class="text-button" data-action="delete-task" data-id="${t.id}" aria-label="Eliminar: ${e(t.title)}">${icon('close')}</button></li>`).join('')}</ul>` : `<div class="empty-state"><span>${icon('journal')}</span><h3>Una página en blanco.</h3><p>Una idea pequeña también cuenta.</p></div>`}`;
  }
  function focus(s) {
    return `<p class="panel-intro">Prepara tu té. Elige un rato. El resto puede esperar.</p>${DEBUG ? '<p class="debug-note">Prueba acelerada: 1 minuto = 1 segundo.</p>' : ''}<div class="focus-options" role="group" aria-label="Duración">${GAME_CONFIG.focusDurations.map(d => `<button class="duration-option" data-action="duration" data-duration="${d}" aria-pressed="${d === selectedDuration}"><strong>${d}</strong><span>minutos</span><span>+${GAME_CONFIG.rewards.focus[d]} ${coin}</span></button>`).join('')}</div><button class="primary focus-start" data-action="start-focus">Empezar mi rato de ${selectedDuration} minutos</button><p class="quiet-note">La sesión sigue si recargas. Si terminas antes, no ganas monedas.</p><p class="quiet-note">${s.focusHistory.length ? `${s.focusHistory.length} ratitos guardados.` : 'Tu primera sesión empieza cuando quieras.'}</p>`;
  }
  function books(s) {
    const b = s.books.find(b => b.id === selectedBook);
    const progress = b ? Math.round(b.currentPage / b.totalPages * 100) : 0;
    return `<p class="panel-intro">Un estante para cada historia. Sin fechas de entrega.</p>
      ${s.books.length ? `<div class="book-shelf" aria-label="Tus libros">${s.books.map(book => `<button class="book-spine ${book.completed ? 'completed' : ''}" data-action="select-book" data-id="${book.id}" style="${bookStyle(book.title)}" aria-label="Abrir ${e(book.title)}, ${Math.round(book.currentPage / book.totalPages * 100)}% leído"><span>${e(book.title)}</span>${book.completed ? `<b class="spine-mark">${coin}</b>` : ''}</button>`).join('')}</div>` : `<div class="empty-state"><span>${icon('book')}</span><h3>Aquí caben muchas historias.</h3><p>Añade el libro que te acompaña.</p></div>`}
      ${b ? `<section class="book-detail"><h3>${e(b.title)} ${b.completed ? coin : ''}</h3><p class="author">${e(b.author || 'Autor sin indicar')}</p><div class="book-progress" role="progressbar" aria-label="Progreso" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div><p class="page-info">Página ${b.currentPage} de ${b.totalPages} · ${progress}%${b.rewardClaimed ? ' · Recompensa recibida' : ` · +${GAME_CONFIG.rewards.book} ${coin} al terminar`}</p><form id="book-progress-form" data-id="${b.id}"><div class="form-row"><label>Página actual<input type="number" name="page" min="0" max="${b.totalPages}" value="${b.currentPage}" required></label><button class="secondary">Guardar página</button>${!b.completed ? `<button type="button" class="text-button" data-action="finish-book" data-id="${b.id}">Ya lo he terminado</button>` : ''}</div></form><button class="text-button delete-book" data-action="delete-book" data-id="${b.id}">Retirar de la biblioteca</button></section>` : s.books.length ? '<p class="quiet-note">Elige un lomo para abrir su marcapáginas.</p>' : ''}
      <form id="book-form" class="book-add"><h3>Una historia nueva</h3><div class="form-row"><label>Título<input name="title" maxlength="180" placeholder="El libro que estás leyendo" required></label><label>Autor/a<input name="author" maxlength="100" placeholder="Opcional"></label></div><div class="form-row"><label>Páginas totales<input type="number" name="total" min="1" max="100000" placeholder="240" required></label><label>Voy por la página<input type="number" name="page" min="0" value="0" required></label><button class="primary">Añadir libro</button></div></form>`;
  }
  function atmosphere(s) {
    return `<div class="setting-row"><label for="lighting-setting">Luz de la habitación</label><select id="lighting-setting" data-pref="lighting">${Object.entries({ auto: 'Según la hora', morning: 'Mañana', day: 'Día', sunset: 'Atardecer', night: 'Noche' }).map(([value, label]) => `<option value="${value}" ${value === s.preferences.lighting ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="setting-row"><label for="weather-setting">Al otro lado de la ventana</label><select id="weather-setting" data-pref="weather"><option value="clear" ${s.preferences.weather === 'clear' ? 'selected' : ''}>Despejado</option><option value="rain" ${s.preferences.weather === 'rain' ? 'selected' : ''}>Lluvia suave</option></select></div>`;
  }
  function settings(s) {
    return `<p class="panel-intro">Tu rincón, tus pequeñas preferencias.</p>
      <div class="setting-row"><div><strong>Cozy City · La primera isla</strong><p class="quiet-note">Pasea entre jardines y cascadas, visita el banco y contempla cómo cambia la luz.</p></div><a class="pill-button" href="./city/">Visitar ciudad</a></div>
      <div class="setting-row"><div><strong>Oak Studio · 3D</strong><p class="quiet-note">Prueba la colocación libre y diseña una habitación. Boceto independiente de tu partida.</p></div><a class="pill-button" href="./studio/">Abrir estudio</a></div>
      <div class="setting-row"><label for="sound-setting">Sonido</label><input id="sound-setting" type="checkbox" data-pref="sound" ${s.preferences.sound ? 'checked' : ''}></div>
      <div class="setting-row"><label for="ambient-setting">Volumen del ambiente</label><input id="ambient-setting" type="range" data-pref="ambient" min="0" max="100" value="${s.preferences.ambient}" aria-valuetext="${s.preferences.ambient}%"></div>
      <div class="setting-row"><label for="motion-setting">Reducir movimiento</label><input id="motion-setting" type="checkbox" data-pref="reduceMotion" ${s.preferences.reduceMotion ? 'checked' : ''}></div>
      ${atmosphere(s)}
      <h3 class="section-head">El tamaño de la habitación</h3>
      <div class="size-choice compact" role="radiogroup" aria-label="Tamaño">${Object.values(ROOM_SIZES).map(size => `<button role="radio" aria-checked="${size.id === s.room.size}" data-action="resize" data-size="${size.id}" ${size.id === s.room.size || size.price <= s.coins ? '' : 'disabled'}><strong>${size.name}</strong><span>${size.cells}×${size.cells}</span><span>${size.id === s.room.size ? 'Actual' : `${size.price} ${coin}`}</span></button>`).join('')}</div>
      <p class="quiet-note">Si eliges una más pequeña, lo que no quepa vuelve a tus cosas guardadas. No se pierde nada.</p>
      <div class="settings-danger"><button class="danger-button" data-action="reset">Empezar de nuevo</button><p>Tu progreso vive solo en este navegador. No se envía nada a ningún servidor.</p></div>
      ${DEBUG ? `<button class="text-button" data-open="debug">Abrir mesa de pruebas ${icon('arrow')}</button>` : ''}`;
  }
  function stats(s) {
    return `<p class="panel-intro">No hay un ritmo correcto. Esto es lo que has hecho a tu manera.</p><div class="stats-list"><div><strong>${s.tasks.filter(t => t.completed).length}</strong><span>Tareas completadas</span></div><div><strong>${s.focusHistory.reduce((sum, f) => sum + f.duration, 0)}</strong><span>Minutos de concentración</span></div><div><strong>${s.books.filter(b => b.completed).length}</strong><span>Libros terminados</span></div></div><p class="quiet-note">Has puesto ${s.stats.spent} monedas en tu habitación y has movido cosas ${s.stats.moves} veces.</p><div class="form-actions"><button class="secondary" data-open="quests">Tu progreso</button><button class="primary" data-open="shop">Abrir la tienda ${icon('arrow')}</button></div>`;
  }
  function debug(s) {
    return `<p class="debug-note">Almacenamiento separado. Nada de esto toca tu progreso normal.</p>
      <div class="shortcut-list">${[['coins', '+250'], ['rich', '+2000'], ['zero', 'Sin monedas'], ['unlock', 'Desbloquear todo'], ['clear', 'Vaciar habitación'], ['resetSetup', 'Repetir el inicio'], ['finish', 'Completar focus']].map(([a, label]) => `<button class="secondary" data-action="debug" data-debug="${a}">${label}</button>`).join('')}</div>
      <div class="shortcut-list">${Object.values(ROOM_SIZES).map(size => `<button class="secondary" data-action="debug" data-debug="size" data-value="${size.id}">Tamaño ${size.name}</button>`).join('')}</div>
      <label class="collection-select">Añadir objeto<select id="debug-item">${ITEMS.map(i=>`<option value="${i.id}">${e(i.name)}</option>`).join('')}</select></label>
      <div class="shortcut-list"><button class="secondary" data-action="debug-add">Añadir al inventario</button><button class="secondary" data-action="debug-build">Ver grid y probar arrastre</button><button class="secondary" data-action="debug-pets">Probar compañeros</button></div>
      <div class="debug-placed">${Object.entries(s.room.placed).map(([key,p])=>`<button class="text-button" data-action="debug-store" data-id="${key}">Guardar ${e(CATALOG[p.item].name)}</button>`).join('')}</div>
      ${atmosphere(s)}<div class="form-actions"><button class="danger-button" data-action="reset">Reiniciar pruebas</button></div>`;
  }

  function render() {
    if (!titles[current]) return;
    const s = engine.state;
    dialog.dataset.panel = current;
    document.querySelector('#panel-kicker').textContent = titles[current][0];
    document.querySelector('#panel-title').textContent = titles[current][1];
    document.querySelector('#panel-page').textContent = current === 'shop' ? `Tu bolsillo: ${s.coins}` : 'Un espacio para lo que importa.';
    content.innerHTML = ({ tasks, focus, books, shop, settings, stats, quests, debug,
      window: s => `<p class="panel-intro">Deja que la luz cambie. O quédate en tu hora favorita.</p>${atmosphere(s)}` })[current](s);
    feedback('');
  }

  content.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target, data = new FormData(form);
    if (form.id === 'task-form') {
      if (execute(() => engine.addTask(data.get('title'), data.get('difficulty')), 'Un paso anotado.')) content.querySelector('[name=title]').focus();
    } else if (form.classList.contains('edit-task-form')) {
      execute(() => { const r = engine.editTask(form.dataset.id, data.get('title'), data.get('difficulty')); editingTask = null; return r; }, 'Tarea actualizada.');
    } else if (form.id === 'book-form') {
      execute(() => { const r = engine.addBook(data.get('title'), data.get('author'), data.get('total'), data.get('page')); selectedBook = r.id; return r; }, 'Una historia más en tu estante.');
    } else if (form.id === 'book-progress-form') execute(() => engine.updateBook(form.dataset.id, data.get('page')), 'Marcapáginas actualizado.');
  });

  content.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('[data-collection]')) { shopCollection = input.value; render(); content.querySelector('[data-collection]').focus(); return; }
    if (!input.dataset.pref) return;
    const value = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
    execute(() => engine.preference(input.dataset.pref, value), 'Así se queda.', false);
    if (input.type === 'range') input.setAttribute('aria-valuetext', `${value}%`);
    audio.unlock();
  });

  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'complete-task') { justCompleted = id; execute(() => engine.completeTask(id), 'Un pequeño paso, hecho.'); justCompleted = null; }
    if (action === 'delete-task') confirm('¿Retirar esta tarea?', 'Se eliminará del cuaderno. Las monedas ganadas se conservan.', 'Retirar tarea', () => execute(() => engine.deleteTask(id), 'Tarea retirada.'));
    if (action === 'edit-task') { editingTask = id; render(); content.querySelector('.edit-task-form input').focus(); }
    if (action === 'cancel-edit') { editingTask = null; render(); }
    if (action === 'duration') { selectedDuration = Number(button.dataset.duration); render(); content.querySelector(`[data-duration="${selectedDuration}"]`).focus(); }
    if (action === 'start-focus' && execute(() => engine.startFocus(selectedDuration), '', false)) { close(); document.querySelector('#focus-cancel').focus(); }
    if (action === 'select-book') { selectedBook = id; render(); content.querySelector('#book-progress-form input')?.focus(); }
    if (action === 'finish-book') execute(() => engine.updateBook(id, engine.state.books.find(b => b.id === id).totalPages), 'Una historia terminada.');
    if (action === 'delete-book') confirm('¿Retirar este libro?', 'Desaparecerá del estante. Las monedas ganadas se conservan.', 'Retirar libro', () => execute(() => { const r = engine.deleteBook(id); selectedBook = null; return r; }, 'Libro retirado.'));
    if (action === 'filter') { shopFilter = button.dataset.filter; render(); content.querySelector(`[data-filter="${shopFilter}"]`)?.focus(); }
    if (action === 'buy' && execute(() => engine.buyItem(id), 'Ya es tuyo. Colócalo ahora o guárdalo para después.'))
      content.querySelector(`[data-action="place"][data-id="${id}"]`)?.focus();
    if (action === 'sell') confirm('¿Vender este objeto?', `Te devolverá ${Math.floor(CATALOG[id].price * GAME_CONFIG.resaleRate)} monedas. Puedes volver a comprarlo cuando quieras.`, 'Vender', () => execute(() => engine.sellItem(id), 'Vendido.'));
    // Placing happens in the room, so the catalogue gets out of the way first.
    if (action === 'place') { close(); edit?.startPlacement(id); }
    if (action === 'claim') execute(() => engine.claimQuest(id), '¡Recogida!');
    if (action === 'resize') {
      const size = button.dataset.size;
      confirm('¿Cambiar el tamaño?', `${ROOM_SIZES[size].name}: ${ROOM_SIZES[size].cells}×${ROOM_SIZES[size].cells}. Lo que no quepa volverá a tus cosas guardadas.`, 'Cambiar', () => execute(() => engine.chooseSize(size), 'Tu habitación ha cambiado.'));
    }
    if (action === 'reset') confirm('¿Empezar de nuevo?', 'Se borrarán tus tareas, libros, monedas y toda la habitación. No se puede deshacer.', 'Borrar mi progreso', () => { if (execute(() => engine.reset(), '', false)) { selectedBook = null; close(); location.reload(); } });
    if (action === 'debug' && DEBUG) execute(() => { const r = engine.debug(button.dataset.debug, button.dataset.value); engine.completeFocus(); return r; }, 'Prueba aplicada.');
    if (action === 'debug-add' && DEBUG) execute(() => engine.debug('add', content.querySelector('#debug-item').value), 'Objeto añadido.');
    if (action === 'debug-store' && DEBUG) execute(() => engine.storeItem(id), 'Objeto guardado.');
    if (action === 'debug-build' && DEBUG) { close(); edit.open(); }
    if (action === 'debug-pets' && DEBUG) { engine.debug('pets'); close(); edit.open(); }
  });

  return { open, close, render, confirm, execute, get current() { return current; } };
}
