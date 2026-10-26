const section = document.querySelector('[data-access-demo]');

if (section) {
  const find = name => section.querySelector(`[data-demo-${name}]`);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ui = Object.fromEntries(['canvas', 'fallback', 'clock', 'phone-time', 'balance', 'progress', 'caption', 'phase-number', 'readout', 'scan-label', 'confidence', 'validation', 'validation-value', 'session-label', 'parking', 'session-description', 'in', 'time-label', 'duration', 'pause', 'replay', 'announcement'].map(name => [name, find(name)]));
  const chapters = [...section.querySelectorAll('[data-demo-chapter]')];
  const captions = ['Tu matrícula es tu llave.', 'Reconocido. Validado. Dentro.', 'Tu sesión sigue contigo.', 'Sales. NODO registra la estancia.', '4 créditos. Todo resuelto.'];
  const states = [
    [0, 'Llegada', 'Esperando vehículo', '—'],
    [2.6, 'Lectura de matrícula', 'Enfoque de matrícula', 'ANPR'],
    [3.35, 'Matrícula reconocida', 'Usuario identificado', 'Marta'],
    [3.8, 'Validando suscripción', 'Plan del usuario', 'CITY'],
    [4.15, 'Validando saldo', 'Saldo disponible', '60 CR'],
    [4.6, 'Acceso autorizado', 'Acceso autorizado', '✓ CITY'],
    [8.35, 'Parking activo', 'Sesión en curso', '11:42'],
    [12.45, 'Lectura de salida', 'Matrícula detectada', 'ANPR'],
    [13.2, 'Sesión encontrada', 'Entrada / salida', '11:42 / 13:07'],
    [13.7, 'Calculando estancia', '1 h 25 min', '4 CR'],
    [14.35, 'Salida autorizada', 'Salida autorizada', '✓'],
    [18.3, 'Estancia finalizada', 'Estancia finalizada', '4 CR'],
    [20.3, 'Saldo actualizado', 'Nuevo saldo', '56 CR']
  ];
  let scene;
  let loading;
  let started = false;
  let finished = false;
  let userPaused = false;
  let onScreen = false;
  let elapsed = 0;
  let lastTick = 0;
  let frame = 0;
  let lastPhase = -1;
  let lastReducedState = -1;
  let disposed = false;

  const text = (name, value) => { if (ui[name].textContent !== value) ui[name].textContent = value; };
  const stateElements = {
    'is-reading': find('readout'),
    'is-parked': find('time-jump'),
    'is-debiting': find('debit'),
    'show-toast': find('toast')
  };
  const flag = (name, value) => {
    section.classList.toggle(name, value);
    stateElements[name]?.setAttribute('aria-hidden', String(!value));
  };
  const duration = () => reducedMotion.matches ? 8 : 23;

  function renderUI(actual) {
    const reduced = reducedMotion.matches;
    const t = reduced ? actual < 2 ? 2.3 : actual < 4 ? 5.5 : actual < 6 ? 18.4 : 21.3 : actual;
    const phase = t < 3.35 ? 0 : t < 8.35 ? 1 : t < 10.2 ? 2 : t < 18.3 ? 3 : 4;
    const state = states.findLast(item => t >= item[0]);
    section.style.setProperty('--access-transition', reduced ? 1 : Math.min(t / 1.35, 1));
    section.dataset.demoState = state[1];
    text('caption', captions[phase]);
    text('phase-number', `0${phase + 1} / 05`);
    text('validation', state[2]); text('validation-value', state[3]);
    text('scan-label', t >= 12.45 ? 'LECTURA DE SALIDA' : 'MATRÍCULA DETECTADA');
    text('confidence', t >= 3.35 ? '99,8%' : 'ANPR');
    flag('is-reading', t >= 2.6 && t < 6.7 || t >= 12.45 && t < 16.3);
    flag('is-parked', t >= 8.7 && t < 10.2);
    flag('has-session', t >= 8.35);
    flag('focus-app', t >= 18.3);
    flag('is-debiting', t >= 19.1 && t < 20.8);
    flag('is-complete', t >= 20.8);
    flag('show-toast', t >= 20.5 && t < 22.5);
    const balance = t < 19.5 ? 60 : Math.max(56, 60 - Math.floor(Math.min(1, (t - 19.5) / .8) * 4));
    text('balance', String(balance));
    const parked = t >= 8.35;
    const ended = t >= 18.3;
    text('session-label', ended ? 'ESTANCIA FINALIZADA' : parked ? 'PARKING ACTIVO' : 'LISTO PARA APARCAR');
    text('parking', parked ? 'Parking Serrano' : 'Tu próximo destino.');
    text('session-description', ended ? 'Registrada automáticamente' : parked ? 'Sesión activa · Matrícula verificada' : 'Ningún parking activo');
    text('in', parked ? '11:42' : '—');
    const minutes = t < 9 ? 0 : Math.min(85, Math.floor((t - 9) / 1.2 * 85));
    text('duration', !parked ? '—' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`);
    const clockMinutes = 11 * 60 + 42 + minutes;
    const clock = `${Math.floor(clockMinutes / 60)}:${String(clockMinutes % 60).padStart(2, '0')}`;
    text('clock', clock); text('phone-time', clock);
    ui.progress.style.transform = `scaleX(${Math.min(actual / duration(), 1)})`;
    if (phase !== lastPhase) {
      chapters.forEach((chapter, i) => { if (i === phase) chapter.setAttribute('aria-current', 'step'); else chapter.removeAttribute('aria-current'); });
      text('announcement', phase === 4 ? 'Estancia finalizada. 1 hora y 25 minutos. 4 créditos utilizados. Saldo: 56 créditos.' : captions[phase]);
      lastPhase = phase;
    }
  }

  function render() {
    renderUI(elapsed);
    if (scene) {
      const state = Math.floor(elapsed / 2);
      if (!reducedMotion.matches || state !== lastReducedState) {
        scene.render(elapsed, reducedMotion.matches);
        lastReducedState = state;
      }
    }
  }
  function stopLoop() { cancelAnimationFrame(frame); frame = 0; lastTick = 0; }
  function canPlay() { return started && !finished && !userPaused && onScreen && !document.hidden && !disposed; }
  function tick(now) {
    frame = 0;
    if (!canPlay()) { lastTick = 0; return; }
    if (lastTick) elapsed = Math.min(duration(), elapsed + Math.min((now - lastTick) / 1000, .08));
    lastTick = now;
    render();
    if (elapsed >= duration()) {
      finished = true;
      ui.pause.hidden = true; ui.replay.hidden = false;
      text('announcement', 'Demostración completada. Saldo final: 56 créditos. Puedes repetir la demostración.');
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function resume() { if (canPlay() && !frame) frame = requestAnimationFrame(tick); }

  async function prepare() {
    if (loading) return loading;
    loading = (async () => {
      try {
        const { createAccessScene } = await import('./access-scene.js');
        if (disposed) return;
        scene = createAccessScene(ui.canvas);
        render();
        ui.canvas.addEventListener('webglcontextlost', event => {
          event.preventDefault(); scene = undefined; ui.canvas.hidden = true; ui.fallback.hidden = false;
        });
      } catch (error) {
        ui.canvas.replaceChildren(); ui.canvas.hidden = true; ui.fallback.hidden = false;
        section.dataset.renderMode = 'simplified';
      }
    })();
    return loading;
  }
  async function start() {
    await prepare();
    if (disposed || started) return;
    started = true;
    resume();
  }
  ui.pause.addEventListener('click', () => {
    userPaused = !userPaused;
    const label = userPaused ? 'Continuar demostración' : 'Pausar demostración';
    ui.pause.setAttribute('aria-label', label); ui.pause.title = label;
    ui.pause.querySelector('span').textContent = userPaused ? '▷' : 'Ⅱ';
    userPaused ? stopLoop() : resume();
  });
  async function replay() {
    await prepare();
    started = true;
    elapsed = 0; finished = false; userPaused = false; lastTick = 0; lastPhase = -1; lastReducedState = -1;
    ui.pause.hidden = false; ui.replay.hidden = true;
    ui.pause.setAttribute('aria-label', 'Pausar demostración'); ui.pause.title = 'Pausar demostración';
    ui.pause.querySelector('span').textContent = 'Ⅱ';
    ui.pause.focus({ preventScroll: true }); render(); resume();
  }
  ui.replay.addEventListener('click', replay);
  section.addEventListener('nodo:replay', replay);
  document.addEventListener('visibilitychange', () => document.hidden ? stopLoop() : resume());
  reducedMotion.addEventListener('change', () => {
    elapsed = Math.min(elapsed, duration()); lastReducedState = -1; render(); resume();
  });
  const resize = new ResizeObserver(() => { if (scene) { scene.resize(); lastReducedState = -1; render(); } });
  resize.observe(ui.canvas);
  if ('IntersectionObserver' in window) {
    const preload = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { prepare(); preload.disconnect(); }
    }, { rootMargin: '700px' });
    preload.observe(section);
    const visibility = new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) resume(); else stopLoop();
    });
    visibility.observe(section);
    const trigger = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting && e.intersectionRatio >= .5)) { start(); trigger.disconnect(); }
    }, { threshold: [.5] });
    trigger.observe(section.querySelector('.access-demo__world'));
    window.addEventListener('pagehide', event => {
      if (event.persisted) { stopLoop(); return; }
      disposed = true; stopLoop(); preload.disconnect(); visibility.disconnect(); trigger.disconnect(); resize.disconnect(); scene?.dispose();
    });
    window.addEventListener('pageshow', resume);
  } else { onScreen = true; start(); }
  renderUI(0);
}
