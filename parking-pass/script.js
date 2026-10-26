import { createCityMap, parkings } from './city-map.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const header = $('[data-header]');
const nav = $('[data-nav]');
const menu = $('[data-menu-toggle]');
const maps = $$('[data-city]').map(createCityMap);
const format = value => new Intl.NumberFormat('es-ES').format(value);
const clamp = value => Math.min(1, Math.max(0, value));

function closeMenu(returnFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Abrir menú');
  menu.title = 'Abrir menú';
  $('img', menu).src = './assets/icons/menu.svg';
  nav.classList.remove('is-open');
  header.classList.remove('menu-visible');
  document.body.classList.remove('menu-open');
  if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  if (!open) { closeMenu(); return; }
  menu.setAttribute('aria-expanded', 'true');
  menu.setAttribute('aria-label', 'Cerrar menú');
  menu.title = 'Cerrar menú';
  $('img', menu).src = './assets/icons/x.svg';
  nav.classList.add('is-open');
  header.classList.add('menu-visible');
  document.body.classList.add('menu-open');
});
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
  if (event.key === 'Tab' && nav.classList.contains('is-open')) {
    const last = $$('a', nav).at(-1);
    if (event.shiftKey && document.activeElement === menu) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); menu.focus(); }
  }
});
addEventListener('resize', () => { if (innerWidth > 650) closeMenu(); });

function tabs(selector, onChange) {
  const buttons = $$(selector);
  const select = (button, focus = false) => {
    buttons.forEach(item => {
      const active = item === button;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    onChange(button);
    if (focus) button.focus();
  };
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next !== undefined) { event.preventDefault(); select(buttons[next], true); }
    });
  });
  return value => {
    const button = buttons.find(item => Object.values(item.dataset).includes(value));
    if (button) select(button);
  };
}

const selectApp = tabs('[data-app-tab]', button => {
  $$('.app-screen').forEach(panel => { panel.hidden = panel.id !== button.getAttribute('aria-controls'); });
});
$('[data-open-booking]').addEventListener('click', () => selectApp('booking'));
let reserved = false;
$('[data-reserve]').addEventListener('click', () => {
  const time = $('#arrival-time');
  if (!time.reportValidity()) return;
  reserved = !reserved;
  const button = $('[data-reserve]');
  button.firstChild.textContent = reserved ? 'Cancelar reserva ' : 'Reservar acceso ';
  $('img', button).src = reserved ? './assets/icons/x.svg' : './assets/icons/check.svg';
  const status = $('[data-reservation-status]');
  status.textContent = reserved ? 'Reserva simulada · ' + time.value + ' · 1234 LKM' : 'Simulación. No genera una reserva real.';
  status.classList.toggle('is-reserved', reserved);
  time.disabled = reserved;
});

