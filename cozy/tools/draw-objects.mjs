/* Generates assets/objects.svg: one symbol per catalogue item, all sharing the
 * same box and the same scale, so a chair really is chair-sized next to a desk.
 * Run with `node tools/draw-objects.mjs`.
 *
 * Each object is drawn in its own footprint space: x and y run 0..w cells and
 * 0..h cells, z is height, and the art comes out centred on the symbol anchor
 * with its base on the anchor line. An object that sits on a surface is drawn
 * from its own base — the room lifts it to the top of whatever holds it up.
 */
import { writeFileSync } from 'node:fs';
import { ITEMS } from '../logic/catalog.mjs';
import { furnitureSprite } from './furniture.mjs';
import { footprintProjection, contact, ellipse, pts, polygon, line, MAT, CELL, SYM, DEFS, NL } from './lib.mjs';

const base = new URL('../assets/', import.meta.url);
const symbols = {};

/** Define one object. `w`/`h` are its footprint in cells. */
const draw = (id, w, h, build) => {
  const ctx = footprintProjection(w, h);
  // Screen-space group whose origin is a point on the object's own base plane.
  ctx.at = (x, y, art, z = 0) => { const [sx, sy] = ctx.q(x, y, z); return `<g transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)})">${art}</g>`; };
  ctx.shadow = (rx, opacity = .36) => contact(ctx.q, ctx.W / 2, ctx.D / 2, rx, rx * .36, opacity);
  symbols[id] = build(ctx);
};

/** Four legs at the corners of an inset rectangle. */
const legsOf = ({ q, qbox, W, D }, inset, thick, height, mat) =>
  [[inset, inset], [W - inset - thick, inset], [inset, D - inset - thick], [W - inset - thick, D - inset - thick]]
    .map(([x, y]) => contact(q, x + thick / 2, y + thick / 2, thick * 1.1, thick * .4, .4) + qbox(x, y, 0, thick, thick, height, ...mat, 2))
    .join('');

const leaf = (x, y, size, angle, fill, split = false) =>
  `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${size})">`
  + `<path d="M0 14Q-15 4-11-11Q-2-21 10-12Q17 1 0 14Z" fill="${fill}"/>`
  + (split ? `<path d="M-1 10L-8-3M0 4L7-5" stroke="#0c2a1e" stroke-width="1.6" opacity=".38" stroke-linecap="round" fill="none"/>` : '')
  + `<path d="M0 12V-12" stroke="#ffffff30" stroke-width="1.4"/></g>`;

/** A tapered vessel seen from the side: body, shaded flank, rim, contents. */
const vessel = (rTop, rBot, h, body, rim, inner) => {
  const e = r => +(r * .4).toFixed(1);
  return `<path d="M${-rTop} ${-h}L${-rBot} 0A${rBot} ${e(rBot)} 0 0 0 ${rBot} 0L${rTop} ${-h}Z" fill="${body}"/>`
    + `<path d="M${-rTop} ${-h}L${-rBot} 0A${rBot} ${e(rBot)} 0 0 0 ${-rBot * .3} ${e(rBot)}L${-rTop * .4} ${-h}Z" fill="#06150f" opacity=".17"/>`
    + `<ellipse cy="${-h}" rx="${rTop}" ry="${e(rTop)}" fill="${rim}"/>`
    + (inner ? `<ellipse cy="${-h}" rx="${rTop - 4}" ry="${e(rTop - 4)}" fill="${inner}"/>` : '');
};

// ── Desks ────────────────────────────────────────────────────────────────────
const deskBuild = width => ctx => {
  const { qbox, qplane, W, D } = ctx;
  const H = 142, m = 6;
  return ctx.shadow(W * .45, .3)
    + legsOf(ctx, m + 2, 13, H - 14, MAT.walnut)
    + qbox(m, m, H - 14, W - m * 2, D - m * 2, 14, ...MAT.oak, 6)
    + qbox(W - m - 62, m + 6, H - 70, 56, D - m * 2 - 12, 52, ...MAT.pine, 4)
    + line(ctx.q(W - m - 48, m + 6, H - 44), ctx.q(W - m - 20, m + 6, H - 44), '#6b4a33', 5)
    + (width > 2 ? qbox(m + 10, m + 6, H - 70, 50, D - m * 2 - 12, 52, ...MAT.pine, 4) : '');
};
draw('desk', 2, 1, deskBuild(2));
draw('desk-wide', 3, 1, deskBuild(3));

