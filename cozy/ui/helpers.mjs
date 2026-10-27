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
    // Thumbnails keep the authored view: they sit in a tight box with no floor to
    // agree with, and the correction below can push art past the frame.
    if (!eager) return `<span class="sprite-frame thumbnail"><img class="item-sprite" data-sprite="${id}" src="${escapeHTML(asset.src)}" alt="${escapeHTML(label)}" loading="lazy" decoding="async" draggable="false" style="width:100%;height:100%;left:0;top:0;object-fit:contain;"></span>`;
    // Camera correction. The masters were drawn at disagreeing floor angles — the
    // large casework worst of all, around 33 and 20 degrees against a 24.1 degree
    // floor — so they read as twisted when set on it. `axisFix`, measured per
    // sprite by tools/measure-axes.py, is the one linear map that carries both
    // authored floor directions onto the canonical pair while leaving verticals
    // vertical: x' = widen*x, y' = shear*x + y. That is the difference between
    // two orthographic cameras over the floor plane, not a cosmetic skew, which
    // is why it is measured and never hand-tuned, and why measure-axes abstains
    // wherever the silhouette gives no honest reading rather than guessing.
    //
    // Widening is forced by the geometry, so the art is laid out 1/widen narrower
    // and the transform puts the width back: the corrected base spans exactly the
    // footprint it is calibrated for. Height follows that same scale, which is
    // the one liberty taken here — the alternative, decoupling it, re-introduces
    // the twist this removes. Pinned at the pivot so the contact point cannot drift.
    const { widen = 1, shear = 0 } = asset.axisFix || {};
    const width = (asset.width || SYMBOL.w) / widen, height = width / (asset.aspect || 1);
    const pivot = asset.pivot || { x: .5, y: .825 };
    const correction = asset.axisFix
      ? `transform:matrix(${widen},${shear},0,1,0,0);transform-origin:${(pivot.x * 100).toFixed(2)}% ${(pivot.y * 100).toFixed(2)}%;`
      : '';
    const left = (SYMBOL.anchorX - width * pivot.x) / SYMBOL.w * 100;
    const top = (SYMBOL.anchorY - height * pivot.y) / SYMBOL.h * 100;
    return `<span class="sprite-frame"><img class="item-sprite" data-sprite="${id}" src="${escapeHTML(asset.src)}" alt="${escapeHTML(label)}"
      loading="${eager ? 'eager' : 'lazy'}" decoding="async" draggable="false" style="width:${width / SYMBOL.w * 100}%;height:${height / SYMBOL.h * 100}%;left:${left}%;top:${top}%;${correction}--sprite-ground:${pivot.y * 100}%"></span>`;
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
