import { objectAsset } from '../assets/manifest.mjs';
import { GAME_CONFIG } from '../logic/config.mjs';
// One icon family, one sprite, defined once in index.html. Anything that used to
// be a unicode glyph (the coin, arrows, the close cross) comes from here, so the
// room and its panels never mix icon styles.
export const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
// The coin is the game's one piece of branding: filled, never stroked.
export const coin = '<svg class="icon icon-coin" aria-hidden="true"><use href="#i-coin"></use></svg>';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function art(id, label = '', { stretch = false } = {}) {
  const asset = objectAsset(id);
  if (asset.type === 'image') return `<img src="${escapeHTML(asset.src)}" alt="${escapeHTML(label)}" loading="lazy" decoding="async">`;
  return `<svg viewBox="${id.startsWith('rug-') ? '0 0 300 120' : '0 0 160 180'}" ${stretch ? 'preserveAspectRatio="none"' : ''} ${label ? `role="img" aria-label="${escapeHTML(label)}"` : 'aria-hidden="true"'}><use href="${escapeHTML(asset.src)}"></use></svg>`;
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