// ── Chair ────────────────────────────────────────────────────────────────────
draw('chair', 1, 1, ctx => {
  const { qbox, q, W, D } = ctx;
  const seat = 62;
  return ctx.shadow(W * .34, .32)
    + legsOf(ctx, 16, 9, seat, MAT.walnut)
    + qbox(12, 12, seat, W - 24, D - 24, 13, ...MAT.coral, 8)
    + ctx.at(16, D - 16, `<path d="M0 0Q0-72 20-72H42Q60-72 60 0Q30 12 0 0Z" fill="url(#cloth)" transform="skewY(19.8)"/>`
      + `<path d="M8-6Q8-62 22-62H40Q52-62 52-10" stroke="#e6a07b" stroke-width="4" fill="none" transform="skewY(19.8)"/>`, seat + 10);
});

// ── Storage ──────────────────────────────────────────────────────────────────
/** Doors, handles and a plinth: wardrobes and cabinets are all this shape. */
const cabinet = (height, mat, { doors = 2, rail = false, shelves = 0 } = {}) => ctx => {
  const { qbox, qplane, q, W, D } = ctx;
  const m = 7, body = [m, m, W - m * 2, D - m * 2];
  let art = ctx.shadow(W * .46, .4) + qbox(m, m, 0, body[2], body[3], 12, ...MAT.walnut, 2);
  if (rail) {
    art += qbox(m + 4, D / 2 - 5, 12, 10, 10, height - 30, ...MAT.walnut, 2)
      + qbox(W - m - 14, D / 2 - 5, 12, 10, 10, height - 30, ...MAT.walnut, 2)
      + qbox(m + 4, D / 2 - 4, height - 18, body[2] - 8, 8, 8, ...MAT.brass, 2);
    for (const [x, colour] of [[.2, '#cfd9c4'], [.38, '#d68965'], [.56, '#6f9ea0'], [.74, '#e8dcc0']])
      art += ctx.at(m + body[2] * x, D / 2, `<path d="M0 0L-13 58Q0 64 13 58Z" fill="${colour}"/><path d="M0-10v10" stroke="#8a7355" stroke-width="3"/>`, height - 72);
    return art;
  }
  art += qbox(m, m, 12, body[2], body[3], height - 12, ...mat, 4);
  const faceInset = 9;
  for (let i = 0; i < doors; i++) {
    const dw = (body[2] - faceInset * 2) / doors;
    const x = m + faceInset + i * dw;
    art += polygon([q(x + 2, D - m, 24), q(x + dw - 2, D - m, 24), q(x + dw - 2, D - m, height - 12), q(x + 2, D - m, height - 12)], '#00000018')
      + line(q(x + dw - 10, D - m, height * .5), q(x + dw - 10, D - m, height * .5 + 26), MAT.brass[0], 5);
  }
  for (let i = 1; i <= shelves; i++)
    art += line(q(m + 6, D - m, height * i / (shelves + 1)), q(W - m - 6, D - m, height * i / (shelves + 1)), '#00000022', 4);
  return art;
};
draw('wardrobe-oak', 2, 1, cabinet(300, MAT.oak));
draw('wardrobe-dark', 2, 1, cabinet(300, MAT.walnut));
draw('wardrobe-rack', 2, 1, cabinet(260, MAT.oak, { rail: true }));
draw('drawers', 1, 1, cabinet(120, MAT.pine, { doors: 1, shelves: 2 }));

