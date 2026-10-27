import { CATALOG, ROOM_SIZES, GAME_CONFIG } from '../logic/config.mjs';
import { art, escapeHTML, coin, icon } from './helpers.mjs';

// The basics offered in the first session. Short on purpose: the point is to
// make two or three real choices, not to shop.
const BASICS = ['desk', 'chair', 'bookshelf', 'shelf-small', 'drawers', 'side-table',
  'wardrobe-oak', 'rug-moss', 'rug-cream', 'monstera', 'mushroom', 'floor-lamp'];

/**
 * Build your first room: pick a size, pick a few basics, then go in and place
 * them. Nothing here is permanent — the size can be changed while the budget is
 * still open, and anything bought can be sold back later.
 */
export function createSetup(engine, { onFinish = () => {} } = {}) {
  const root = document.querySelector('#setup');
  const body = document.querySelector('#setup-body');
  const next = document.querySelector('#setup-next');
  let step = 'size';

  const needed = () => !engine.state.profile.setupCompleted;

  function start() {
    if (!needed()) { root.hidden = true; return; }
    if (!engine.state.ledger.includes('starter-budget')) {
      try { engine.startSetup(); } catch { /* Already granted in a previous visit. */ }
    }
    root.hidden = false;
    step = 'size';
    render();
  }

  function render() {
    const state = engine.state;
    document.querySelector('#setup-coins').textContent = state.coins;
    const bought = Object.entries(state.inventory).filter(([id, n]) => n > 0 && !CATALOG[id]?.starter);

    if (step === 'size') {
      document.querySelector('#setup-title').textContent = 'Está vacía. De eso se trata.';
      document.querySelector('#setup-copy').textContent = `Tienes ${GAME_CONFIG.starterBudget} monedas para empezar. Primero, ¿cómo de grande la quieres? Lo que gastes aquí no estará para los muebles.`;
      body.innerHTML = `<div class="size-choice" role="radiogroup" aria-label="Tamaño de la habitación">${Object.values(ROOM_SIZES).map(size => `
        <button role="radio" aria-checked="${size.id === state.room.size}" data-size="${size.id}" ${size.price > state.coins + ROOM_SIZES[state.room.size].price ? 'disabled' : ''}>
          <span class="size-grid" style="--n:${size.cells}">${Array.from({ length: size.cells * size.cells }, () => '<i></i>').join('')}</span>
          <strong>${size.name}</strong>
          <span class="size-cells">${size.cells} × ${size.cells}</span>
          <span class="size-price">${size.price ? `${size.price} ${coin}` : 'Incluida'}</span>
          <span class="size-blurb">${escapeHTML(size.blurb)}</span>
        </button>`).join('')}</div>`;
      next.textContent = 'Elegir lo básico';
      return;
    }

    document.querySelector('#setup-title').textContent = 'Elige lo básico.';
    document.querySelector('#setup-copy').textContent = 'No hace falta llenarla hoy. Compra dos o tres cosas y colócalas; el resto se gana haciendo.';
    body.innerHTML = `<div class="basics">${BASICS.map(id => {
      const item = CATALOG[id];
      const owned = state.inventory[id] || 0;
      const afford = state.coins >= item.price;
      return `<article class="basic ${owned ? 'owned' : ''}">
        <div class="basic-art">${art(id, item.name)}</div>
        <h3>${escapeHTML(item.name)}</h3>
        <p class="basic-meta">${item.w}×${item.h} · ${item.price} ${coin}</p>
        <div class="basic-actions">
          <button data-buy="${id}" ${afford ? '' : 'disabled'}>${owned ? 'Otro más' : 'Comprar'}</button>
          ${owned ? `<button class="text-button" data-sell="${id}">Devolver</button>` : ''}
        </div>
        ${owned ? `<span class="basic-count">${owned}</span>` : ''}
      </article>`;
    }).join('')}</div>`;
    next.textContent = bought.length ? 'Entrar y colocarlo' : 'Entrar sin comprar nada';
  }

  body.addEventListener('click', event => {
    const target = event.target.closest('[data-size], [data-buy], [data-sell]');
    if (!target) return;
    try {
      if (target.dataset.size) engine.chooseSize(target.dataset.size);
      if (target.dataset.buy) engine.buyItem(target.dataset.buy);
      if (target.dataset.sell) engine.sellItem(target.dataset.sell);
      render();
    } catch (error) {
      const note = document.querySelector('#setup-copy');
      note.textContent = error.message;
    }
  });

  next.addEventListener('click', () => {
    if (step === 'size') { step = 'basics'; render(); return; }
    engine.completeSetup();
    root.hidden = true;
    onFinish();
  });

  return { start, render, get needed() { return needed(); } };
}
