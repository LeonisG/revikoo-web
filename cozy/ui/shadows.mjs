import { artDefinition, SHADOW_PROFILES } from '../assets/art-registry.mjs';
import { CAMERA, CELL, SYMBOL } from '../logic/grid.mjs';

/** Small contact supports. No claim of physical cast shadows or recovered AO. */
export function contactShadow(item, placement) {
  if (item.placement === 'wall' || item.flat) return '';
  const { shadowProfile } = artDefinition(item.id);
  const supports = SHADOW_PROFILES[shadowProfile].contacts;
  const scale = placement.on ? .6 : 1;
  const ellipses = supports.map(([x, y, radius]) => {
    // Footprint and support pattern turn together. All current deliveries have
    // only view 0, but the contract is ready for genuinely authored other views.
    const a = (placement.rotation || 0) * Math.PI / 180;
    const rx = x * item.w * Math.cos(a) - y * item.h * Math.sin(a);
    const ry = x * item.w * Math.sin(a) + y * item.h * Math.cos(a);
    const cx = SYMBOL.anchorX + (rx - ry) * CELL;
    const cy = SYMBOL.anchorY + (rx + ry) * CELL * CAMERA.tilt;
    const r = radius * scale;
    return `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${r}" ry="${(r * CAMERA.tilt).toFixed(2)}"/>`;
  }).join('');
  return `<svg class="art-contact" data-shadow-profile="${shadowProfile}" viewBox="0 0 ${SYMBOL.w} ${SYMBOL.h}" aria-hidden="true">${ellipses}</svg>`;
}