const dotFragment = document.createDocumentFragment();
for (let i = 0; i < 60; i++) dotFragment.append(document.createElement('i'));
$('[data-credit-dots]').append(dotFragment);
const creditDots = $$('[data-credit-dots] i');
function updateCredits(button) {
  const rate = Number(button.dataset.creditRate);
  $$('[data-credit-rate]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $('[data-credit-cost]').textContent = '−' + rate;
  $('[data-credit-zone]').textContent = $('span', button).textContent.toUpperCase();
  $('[data-credit-remaining]').textContent = (60 - rate) + ' CR';
  creditDots.forEach((dot, index) => dot.classList.toggle('is-spent', index >= 60 - rate));
}
$$('[data-credit-rate]').forEach(button => button.addEventListener('click', () => updateCredits(button)));
updateCredits($('[data-credit-rate]'));

const markers = $('[data-network-markers]');
const choice = $('#parking-choice');
for (const parking of parkings) {
  const marker = document.createElement('button');
  marker.type = 'button'; marker.className = 'network-marker';
  marker.dataset.parking = parking.id;
  marker.setAttribute('aria-label', parking.name + ', ' + parking.places + ' plazas');
  marker.setAttribute('aria-pressed', String(parking.id === 'serrano'));
  marker.style.setProperty('--x', parking.x + '%'); marker.style.setProperty('--y', parking.y + '%');
  marker.append(document.createTextNode(String(parking.places)));
  const label = document.createElement('span'); label.textContent = parking.zone.toUpperCase(); marker.append(label);
  marker.addEventListener('click', () => selectParking(parking.id));
  markers.append(marker);
  const option = document.createElement('option'); option.value = parking.id; option.textContent = parking.name; choice.append(option);
}
let selectedParking = parkings[0];
function selectParking(id) {
  selectedParking = parkings.find(parking => parking.id === id) || parkings[0];
  choice.value = selectedParking.id;
  $$('[data-parking]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.parking === selectedParking.id)));
  $('[data-map-places]').textContent = selectedParking.places;
  $('[data-map-walk]').textContent = selectedParking.walk;
  $('[data-map-zone]').textContent = selectedParking.zone;
  $('[data-map-rate]').textContent = selectedParking.rate;
  maps.find(map => map.mode === 'network')?.setSelected(selectedParking);
}
choice.addEventListener('change', () => selectParking(choice.value));
let zoom = 1;
function updateZoom() {
  $('[data-network-world]').style.setProperty('--zoom', zoom);
  $('[data-zoom="in"]').disabled = zoom >= 1.6;
  $('[data-zoom="out"]').disabled = zoom <= 1;
}
$$('[data-zoom]').forEach(button => button.addEventListener('click', () => {
  zoom = Math.max(1, Math.min(1.6, Math.round((zoom + (button.dataset.zoom === 'in' ? .2 : -.2)) * 10) / 10));
  updateZoom();
}));
updateZoom();
$('[data-network-book]').addEventListener('click', () => {
  // The explored destination changes; Marta's completed Serrano receipt stays unchanged.
  $('.app-parking-info h3').textContent = selectedParking.name;
  $('.app-parking-info > p').textContent = selectedParking.zone + ' · ' + selectedParking.walk + ' min andando';
  $('.app-parking-info > .mono').textContent = selectedParking.places + ' PLAZAS DISPONIBLES';
  $('.app-price > span').textContent = selectedParking.id === 'serrano' ? '1 h 25 min · estancia de ejemplo' : 'Tarifa de ejemplo · 1 hora';
  $('.app-price > strong').textContent = selectedParking.rate.split(' / ')[0];
  $('.app-map-pin > small').textContent = selectedParking.zone.toUpperCase();
  $('#screen-booking h3').textContent = selectedParking.name + '.';
  maps.find(map => map.mode === 'app')?.setSelected(selectedParking);
  reserved = false;
  $('#arrival-time').disabled = false;
  $('[data-reserve]').firstChild.textContent = 'Reservar acceso ';
  $('img', $('[data-reserve]')).src = './assets/icons/check.svg';
  $('[data-reservation-status]').textContent = 'Simulación. No genera una reserva real.';
  $('[data-reservation-status]').classList.remove('is-reserved');
  selectApp('map');
});

const plans = {
  mini: { name: 'MINI', credits: 25, price: '24,90', description: 'Para aparcar de vez en cuando.', benefits: ['Acceso a la red urbana', 'Reserva estándar', '1 vehículo'], coverage: 'RED URBANA', nodes: 5 },
  city: { name: 'CITY', credits: 60, price: '49,90', description: 'Para moverte por la ciudad.', benefits: ['Acceso a la red urbana', 'Reserva anticipada', '2 vehículos'], coverage: 'RED URBANA', nodes: 8 },
  plus: { name: 'PLUS', credits: 140, price: '99', description: 'Para quienes se mueven más.', benefits: ['Parkings premium', 'Reserva anticipada', '3 vehículos'], coverage: 'URBANA + PREMIUM', nodes: 12 },
  pro: { name: 'PRO', credits: 320, price: '199', description: 'Para una movilidad intensiva.', benefits: ['Aeropuertos y estaciones', 'Parkings premium', 'Vehículos adicionales'], coverage: 'URBANA + PREMIUM + CONEXIONES', nodes: 16 }
};
for (let i = 0; i < 16; i++) $('[data-plan-nodes]').append(document.createElement('i'));
const selectPlan = tabs('[data-plan]', button => {
  const plan = plans[button.dataset.plan];
  $('[data-pass]').dataset.kind = button.dataset.plan;
  $('[data-plan-name]').textContent = plan.name;
  $('[data-plan-credits]').textContent = plan.credits;
  $('[data-plan-price]').textContent = plan.price;
  $('[data-plan-description]').textContent = plan.description;
  $('[data-plan-code]').textContent = 'MAD / ' + plan.name + ' / ' + String(plan.credits).padStart(3, '0');
  $('[data-plan-coverage-label]').textContent = plan.coverage;
  $('[data-plan-benefits]').replaceChildren(...plan.benefits.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $$('[data-plan-nodes] i').forEach((node, index) => node.classList.toggle('active', index < plan.nodes));
  $('#plan-detail').setAttribute('aria-labelledby', button.id);
});
selectPlan('city');

tabs('[data-work-tab]', button => {
  $('#work-zones').hidden = button.dataset.workTab !== 'zones';
  $('#work-budget').hidden = button.dataset.workTab !== 'budget';
});
for (let i = 0; i < 50; i++) $('[data-fixed-spaces]').append(document.createElement('i'));
$$('[data-work-mode]').forEach(button => button.addEventListener('click', () => {
  const fixed = button.dataset.workMode === 'fixed';
  $$('[data-work-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $('[data-work-dashboard]').classList.toggle('is-fixed', fixed);
  $('[data-work-map-label]').textContent = fixed ? 'CAPACIDAD CONCENTRADA EN UNA UBICACIÓN' : 'PERSONAS CONECTADAS A LA RED';
  $('[data-work-summary]').textContent = fixed ? 'UN LUGAR FIJO, AUNQUE EL EQUIPO SE MUEVA.' : 'UNA RED FLEXIBLE, EN LUGAR DE UNA PLAZA FIJA.';
}));
$('#team-credit').addEventListener('input', event => {
  $('[data-team-credit]').textContent = event.target.value;
  $('[data-team-total]').textContent = format(Number(event.target.value) * 178) + ' CR';
});
$('[data-export]').addEventListener('click', () => {
  const rows = [['NODO WORK', 'DATOS CONCEPTUALES'], ['Periodo', 'Octubre 2026'], ['Personas', 342], ['Usuarios activos', 178], ['Sesiones', 1824], ['Gasto ilustrativo EUR', 8420], ['Creditos por persona simulados', $('#team-credit').value]];
  const csv = '\uFEFF' + rows.map(row => row.join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'nodo-work-ejemplo.csv'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const spaces = [];
// A deterministic shuffled occupation pattern keeps totals honest: 74 occupied, 46 free.
const occupied = new Set(Array.from({ length: 120 }, (_, i) => i).sort((a, b) => (a * 47 % 121) - (b * 47 % 121)).slice(0, 74));
for (let i = 0; i < 120; i++) {
  const space = document.createElement('i'); space.textContent = String(i + 1).padStart(2, '0');
  space.setAttribute('aria-hidden', 'true'); space.classList.toggle('occupied', occupied.has(i));
  spaces.push(space); $('[data-parking-grid]').append(space);
}
function updateCapacity() {
  const enabled = $('[data-network-enabled]').checked;
  const capacity = enabled ? Number($('#capacity').value) : 0;
  $('#capacity').disabled = !enabled;
  $('[data-capacity-value]').textContent = capacity;
  $('[data-capacity-stat]').textContent = capacity;
  let freeIndex = 0;
  spaces.forEach((space, index) => {
    const available = !occupied.has(index);
    const opened = available && freeIndex++ < capacity;
    space.classList.toggle('nodo', opened);
    space.title = 'Plaza ' + (index + 1) + ': ' + (!available ? 'ocupada' : opened ? 'NODO' : 'disponible');
  });
  $('[data-capacity-status]').textContent = capacity + ' plazas abiertas a la red · ' + (46 - capacity) + ' disponibles';
  $('[data-parking-grid]').setAttribute('aria-label', '120 plazas: 74 ocupadas, ' + capacity + ' abiertas a NODO y ' + (46 - capacity) + ' disponibles');
}
$('#capacity').addEventListener('input', updateCapacity);
$('[data-network-enabled]').addEventListener('change', updateCapacity);
updateCapacity();

$('[data-replay-link]').addEventListener('click', () => $('[data-access-demo]').dispatchEvent(new Event('nodo:replay')));

let scrollFrame = 0;
let heroIntro = motion.matches ? 1 : 0;
const scenes = $$('[data-scroll-scene]');
const hero = $('.hero');
function updateScroll() {
  scrollFrame = 0;
  header.classList.toggle('is-scrolled', scrollY > 20);
  const heroProgress = clamp(-hero.getBoundingClientRect().top / hero.offsetHeight);
  maps.find(map => map.mode === 'hero')?.draw(motion.matches ? 0 : heroProgress, heroIntro);
  scenes.forEach(scene => {
    const rect = scene.getBoundingClientRect();
    const progress = motion.matches ? 1 : clamp((innerHeight * .85 - rect.top) / Math.min(rect.height, innerHeight * .8));
    scene.style.setProperty('--scene', progress.toFixed(3));
    if (scene.id === 'vision') maps.find(map => map.mode === 'vision')?.draw(progress);
  });
}
addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }, { passive: true });
addEventListener('resize', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); });
motion.addEventListener('change', () => { heroIntro = 1; updateScroll(); });
updateScroll();
let introFrame;
if (!motion.matches) {
  const start = performance.now();
  const intro = now => {
    heroIntro = clamp((now - start - 250) / 1700);
    maps.find(map => map.mode === 'hero')?.draw(clamp(scrollY / hero.offsetHeight), heroIntro);
    if (heroIntro < 1 && !motion.matches) introFrame = requestAnimationFrame(intro);
  };
  introFrame = requestAnimationFrame(intro);
}
document.fonts.ready.then(() => { maps.forEach(map => map.draw()); });
const navLinks = $$('.main-nav a:not(.nav-demo)');
const sectionObserver = new IntersectionObserver(entries => {
  const current = entries.find(entry => entry.isIntersecting);
  if (!current) return;
  navLinks.forEach(link => {
    if (link.hash === '#' + current.target.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}, { rootMargin: '-15% 0px -60% 0px' });
navLinks.forEach(link => { const target = $(link.hash); if (target) sectionObserver.observe(target); });
addEventListener('pagehide', event => {
  cancelAnimationFrame(introFrame); cancelAnimationFrame(scrollFrame);
  if (!event.persisted) { maps.forEach(map => map.dispose()); sectionObserver.disconnect(); }
});