// ── Shelving ─────────────────────────────────────────────────────────────────
/** An open case with shelves and a curated row of books on each one. */
const shelving = (height, levels) => ctx => {
  const { qbox, q, W, D } = ctx;
  const m = 7, inner = W - m * 2;
  let art = ctx.shadow(W * .46, .4)
    + qbox(m, m, 0, inner, D - m * 2, height, ...MAT.walnut, 4)
    + polygon([q(m + 6, D - m, 10), q(W - m - 6, D - m, 10), q(W - m - 6, D - m, height - 8), q(m + 6, D - m, height - 8)], '#2f2619');
  const palette = [['#65a8aa', '#326469'], ['#e8b65a', '#a4752e'], ['#d77c62', '#944632'], ['#91af79', '#526d42'], ['#b4b7a1', '#777f67'], ['#8b8db3', '#535575']];
  for (let level = 0; level < levels; level++) {
    const z = 14 + level * ((height - 24) / levels);
    art += qbox(m + 2, m + 2, z, inner - 4, D - m * 2 - 4, 9, ...MAT.oak, 2);
    // Books vary in height, width and lean; a limited palette keeps them curated.
    let x = m + 12;
    for (let i = 0; x < W - m - 22; i++) {
      const [spine, dark] = palette[(level * 3 + i) % palette.length];
      const bw = 11 + (i * 7 % 9), bh = 34 + ((i * 13 + level * 7) % 18);
      art += qbox(x, m + 8, z + 9, bw, D - m * 2 - 18, bh, spine, dark, dark, 1.5);
      x += bw + 3;
    }
  }
  return art;
};
draw('bookshelf', 2, 1, shelving(300, 4));
draw('shelf-small', 1, 1, shelving(118, 2));

draw('side-table', 1, 1, ctx => {
  const { qbox, W, D } = ctx;
  return ctx.shadow(W * .3, .34) + legsOf(ctx, 20, 8, 80, MAT.walnut)
    + qbox(14, 14, 80, W - 28, D - 28, 12, ...MAT.pine, 7);
});

// ── Lighting, plants and companions ──────────────────────────────────────────
draw('floor-lamp', 1, 1, ctx => {
  const { qbox, W, D } = ctx;
  return ctx.shadow(W * .26, .34)
    + qbox(W / 2 - 16, D / 2 - 16, 0, 32, 32, 7, ...MAT.slate, 3)
    + qbox(W / 2 - 4, D / 2 - 4, 7, 8, 8, 196, ...MAT.brass, 2)
    + ctx.at(W / 2, D / 2, `<path d="M-38 0h76l-13-54h-50Z" fill="#3f6f5f"/><path d="M-38 0h22l-9-54h-11Z" fill="#558a76"/>`
      + `<ellipse rx="38" ry="11" fill="#ffdfa4"/><ellipse cy="-54" rx="25" ry="7" fill="#2e5a4c"/>`
      + ellipse(0, 10, 66, 40, 'url(#glow)'), 203);
});

const plant = (potH, rTop, rBot, potMat, leaves) => ctx => {
  const { W, D } = ctx;
  return ctx.shadow(rTop * 1.1, .34)
    + ctx.at(W / 2, D / 2, vessel(rTop, rBot, potH, ...potMat) + leaves);
};
draw('monstera', 1, 1, plant(44, 30, 22, ['#c4714f', '#e49168', '#4c3a2b'],
  `<path d="M0-44V-96m0-28-24-24m26 2 22-20" stroke="#4e6b41" stroke-width="5" fill="none" stroke-linecap="round"/>`
  + [[-26, -92, 1.7, -28], [26, -104, 1.9, 26], [-16, -132, 1.6, -12], [22, -70, 1.5, 54], [2, -150, 1.4, 4]]
    .map(([x, y, s, a]) => leaf(x, y, s, a, '#5d8a4e', true)).join('')));
draw('fern', 1, 1, plant(40, 27, 21, ['#9aa37e', '#c2caa2', '#43372a'],
  `<g fill="none" stroke="#587a46" stroke-width="4" stroke-linecap="round"><path d="M0-40Q-20-92-38-108M0-40Q-8-96-14-126M0-40Q10-94 18-120M0-40Q22-86 42-100"/></g>`
  + [[-38, -108, -62], [-14, -126, -14], [18, -120, 16], [42, -100, 64]].map(([x, y, a]) =>
    `<g transform="translate(${x} ${y}) rotate(${a})">${[0, 9, 18, 27].map(d => `<path d="M0 ${d}l-10-6 10-3 10 3Z" fill="#6d9552"/>`).join('')}</g>`).join('')));
