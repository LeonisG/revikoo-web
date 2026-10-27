import { CATALOG, SLOTS, GAME_CONFIG, DEBUG } from '../logic/config.mjs';
import { escapeHTML as e, art, bookStyle, difficultyName, difficulties, icon, coin } from './helpers.mjs';

const titles = {
  tasks: ['UN PEQUEÑO PASO CADA VEZ', 'Tu cuaderno'], focus: ['HAZ ESPACIO PARA UNA SOLA COSA', 'Un rato de foco'],
  books: ['HISTORIAS QUE TE ACOMPAÑAN', 'Tu biblioteca'], shop: ['COSAS SENCILLAS, UN LUGAR TUYO', 'El pequeño catálogo'],
  settings: ['QUE AQUÍ SE ESTÉ BIEN', 'A tu manera'], window: ['AL OTRO LADO DEL CRISTAL', 'El ambiente'],
  stats: ['LO QUE HAS IDO CULTIVANDO', 'Pequeños avances'], debug: ['GUARDADO SEPARADO · SOLO PRUEBAS', 'Mesa de pruebas'],
};

export function createPanels(engine, room, audio) {
  const dialog = document.querySelector('#world-panel'), content = document.querySelector('#panel-content');
  let current = '', selectedDuration = 25, selectedBook = null, shopFilter = 'Todo', editingTask = null, previousFocus, openTimer;
  // Only the row that was just ticked animates; re-rendering the list must not
  // replay the completion of every task the user has ever finished.
  let justCompleted = null;
  let confirmAction = null;
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
    room.view(name === 'books' ? 'books' : name === 'shop' ? 'shop' : name === 'window' || name === 'settings' ? 'window' : 'desk');
    render();
    if (dialog.open) return;
    openTimer = setTimeout(() => { dialog.showModal(); dialog.querySelector('.close-panel').focus(); }, engine.state.preferences.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
  }
  function close() { clearTimeout(openTimer); if (dialog.open) dialog.close(); else { current = ''; room.view('room'); } }
  dialog.addEventListener('close', () => { current = ''; room.view('room'); previousFocus?.focus?.(); });
  dialog.querySelector('.close-panel').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });

  // Choosing a corner happens in the room itself, so the catalogue gets out of
  // the way first and the object arrives where the user is already looking.
  function startPlacing(id) {
    const item = CATALOG.find(i => i.id === id);
    if (!item) return;
    previousFocus = null; close();
    room.place(item, slot => {
      const previous = engine.state.room.slots[slot];
      if (execute(() => engine.equipItem(id, slot), '', false)) {
        room.reward(previous && previous !== id
          ? `${item.name} ya está en su sitio. Lo que había vuelve a tu colección.`
          : `${item.name} ya está en su sitio.`);
      }
    });
  }

  function tasks(s) {
    return `<p class="panel-intro">No hace falta hacerlo todo. Solo empezar por algo.</p>
      <form id="task-form" class="task-form"><div class="form-row"><label>¿Qué tienes entre manos?<input name="title" maxlength="180" placeholder="Un pequeño paso para hoy…" required autocomplete="off"></label><label>Tamaño<select name="difficulty">${difficulties('medium')}</select></label><button class="primary" type="submit">Añadir</button></div></form>
      ${s.tasks.length ? `<ul class="task-list">${s.tasks.map(t => editingTask === t.id ? `<li class="task-row"><form class="edit-task-form" data-id="${t.id}"><label>Editar tarea<input name="title" value="${e(t.title)}" maxlength="180" required></label><div class="form-row"><label>Tamaño<select name="difficulty">${difficulties(t.difficulty)}</select></label><button class="primary">Guardar</button><button type="button" class="text-button" data-action="cancel-edit">Cancelar</button></div></form></li>` : `<li class="task-row ${t.completed ? 'done' : ''}${justCompleted === t.id ? ' just-done' : ''}"><button class="task-check" data-action="complete-task" data-id="${t.id}" aria-label="${t.completed ? 'Completada' : 'Completar'}: ${e(t.title)}" ${t.completed ? 'disabled' : ''}>${t.completed ? icon('check') : ''}</button><div class="task-body"><span class="task-title">${e(t.title)}</span><span class="task-meta">${difficultyName[t.difficulty]}${t.completed ? ' · Ya tiene su recompensa' : ''}</span></div><span class="task-reward">${t.completed ? icon('check') : `+${GAME_CONFIG.rewards.tasks[t.difficulty]} ${coin}`}</span>${!t.completed ? `<button class="text-button" data-action="edit-task" data-id="${t.id}" aria-label="Editar: ${e(t.title)}">Editar</button>` : ''}<button class="text-button" data-action="delete-task" data-id="${t.id}" aria-label="Eliminar: ${e(t.title)}">${icon('close')}</button></li>`).join('')}</ul>` : `<div class="empty-state"><span>${icon('journal')}</span><h3>Una página en blanco.</h3><p>Una idea pequeña también cuenta.</p></div><div class="optional-start"><span>SI TE APETECE, EMPIEZA AQUÍ</span><button data-action="first-task">${icon('arrow')} Añade tu primera tarea</button><button data-open="focus">${icon('arrow')} Prepara tu primera sesión de foco</button></div>`}`;
  }
  function focus(s) {
    return `<p class="panel-intro">Prepara tu té. Elige un rato. El resto puede esperar.</p>${DEBUG ? '<p class="debug-note">Prueba acelerada: 1 minuto = 1 segundo. Progreso separado de tu habitación real.</p>' : ''}<div class="focus-options" role="group" aria-label="Duración de concentración">${GAME_CONFIG.focusDurations.map(d => `<button class="duration-option" data-action="duration" data-duration="${d}" aria-pressed="${d === selectedDuration}"><strong>${d}</strong><span>minutos</span><span>+${GAME_CONFIG.rewards.focus[d]} ${coin}</span></button>`).join('')}</div><button class="primary focus-start" data-action="start-focus">Empezar mi rato de ${selectedDuration} minutos</button><p class="quiet-note">La sesión sigue si recargas o cierras esta pestaña. Si terminas antes, no ganas monedas. Puedes volver a intentarlo cuando te venga bien.</p><p class="quiet-note">${s.focusHistory.length ? `${s.focusHistory.length} ratitos de concentración guardados.` : 'Tu primera sesión empieza cuando tú quieras.'}</p>`;
  }
  function books(s) {
    const b = s.books.find(b => b.id === selectedBook);
    const progress = b ? Math.round(b.currentPage / b.totalPages * 100) : 0;
    return `<p class="panel-intro">Un estante para cada historia. Sin fechas de entrega.</p>
      ${s.books.length ? `<div class="book-shelf" aria-label="Tus libros">${s.books.map(book => `<button class="book-spine ${book.completed ? 'completed' : ''}" data-action="select-book" data-id="${book.id}" style="${bookStyle(book.title)}" aria-label="Abrir ${e(book.title)}, ${Math.round(book.currentPage / book.totalPages * 100)}% leído"><span>${e(book.title)}</span>${book.completed ? `<b class="spine-mark">${coin}</b>` : ''}</button>`).join('')}</div>` : `<div class="empty-state"><span>${icon('book')}</span><h3>Aquí caben muchas historias.</h3><p>Añade el libro que te está acompañando.</p></div>`}
      ${b ? `<section class="book-detail"><h3>${e(b.title)} ${b.completed ? coin : ''}</h3><p class="author">${e(b.author || 'Autor sin indicar')}</p><div class="book-progress" role="progressbar" aria-label="Progreso de lectura" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div><p class="page-info">Página ${b.currentPage} de ${b.totalPages} · ${progress}%${b.rewardClaimed ? ' · Recompensa recibida' : ` · +${GAME_CONFIG.rewards.book} ${coin} al terminar`}</p><form id="book-progress-form" data-id="${b.id}"><div class="form-row"><label>Página actual<input type="number" name="page" min="0" max="${b.totalPages}" value="${b.currentPage}" required></label><button class="secondary">Guardar página</button>${!b.completed ? `<button type="button" class="text-button" data-action="finish-book" data-id="${b.id}">Ya lo he terminado</button>` : ''}</div></form><button class="text-button delete-book" data-action="delete-book" data-id="${b.id}">Retirar de la biblioteca</button></section>` : s.books.length ? '<p class="quiet-note">Elige un lomo para abrir su marcapáginas.</p>' : ''}
      <form id="book-form" class="book-add"><h3>Una historia nueva</h3><div class="form-row"><label>Título<input name="title" maxlength="180" placeholder="El libro que estás leyendo" required></label><label>Autor/a<input name="author" maxlength="100" placeholder="Opcional"></label></div><div class="form-row"><label>Páginas totales<input type="number" name="total" min="1" max="100000" placeholder="240" required></label><label>Voy por la página<input type="number" name="page" min="0" value="0" required></label><button class="primary">Añadir libro</button></div></form>`;
  }
  function shop(s) {
    const filters = ['Todo', 'Plantas', 'Lámparas', 'Alfombras', 'Objetos', 'Pared', 'Mi colección'];
    const items = CATALOG.filter(i => shopFilter === 'Todo' || (shopFilter === 'Mi colección' ? s.inventory.includes(i.id) : i.category === shopFilter));
    return `<p class="panel-intro">Pequeñas cosas que convierten un lugar en tu lugar.</p><div class="shop-tabs" role="group" aria-label="Categorías del catálogo">${filters.map(f => `<button data-action="filter" data-filter="${f}" aria-pressed="${f === shopFilter}">${f}</button>`).join('')}</div><div class="shop-grid">${items.map(i => {
      const owned = s.inventory.includes(i.id), equipped = Object.entries(s.room.slots).find(([, id]) => id === i.id)?.[0];
      return `<article class="shop-item">${owned ? `<span class="owned-label">${equipped ? 'EN TU HABITACIÓN' : 'EN TU COLECCIÓN'}</span>` : ''}<div class="shop-illustration">${art(i.asset, i.name)}</div><h3>${i.name}</h3><p class="item-price">${owned ? equipped ? SLOTS[equipped].name : 'Listo para encontrar su rincón' : `${i.price} ${coin}`}</p>${!owned ? `<button class="secondary" data-action="buy" data-id="${i.id}">Comprar · ${i.price} ${coin}</button>` : `<button class="primary" data-action="place" data-id="${i.id}">${equipped ? 'Cambiar de sitio' : 'Colocar en la habitación'}</button>${equipped ? `<button class="text-button" data-action="unequip" data-id="${i.id}">Guardar en la colección</button>` : ''}`}</article>`;
    }).join('') || `<div class="empty-state collection-empty"><h3>Tu colección empieza aquí.</h3><p>Hay ${GAME_CONFIG.initialCoins} ${coin} de bienvenida para tu primer detalle.</p></div>`}</div><p class="quiet-note">Cada objeto es tuyo para siempre. Cambiar un rincón devuelve el objeto anterior a tu colección.</p>`;
  }
  function atmosphere(s) {
    return `<div class="setting-row"><label for="lighting-setting">Luz de la habitación</label><select id="lighting-setting" data-pref="lighting">${Object.entries({ auto: 'Según la hora', morning: 'Mañana', day: 'Día', sunset: 'Atardecer', night: 'Noche' }).map(([value, label]) => `<option value="${value}" ${value === s.preferences.lighting ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="setting-row"><label for="weather-setting">Al otro lado de la ventana</label><select id="weather-setting" data-pref="weather"><option value="clear" ${s.preferences.weather === 'clear' ? 'selected' : ''}>Despejado</option><option value="rain" ${s.preferences.weather === 'rain' ? 'selected' : ''}>Lluvia suave</option></select></div>`;
  }
  function settings(s) {
    return `<p class="panel-intro">Tu rincón, tus pequeñas preferencias.</p><div class="setting-row"><label for="sound-setting">Sonido</label><input id="sound-setting" type="checkbox" data-pref="sound" ${s.preferences.sound ? 'checked' : ''}></div><div class="setting-row"><label for="ambient-setting">Volumen del ambiente</label><input id="ambient-setting" type="range" data-pref="ambient" min="0" max="100" value="${s.preferences.ambient}" aria-valuetext="${s.preferences.ambient}%"></div><div class="setting-row music-placeholder"><span>Música</span><span>Sin música en esta versión</span></div><div class="setting-row"><label for="motion-setting">Reducir movimiento</label><input id="motion-setting" type="checkbox" data-pref="reduceMotion" ${s.preferences.reduceMotion ? 'checked' : ''}></div>${atmosphere(s)}<p class="quiet-note">Se respeta también la preferencia de movimiento de tu dispositivo. El sonido solo se inicia después de que interactúes.</p><div class="settings-danger"><button class="danger-button" data-action="reset">Empezar de nuevo</button><p>Tu progreso vive solo en este navegador. Borrar los datos del sitio elimina tu habitación. No se envía información a ningún servidor.</p></div>${DEBUG ? `<button class="text-button" data-open="debug">Abrir mesa de pruebas ${icon('arrow')}</button>` : ''}`;
  }
  function stats(s) {
    return `<p class="panel-intro">No hay un ritmo correcto. Esto es lo que has hecho a tu manera.</p><div class="stats-list"><div><strong>${s.tasks.filter(t => t.completed).length}</strong><span>Tareas en tu cuaderno completadas</span></div><div><strong>${s.focusHistory.reduce((sum, f) => sum + f.duration, 0)}</strong><span>Minutos de concentración${DEBUG ? ' simulados' : ''}</span></div><div><strong>${s.books.filter(b => b.completed).length}</strong><span>Libros terminados en tu biblioteca</span></div></div><p class="quiet-note">${s.inventory.length} objetos forman parte de tu colección. Puedes cambiar su lugar cuando quieras.</p><div class="form-actions"><button class="secondary" data-open="settings">Preferencias</button><button class="primary" data-open="shop">Abrir el catálogo ${icon('arrow')}</button></div>`;
  }
  function debug(s) {
    return `<p class="debug-note">Esta habitación de pruebas usa su propio almacenamiento. Ninguna acción modifica el progreso normal.</p><div class="shortcut-list"><button class="secondary" data-action="debug" data-debug="coins">+100 ${coin}</button><button class="secondary" data-action="debug" data-debug="zero">Monedas a cero</button><button class="secondary" data-action="debug" data-debug="unlock">Desbloquear colección</button><button class="secondary" data-action="debug" data-debug="finish">Completar focus activo</button></div>${atmosphere(s)}<div class="form-actions"><button class="danger-button" data-action="reset">Reiniciar pruebas</button><button class="primary" data-open="focus">Probar focus acelerado</button></div>`;
  }
  function render() {
    if (!titles[current]) return;
    const s = engine.state;
    dialog.dataset.panel = current;
    document.querySelector('#panel-kicker').textContent = titles[current][0];
    document.querySelector('#panel-title').textContent = titles[current][1];
    document.querySelector('#panel-page').textContent = current === 'shop' ? `Tu bolsillo: ${s.coins} ${coin}` : 'Un espacio para lo que importa.';
    content.innerHTML = ({ tasks, focus, books, shop, settings, stats, debug, window: s => `<p class="panel-intro">Deja que la luz cambie. O quédate un poco más en tu hora favorita.</p>${atmosphere(s)}<p class="quiet-note">Sin previsiones ni pronósticos. Aquí eliges tú.</p><button class="text-button" data-open="settings">Ajustar el sonido del ambiente ${icon('arrow')}</button>` })[current](s);
    feedback('');
  }
  content.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target, data = new FormData(form);
    if (form.id === 'task-form') {
      if (execute(() => engine.addTask(data.get('title'), data.get('difficulty')), 'Un paso anotado. Cuando esté hecho, márcalo.')) content.querySelector('[name=title]').focus();
    } else if (form.classList.contains('edit-task-form')) {
      execute(() => { const result = engine.editTask(form.dataset.id, data.get('title'), data.get('difficulty')); editingTask = null; return result; }, 'Tarea actualizada.');
    } else if (form.id === 'book-form') {
      execute(() => { const result = engine.addBook(data.get('title'), data.get('author'), data.get('total'), data.get('page')); selectedBook = result.id; return result; }, 'Una historia más en tu estante.');
    } else if (form.id === 'book-progress-form') execute(() => engine.updateBook(form.dataset.id, data.get('page')), 'Marcapáginas actualizado.');
  });
  content.addEventListener('change', event => {
    const input = event.target;
    if (input.dataset.pref) {
      const value = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
      execute(() => engine.preference(input.dataset.pref, value), 'Así se queda.', false);
      if (input.type === 'range') input.setAttribute('aria-valuetext', `${value}%`);
      audio.unlock();
    }
  });
  content.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'complete-task') { justCompleted = id; execute(() => engine.completeTask(id), 'Un pequeño paso, hecho.'); justCompleted = null; }
    if (action === 'delete-task') confirm('¿Retirar esta tarea?', 'Se eliminará del cuaderno. Las monedas que hayas ganado se conservan.', 'Retirar tarea', () => execute(() => engine.deleteTask(id), 'Tarea retirada.'));
    if (action === 'edit-task') { editingTask = id; render(); content.querySelector('.edit-task-form input').focus(); }
    if (action === 'cancel-edit') { editingTask = null; render(); }
    if (action === 'first-task') content.querySelector('#task-form input').focus();
    if (action === 'duration') { selectedDuration = Number(button.dataset.duration); render(); content.querySelector(`[data-duration="${selectedDuration}"]`).focus(); }
    if (action === 'start-focus') {
      if (execute(() => engine.startFocus(selectedDuration), '', false)) { close(); room.view('room'); document.querySelector('#focus-cancel').focus(); }
    }
    if (action === 'select-book') { selectedBook = id; render(); content.querySelector('#book-progress-form input')?.focus(); }
    if (action === 'finish-book') execute(() => engine.updateBook(id, engine.state.books.find(b => b.id === id).totalPages), 'Una historia terminada. Se queda contigo.');
    if (action === 'delete-book') confirm('¿Retirar este libro?', 'Desaparecerá del estante y perderás su marcapáginas. Las monedas ganadas se conservan.', 'Retirar libro', () => execute(() => { const result = engine.deleteBook(id); selectedBook = null; return result; }, 'Libro retirado.'));
    if (action === 'filter') { shopFilter = button.dataset.filter; render(); content.querySelector(`[data-filter="${shopFilter}"]`)?.focus(); }
    if (action === 'buy' && execute(() => engine.buyItem(id), 'Ya es tuyo.')) startPlacing(id);
    if (action === 'place') startPlacing(id);
    if (action === 'unequip') execute(() => engine.unequipItem(id), 'Guardado en tu colección.');
    if (action === 'reset') confirm('¿Empezar de nuevo?', 'Se borrarán permanentemente tus tareas, libros, monedas y decoración de esta habitación. Esta acción no se puede deshacer.', 'Borrar mi progreso', () => { if (execute(() => engine.reset(), '', false)) { selectedBook = null; close(); room.reward('Una página nueva. A tu ritmo.'); } });
    if (action === 'debug' && DEBUG) execute(() => { const result = engine.debug(button.dataset.debug); engine.completeFocus(); return result; }, 'Prueba aplicada.');
  });
  return { open, close, render, confirm, execute, get current() { return current; } };
}
