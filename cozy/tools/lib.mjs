/* Shared drawing primitives for the diorama art tools. Not a build step: the
 * browser serves the generated SVGs. Run the generators with Node after editing.
 *
 * Everything is drawn in one orthographic projection. A point in the room's
 * world (x and y along the floor, z up) lands on the scene at:
 *     screen = [700 + x - y, 480 + (x + y) * 0.36 - z]
 * Objects are drawn in the same units, which is what makes a chair look like it
 * belongs on the floor it is standing on.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

export const NL = String.fromCharCode(10);
export const CELL = 88;                 // world units per grid cell
export const TILT = .36;
export const ORIGIN = { x: 700, y: 480 };
export const SCENE = { w: 1400, h: 900 };
// Every object symbol shares this box, and the art is drawn at its true size
// inside it: two objects at the same scale really are the same size in the room.
export const SYM = { w: 420, h: 400, ax: 210, ay: 330 };

export const p = (x, y, z = 0) => [ORIGIN.x + x - y, ORIGIN.y + (x + y) * TILT - z];
export const pts = points => points.map(a => a.map(n => +n.toFixed(2)).join(',')).join(' ');
export const polygon = (points, fill, extra = '') => `<polygon points="${pts(points)}" fill="${fill}" ${extra}/>`;
export const line = (a, b, color, width = 2, extra = '') => `<path d="M${a}L${b}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none" ${extra}/>`;
export const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;

/** A box is its three visible faces: front, side and top. */
export const makeBox = P => (x, y, z, w, d, h, top, front, side, round = 3) =>
  polygon([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], front, `stroke="${front}" stroke-width="${round}" stroke-linejoin="round"`)
  + polygon([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], side, `stroke="${side}" stroke-width="${round}" stroke-linejoin="round"`)
  + polygon([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top, `stroke="${top}" stroke-width="${round}" stroke-linejoin="round"`);
export const makePlane = P => (x, y, z, w, d, fill, extra = '') =>
  polygon([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], fill, extra);

export const box = makeBox(p);
export const plane = makePlane(p);

/**
 * A projection for one object's own symbol: the object is drawn in a local box
 * running 0..w cells by 0..h cells, and comes out centred on the symbol's anchor.
 */
export function footprintProjection(w, h) {
  const halfW = w * CELL / 2, halfD = h * CELL / 2;
  const q = (x, y, z = 0) => [SYM.ax + (x - halfW) - (y - halfD), SYM.ay + ((x - halfW) + (y - halfD)) * TILT - z];
  return { q, qbox: makeBox(q), qplane: makePlane(q), W: w * CELL, D: h * CELL };
}

/** A blurred dark ellipse where an object meets the floor — the single most
 *  effective trick for making flat art look like it is resting on something. */
export const contact = (q, cx, cy, rx, ry = rx * .36, opacity = .36) => {
  const [sx, sy] = q(cx, cy);
  return `<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${rx}" ry="${ry}" fill="#08231c" opacity="${opacity}" filter="url(#soft)"/>`;
};

export const MAT = {
  oak: ['#dca36c', '#9e653f', '#bc8050'],
  pine: ['#e0b183', '#a97950', '#c6945f'],
  walnut: ['#8f6244', '#573a28', '#714c34'],
  white: ['#eae4d4', '#bdb5a3', '#d3ccba'],
  slate: ['#5f6b63', '#38433d', '#2a332e'],
  coral: ['#d68965', '#aa5c47', '#bc7052'],
  teal: ['#6f9ea0', '#4d7a7e', '#3c6165'],
  cream: ['#e8dcc0', '#bdb094', '#d0c3a6'],
  brass: ['#d8ae63', '#a07c3c', '#bd934d'],
};

export const DEFS = `<defs>
 <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="contact" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#09251e" flood-opacity=".45"/></filter>
 <radialGradient id="warm"><stop stop-color="#ffd086" stop-opacity=".4"/><stop offset="1" stop-color="#ffbe73" stop-opacity="0"/></radialGradient>
 <radialGradient id="glow"><stop stop-color="#ffcd85" stop-opacity=".55"/><stop offset="1" stop-color="#ffbe73" stop-opacity="0"/></radialGradient>
 <radialGradient id="screen"><stop stop-color="#a4dbc3"/><stop offset="1" stop-color="#599e91"/></radialGradient>
 <linearGradient id="pot"><stop stop-color="#e99570"/><stop offset=".5" stop-color="#cf6d55"/><stop offset="1" stop-color="#9b4f42"/></linearGradient>
 <linearGradient id="leaf"><stop stop-color="#93c86d"/><stop offset="1" stop-color="#408857"/></linearGradient>
 <linearGradient id="cloth"><stop stop-color="#d1795a"/><stop offset="1" stop-color="#914c3a"/></linearGradient>
</defs>`;

export function save(base, file, content, viewBox = `0 0 ${SCENE.w} ${SCENE.h}`) {
  mkdirSync(new URL('./', new URL(file, base)), { recursive: true });
  writeFileSync(new URL(file, base), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${DEFS}${NL}${content}${NL}</svg>${NL}`);
}