draw('ficus', 1, 1, plant(58, 38, 28, ['#c4714f', '#e49168', '#4c3a2b'],
  `<path d="M0-58V-210m0-54-34-30m36 4 32-28" stroke="#5c7a48" stroke-width="7" fill="none" stroke-linecap="round"/>`
  + [[-40, -140, 2.1, -40], [40, -170, 2.3, 34], [-30, -196, 1.9, -16], [34, -112, 1.8, 58], [0, -238, 1.8, 6], [-48, -96, 1.6, -58]]
    .map(([x, y, s, a]) => leaf(x, y, s, a, '#4f8349')).join('')));

/** A sleeping animal on a cushion: one shape, three coats. */
const companion = (coat, belly, ear, extra = '') => ctx => {
  const { W, D } = ctx;
  // Companions cost weeks of saving, so they are drawn a little larger than
  // life: arriving home should feel like something turning up, not a prop.
  return ctx.shadow(W * .38, .32) + ctx.at(W / 2, D / 2, `<g transform="scale(1.38)">`
    + `<ellipse cy="4" rx="54" ry="20" fill="#32695c"/><ellipse rx="52" ry="18" fill="#558b73"/>`
    + `<path d="M-34-4Q-42-32-6-36Q32-40 40-12Q46 8 6 11Z" fill="${coat}"/>`
    + `<path d="M-30-6Q-10 2 24 0Q28 8 4 10Q-22 11-30-6Z" fill="${belly}" opacity=".55"/>`
    + ear
    + `<path d="M-27-16q4 5 8 0m7-1q4 5 8 0" stroke="#69472f" stroke-width="2.5" stroke-linecap="round" fill="none"/>`
    + extra + `</g>`);
};
draw('cat', 1, 1, companion('#d5a16a', '#edc28a',
  `<path d="M-34-18l-1-20 15 11 16-10-1 20" fill="#dcac74"/><path d="M-32-33l8 7-8 3m21-8-7 8 7-2" fill="#ae7555"/>`,
  `<path d="M26-24Q0-37-2-16Q-5 1 23-3" stroke="#edc28a" stroke-width="10" stroke-linecap="round" fill="none"/>`));
draw('rabbit', 1, 1, companion('#cdc3b4', '#eae2d6',
  `<path d="M-28-24q-5-30 5-32q8-2 8 28Zm16-3q-2-30 7-31q8 0 6 30Z" fill="#d8cfc1"/><path d="M-25-28q-3-20 2-22m16 1q3 2 2 20" stroke="#e9a9a0" stroke-width="4" fill="none"/>`,
  `<ellipse cx="34" cy="-4" rx="9" ry="8" fill="#e8e2d8"/>`));
draw('dog', 1, 1, companion('#b98a5e', '#dcb98c',
  `<path d="M-34-16q-10-22 2-24q10-2 12 16Zm30-6q0-20 10-18q8 2 2 20Z" fill="#9d7049"/>`,
  `<path d="M30-20Q50-28 48-6Q46 6 30 2" stroke="#b98a5e" stroke-width="9" stroke-linecap="round" fill="none"/><ellipse cx="-30" cy="-8" rx="6" ry="5" fill="#4a3426"/>`));

// ── Rugs ─────────────────────────────────────────────────────────────────────
const rug = (field, border, stripe) => ctx => {
  const { qplane, W, D } = ctx;
  const m = 5;
  return qplane(m, m, 1, W - m * 2, D - m * 2, field, `stroke="${border}" stroke-width="9" stroke-linejoin="round"`)
    + qplane(m + 18, m + 18, 2, W - m * 2 - 36, D - m * 2 - 36, 'none', `stroke="${stripe}" stroke-width="4" opacity=".8"`)
    + qplane(m + 34, m + 34, 2, W - m * 2 - 68, D - m * 2 - 68, 'none', `stroke="${stripe}" stroke-width="3" opacity=".55"`);
};
draw('rug-cream', 2, 2, rug('#ddcfae', '#bfae8a', '#9f8f6c'));
draw('rug-moss', 2, 2, rug('#4d6f52', '#3a5640', '#86a473'));
draw('rug-clay', 2, 2, rug('#b5664d', '#8d4b38', '#dd9876'));

