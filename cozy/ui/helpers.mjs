import { objectAsset } from '../assets/manifest.mjs';
import { GAME_CONFIG } from '../logic/config.mjs';
import { SYMBOL } from '../logic/grid.mjs';

// One icon family, one sprite, defined once in index.html. Anything that used to
// be a unicode glyph (the coin, arrows, the close cross) comes from here, so the
// room and its panels never mix icon styles.
export const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
// The coin is the game's one piece of branding: filled, never stroked.
export const coin = '<svg class="icon icon-coin" aria-hidden="true"><use href="#i-coin"></use></svg>';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Every sprite shares one logical anchor; art metadata supplies scale and pivot. */
export function art(id, label = '', rotation = 0, state = 'idle', eager = false) {
  const asset = objectAsset(id, rotation, state);
    // The catalogue has to show the object that will actually be placed, so the
    // axis correction travels with the thumbnail too.
    const thumbFix = asset.axisFix ? `transform:matrix(${asset.axisFix.widen},${asset.axisFix.shear},0,1,0,0);transform-origin:50% ${asset.pivot ? asset.pivot.y * 100 : 82.5}%;` : '';
    if (!eager) return `<span class="sprite-frame thumbnail"><img class="item-sprite" data-sprite="${id}" src="${escapeHTML(asset.src)}" alt="${escapeHTML(label)}" loading="lazy" decoding="async" draggable="false" style="width:100%;height:100%;left:0;top:0;object-fit:contain;${thumbFix}"></span>`;
    const width = asset.width || SYMBOL.w, height = width / (asset.aspect || 1);
    const pivot = asset.pivot || { x: .5, y: .825 };
    const left = (SYMBOL.anchorX - width * pivot.x) / SYMBOL.w * 100;
    const top = (SYMBOL.anchorY - height * pivot.y) / SYMBOL.h * 100;
    // Some masters came back at the wrong azimuth: their two floor-plane edges
    // disagree with the room's floor and with each other. `axisFix` is the
    // measured affine that sends both to the canonical axes, pinned at the pivot
    // so the object stays anchored. See tools/measure-axes.py.
    const fix = asset.axisFix
      ? `transform:matrix(${asset.axisFix.widen},${asset.axisFix.shear},0,1,0,0);transform-origin:${pivot.x * 100}% ${pivot.y * 100}%;`
      : '';
    return `<span class="sprite-frame"><img class="item-sprite" data-sprite="${id}" src="${escapeHTML(asset.src)}" alt="${escapeHTML(label)}"
      loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false" style="width:${width / SYMBOL.w * 100}%;height:${height / SYMBOL.h * 100}%;left:${left}%;top:${top}%;${fix}--sprite-ground:${pivot.y * 100}%"></span>`;
}

export function bookStyle(title) {
  let hash = 0;
  for (const c of title) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  hash = Math.abs(hash);
  const palette = ['#7b895f', '#a37459', '#6b827c', '#a18c5e', '#8b7464', '#758a8d'];
  return `--book-color:${palette[hash % palette.length]};--book-height:${120 + hash % 35}px;--book-width:${37 + hash % 15}px;--tilt:${hash % 5 - 2}deg`;
}

export const difficultyName = { small: 'Pequeña', medium: 'Mediana', big: 'Grande' };
export const difficulties = selected => ['small', 'medium', 'big'].map(d => `<option value="${d}" ${selected === d ? 'selected' : ''}>${difficultyName[d]} · ${GAME_CONFIG.rewards.tasks[d]} monedas</option>`).join('');