// ── Things that sit on a surface ─────────────────────────────────────────────
// Drawn from their own base: the room lifts them onto whatever holds them up.
const onTop = (id, build) => draw(id, 1, 1, ctx => ctx.at(ctx.W / 2, ctx.D / 2,
  `<ellipse rx="26" ry="9" fill="#08231c" opacity=".3" filter="url(#soft)"/>` + build(ctx)));

onTop('journal', () => `<g transform="skewY(19.8)"><rect x="-26" y="-34" width="52" height="42" rx="3" fill="#b9ab86"/>`
  + `<rect x="-28" y="-40" width="52" height="42" rx="3" fill="#ce775e"/><rect x="-20" y="-32" width="28" height="18" fill="#e7d3a7"/>`
  + `<path d="M-28-24h52" stroke="#a85645" stroke-width="3"/></g><path d="M20-18l14-10" stroke="#e8ba5c" stroke-width="5" stroke-linecap="round"/>`);
onTop('timer', () => `<g transform="skewY(19.8)"><rect x="-24" y="-30" width="48" height="36" rx="8" fill="#a75942"/>`
  + `<rect x="-18" y="-25" width="36" height="26" rx="5" fill="#e2b675"/><rect x="-12" y="-20" width="24" height="16" rx="3" fill="#3b574a"/>`
  + `<path d="M-7-15h6m-6 6h6m6-6h6m-6 6h6" stroke="#d9d6a9" stroke-width="2.5"/></g>`);
onTop('laptop', () => `<path d="M-34-6h68l6 10H-40Z" fill="#8ea89c"/>`
  + `<g transform="matrix(1 .36 -.12 .96 0 -6)"><rect x="-32" y="-46" width="64" height="46" rx="4" fill="#28483f"/>`
  + `<rect x="-28" y="-42" width="56" height="38" rx="2" fill="url(#screen)"/>`
  + `<path d="M-28-12l16-14 13 11 11-12 16 15v12h-56Z" fill="#4b877c"/></g>`);
onTop('savings-jar', () => vessel(22, 17, 44, '#bcd4cf', '#d8e8e4', '#8fae9f')
  + `<ellipse cy="-44" rx="23" ry="9" fill="#c9a24f"/><path d="M-8-46h16" stroke="#8a6c32" stroke-width="4"/>`
  + `<g fill="#e3bf6c">${[[-8, -14], [4, -10], [-2, -22]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="3"/>`).join('')}</g>`);
onTop('radio', () => `<g transform="skewY(19.8)"><rect x="-32" y="-38" width="64" height="44" rx="6" fill="#a9754b"/>`
  + `<rect x="-26" y="-32" width="30" height="30" rx="3" fill="#e0d2ae"/>`
  + `${[0, 1, 2, 3].map(i => `<path d="M-24 ${-28 + i * 7}h26" stroke="#b5a481" stroke-width="2.5"/>`).join('')}`
  + `<circle cx="17" cy="-22" r="8" fill="#d8ae63"/><circle cx="17" cy="-8" r="5" fill="#8a6c3f"/></g>`
  + `<path d="M24-40l16-22" stroke="#c7b48c" stroke-width="3" stroke-linecap="round"/>`);
onTop('candle', () => `<ellipse cy="-2" rx="22" ry="8" fill="#c08a63"/>` + vessel(13, 14, 40, '#dfa25c', '#f0c184')
  + `<path d="M0-40v-6" stroke="#53402c" stroke-width="2"/><path d="M0-46q-7-9 0-17q7 8 0 17Z" fill="#ffe3a4"/>`
  + ellipse(0, -50, 30, 26, 'url(#glow)'));
onTop('mushroom', () => `<path d="M-6-30h12l3 30H-9Z" fill="#e8dcc0"/>`
  + `<path d="M-34-32Q-30-78 0-79Q30-78 34-32Q0-16-34-32Z" fill="#d9834f"/>`
  + `<path d="M-27-38Q-23-72-1-74" stroke="#efa871" stroke-width="5" fill="none" stroke-linecap="round"/>`
  + `<ellipse cy="-31" rx="34" ry="9" fill="#f7e2b4"/>` + ellipse(0, -34, 54, 34, 'url(#glow)'));
onTop('vintage-lamp', () => `<ellipse cy="-2" rx="20" ry="7" fill="#38433d"/><path d="M0-6v-54" stroke="#8d7047" stroke-width="5" stroke-linecap="round"/>`
  + `<path d="M-24-60h48l-10-30H-14Z" fill="#3f6f5f"/><path d="M-24-60h16l-6-30h-4Z" fill="#558a76"/>`
  + `<ellipse cy="-60" rx="24" ry="7" fill="#ffdfa4"/>` + ellipse(0, -52, 44, 30, 'url(#glow)'));
onTop('lantern', () => `<path d="M0 0Q-36-12-36-42Q-36-76 0-80Q36-76 36-42Q36-12 0 0Z" fill="#ead8ae"/>`
  + `<path d="M0 0Q-22-12-22-42Q-22-74 0-80" stroke="#f6ead0" stroke-width="7" fill="none" opacity=".5"/>`
  + `<path d="M0-80V0M-18-72v62m36-62v62" stroke="#c0a376" stroke-width="2" opacity=".55"/>`
  + ellipse(0, -42, 52, 44, 'url(#glow)'));
onTop('vase', () => `<path d="M-16 0q-9-30 6-42q-12-20 10-28q22 8 10 28q15 12 6 42Z" fill="#cfd9c4"/>`
  + `<path d="M-16 0q-9-30 6-42q-12-20 10-28" stroke="#e8f0e0" stroke-width="6" fill="none" opacity=".5"/>`
  + `<path d="M0-70q-10-26-22-34m22 34q2-30 14-38m-14 38q10-22 22-24" stroke="#9c8a5e" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  + [[-22, -104, .7, -36], [14, -108, .7, 28], [22, -94, .6, 62]].map(([x, y, s, a]) => leaf(x, y, s, a, '#b8a06a')).join(''));
onTop('book-stack', ctx => [['#6f9ea0', '#3c6165'], ['#d98b63', '#92523a'], ['#cdbd8e', '#8a7c5c']]
  .map(([top, side], i) => `<g transform="translate(${i % 2 ? 3 : -2} ${-i * 13})"><path d="M-30-13L0-24l30 11L0-2Z" fill="${top}"/><path d="M-30-13v12L0 10V-2Z" fill="${side}"/><path d="M30-13v12L0 10V-2Z" fill="${side}" opacity=".8"/></g>`).join(''));
onTop('teapot', () => `<path d="M-30-30q0-32 30-32t30 32q0 26-30 26t-30-26Z" fill="#c96f55"/>`
  + `<path d="M-30-30q0-32 30-32" stroke="#e59277" stroke-width="7" fill="none" opacity=".55"/>`
  + `<path d="M30-50q18-4 16 14q-2 14-16 12" stroke="#b05f48" stroke-width="7" fill="none" stroke-linecap="round"/>`
  + `<path d="M-30-48q-16-10-22 4" stroke="#b05f48" stroke-width="8" fill="none" stroke-linecap="round"/>`
  + `<ellipse cy="-62" rx="22" ry="7" fill="#e08f72"/><circle cy="-72" r="5" fill="#e8c489"/>`);
onTop('pothos', () => vessel(23, 18, 32, '#8f8f7e', '#b3b39d', '#453c2c')
  + `<path d="M-14-32q-26 8-30 32m42-32q-5 22 4 36m16-38q24 8 28 30" stroke="#4f7a4a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
  + [[-42, -4, .85, -58], [-28, -22, .8, -32], [0, 2, .85, 4], [30, -6, .82, 38], [44, -4, .8, 64], [-14, -50, .88, -14], [20, -54, .85, 18]]
    .map(([x, y, s, a]) => leaf(x, y, s, a, '#5f9150')).join(''));

// ── Things that hang on a wall ───────────────────────────────────────────────
// Drawn flat; the room skews them into the plane of whichever wall they hang on.
const onWall = (id, art) => { symbols[id] = `<g transform="translate(${SYM.ax} ${SYM.ay})">${art}</g>`; };
const framed = (art, mat = '#efe6cc') => `<rect x="-52" y="-124" width="104" height="124" rx="4" fill="#7c5436"/>`
  + `<rect x="-56" y="-128" width="104" height="124" rx="4" fill="#a9754b"/>`
  + `<rect x="-47" y="-119" width="86" height="106" fill="${mat}"/>${art}`;
onWall('print-botanical', framed(`<path d="M-5-26v-66" stroke="#5c7447" stroke-width="3"/>`
  + [[-22, -82, .85, -52], [14, -88, .85, 44], [-18, -52, .75, -36], [10, -56, .75, 32]].map(([x, y, s, a]) => leaf(x, y, s, a, '#6d8f55')).join('')));
onWall('print-sunset', framed(`<rect x="-47" y="-119" width="86" height="106" fill="#f2cf9d"/><circle cx="-4" cy="-72" r="20" fill="#e08457"/>`
  + `<path d="M-47-44q22-22 42-7q18-15 44 2v36h-86Z" fill="#9d5a46"/><path d="M-47-30q25-13 42-2q19-11 44 0v19h-86Z" fill="#6f4036"/>`));
onWall('print-moon', framed(`<rect x="-47" y="-119" width="86" height="106" fill="#2c3f5e"/>`
  + [[-26, -92, 9], [-4, -92, 12], [18, -92, 9], [-26, -44, 7], [-4, -44, 13], [18, -44, 7]]
    .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e6dcb6" opacity="${i === 1 || i === 4 ? 1 : .5}"/>`).join('')));
onWall('cork-board', `<rect x="-62" y="-116" width="124" height="112" rx="5" fill="#8a5f3a"/>`
  + `<rect x="-55" y="-109" width="110" height="98" rx="2" fill="#c9a06a"/>`
  + [['#e8dcc0', -40, -94, -8], ['#cfe0d2', -4, -100, 5], ['#e6b9a2', 26, -88, -4], ['#d9d2a8', -20, -56, 6], ['#bcd4cf', 20, -50, -7]]
    .map(([c, x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-17" y="-15" width="34" height="30" fill="${c}"/><circle cy="-11" r="3" fill="#b8564a"/></g>`).join(''));
onWall('goal-board', `<rect x="-64" y="-118" width="128" height="114" rx="5" fill="#3f5a4c"/>`
  + `<rect x="-57" y="-111" width="114" height="100" rx="2" fill="#24413a"/>`
  + [0, 1, 2, 3].map(i => `<g transform="translate(-44 ${-96 + i * 22})"><rect width="12" height="12" rx="2" fill="none" stroke="#9fc4ae" stroke-width="2.5"/>`
    + (i < 2 ? `<path d="M2 6l4 4 7-9" stroke="#e8c87f" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : '')
    + `<path d="M22 6h${48 - i * 7}" stroke="#7da58f" stroke-width="3" stroke-linecap="round"/></g>`).join(''));

// The shared art bible now governs the entire atlas. Legacy decorative drawings
// use the same subtle outline; furniture has four independently rendered views.
for (const item of ITEMS) {
  if (item.rotatable) {
    for (const rotation of [0, 90, 180, 270]) symbols[`${item.id}--${rotation}`] = furnitureSprite(item, rotation);
    symbols[item.id] = `<use href="#${item.id}--0"/>`;
  } else if (symbols[item.id]) {
    symbols[item.id] = `<g stroke="#493d32" stroke-width="1.25" stroke-linejoin="round">${symbols[item.id]}</g>`;
  }
}

writeFileSync(new URL('objects.svg', base),
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none">${DEFS}${NL}`
  + Object.entries(symbols).map(([id, art]) =>
    `<symbol id="${id}" viewBox="0 0 ${SYM.w} ${SYM.h}" overflow="visible">${art}</symbol>`).join(NL)
  + `${NL}</svg>${NL}`);
console.log(`${Object.keys(symbols).length} object symbols regenerated.`);
