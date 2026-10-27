/* Generates the empty room: walls, floor, plinth and window, once per room size.
 * Run with `node tools/draw-room.mjs`. The room ships EMPTY — every stick of
 * furniture is a placeable object now, so nothing is baked into these layers.
 */
import { p, pts, polygon, line, ellipse, box, plane, makeBox, makePlane, CELL, ORIGIN, TILT, save, NL } from './lib.mjs';

const base = new URL('../assets/', import.meta.url);
const SIZES = { small: 4, medium: 5, large: 6 };

for (const [name, cells] of Object.entries(SIZES)) {
  const F = cells * CELL;                 // floor extent in world units
  const H = Math.round(300 + F * .15);    // wall height; taller rooms feel taller
  const SKIRT = 19, RAIL = 124;
  // Screen anchors for the four floor corners.
  const back = p(0, 0), left = p(0, F), right = p(F, 0), front = p(F, F);
  const topBack = [back[0], back[1] - H], topLeft = [left[0], left[1] - H], topRight = [right[0], right[1] - H];
  const r = 26, rx = 24, ry = 24 * TILT;  // rounded crown corners
  const n = v => +v.toFixed(1);

  const wallL = (y0, z0, y1, z1) => [p(0, y0, z0), p(0, y1, z0), p(0, y1, z1), p(0, y0, z1)];
  const wallR = (x0, z0, x1, z1) => [p(x0, 0, z0), p(x1, 0, z0), p(x1, 0, z1), p(x0, 0, z1)];
  const seam = (a, b, width, opacity) => line(a, b, '#04170f', width, `opacity="${opacity}" filter="url(#soft)"`);

  // Wall faces, each closing on the inner corner so the two meet cleanly.
  const leftFace = `M${n(left[0])} ${n(left[1])}V${n(topLeft[1] + r)}Q${n(topLeft[0])} ${n(topLeft[1])} ${n(topLeft[0] + rx)} ${n(topLeft[1] + ry)}L${n(topBack[0])} ${n(topBack[1])}L${n(back[0])} ${n(back[1])}Z`;
  const rightFace = `M${n(right[0])} ${n(right[1])}V${n(topRight[1] + r)}Q${n(topRight[0])} ${n(topRight[1])} ${n(topRight[0] - rx)} ${n(topRight[1] + ry)}L${n(topBack[0])} ${n(topBack[1])}L${n(back[0])} ${n(back[1])}Z`;
  const crown = `M${n(left[0])} ${n(left[1])}V${n(topLeft[1] + r)}Q${n(topLeft[0])} ${n(topLeft[1])} ${n(topLeft[0] + rx)} ${n(topLeft[1] + ry)}L${n(topBack[0])} ${n(topBack[1])}L${n(topRight[0] - rx)} ${n(topRight[1] + ry)}Q${n(topRight[0])} ${n(topRight[1])} ${n(topRight[0])} ${n(topRight[1] + r)}V${n(right[1])}`;

  // Plinth: the slab the whole model stands on. Drawn as two shapes — the band
  // of its front faces, then the warm cut top — because one path that closes and
  // then keeps drawing restarts from the wrong corner.
  const T = 46;
  const PL = [n(left[0] - 14), n(left[1] + 2)], PR = [n(right[0] + 14), n(right[1] + 2)];
  const PF = [n(front[0]), n(front[1] + 17)], PB = [n(back[0]), n(back[1] - 3)];
  const plinthTop = `M${PL[0]} ${PL[1]}L${PB[0]} ${PB[1]}L${PR[0]} ${PR[1]}L${PF[0]} ${PF[1]}Z`;
  const plinthSide = `M${PL[0]} ${PL[1]}L${PF[0]} ${PF[1]}L${PR[0]} ${PR[1]}L${PR[0]} ${PR[1] + T}L${PF[0]} ${PF[1] + T}L${PL[0]} ${PL[1] + T}Z`;
  let shell = ellipse(700, n(front[1] + T + 26), n(F * .95), n(F * .13), '#040a08', 'opacity=".8" filter="url(#soft)"')
    + `<path d="${plinthSide}" fill="#243529"/>`
    + `<path d="M${PL[0]} ${PL[1] + T - 13}L${PF[0]} ${PF[1] + T - 13}L${PR[0]} ${PR[1] + T - 13}" stroke="#121c16" stroke-width="16" fill="none" opacity=".75"/>`
    + `<path d="${plinthTop}" fill="#dc9b6a"/>`
    + `<path d="M${PL[0]} ${PL[1] + 4}L${PF[0]} ${PF[1] + 4}L${PR[0]} ${PR[1] + 4}" stroke="#f6c896" stroke-width="5" fill="none" opacity=".55"/>`
    + `<defs><linearGradient id="wallL" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#397f67"/><stop offset=".6" stop-color="#24624f"/><stop offset="1" stop-color="#174c40"/></linearGradient>`
    + `<linearGradient id="wallR" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#164a40"/><stop offset="1" stop-color="#2f7160"/></linearGradient></defs>`
    + `<path d="${leftFace}" fill="url(#wallL)"/><path d="${rightFace}" fill="url(#wallR)"/>`;

  // Plank floor, laid along the left wall.
  shell += polygon([p(0, 0), p(F, 0), p(F, F), p(0, F)], '#c68a58');
  for (let y = 60; y < F; y += 60) shell += line(p(0, y), p(F, y), '#8e5f3c', 2, 'opacity=".5"');
  for (let y = 0; y < F; y += 60) for (let x = (y / 60 % 2 ? 100 : 230); x < F; x += 260)
    shell += line(p(x, y + 2), p(x, Math.min(F, y + 58)), '#9a6a44', 1.7, 'opacity=".5"');

  // Wainscot with a capping rail, then skirting, then the contact seams.
  shell += polygon(wallL(0, 0, F, RAIL), '#2a6655') + polygon(wallR(0, 0, F, RAIL), '#235a4b');
  for (let y = 66; y < F; y += 66) shell += line(p(0, y, SKIRT + 8), p(0, y, RAIL - 10), '#154438', 3, 'opacity=".45"');
  for (let x = 66; x < F; x += 66) shell += line(p(x, 0, SKIRT + 8), p(x, 0, RAIL - 10), '#123e34', 3, 'opacity=".45"');
  shell += line(p(0, 0, RAIL), p(0, F, RAIL), '#63ad8e', 5, 'opacity=".75"') + line(p(0, 0, RAIL), p(F, 0, RAIL), '#539b7f', 5, 'opacity=".75"');
  shell += polygon(wallL(0, 0, F, SKIRT), '#27604f') + polygon(wallR(0, 0, F, SKIRT), '#20574a');
  shell += line(p(0, 0, SKIRT), p(0, F, SKIRT), '#6fb393', 3, 'opacity=".6"') + line(p(0, 0, SKIRT), p(F, 0, SKIRT), '#5ea183', 3, 'opacity=".6"');

  // Light falls off toward the ceiling; the inner corner is the darkest place.
  shell += `<defs><linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${n(topBack[1])}" x2="0" y2="${n(front[1])}"><stop stop-color="#02100b" stop-opacity=".58"/><stop offset=".55" stop-color="#02100b" stop-opacity=".14"/><stop offset="1" stop-color="#02100b" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="aoL" gradientUnits="userSpaceOnUse" x1="700" y1="0" x2="584" y2="0"><stop stop-color="#03150f" stop-opacity=".6"/><stop offset="1" stop-color="#03150f" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="aoR" gradientUnits="userSpaceOnUse" x1="700" y1="0" x2="816" y2="0"><stop stop-color="#03150f" stop-opacity=".5"/><stop offset="1" stop-color="#03150f" stop-opacity="0"/></linearGradient></defs>`;
  shell += `<path d="${leftFace}" fill="url(#fade)"/><path d="${rightFace}" fill="url(#fade)"/>`;
  shell += polygon(wallL(0, 0, 116, H), 'url(#aoL)') + polygon(wallR(0, 0, 116, H), 'url(#aoR)');
  shell += seam(p(0, 0, 0), p(0, 0, H), 22, '.5');
  shell += seam(p(0, 0), p(0, F), 26, '.42') + seam(p(0, 0), p(F, 0), 26, '.4');
  shell += seam(p(0, F), p(F, F), 20, '.22') + seam(p(F, 0), p(F, F), 20, '.22');
  shell += line(p(0, F, 5), p(F, F, 5), '#e7ab73', 4, 'opacity=".45"') + line(p(F, 0, 5), p(F, F, 5), '#e7ab73', 4, 'opacity=".45"');
  shell += `<path d="${crown}" stroke="#0e2b25" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    + `<path d="${crown}" stroke="#56997e" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    + `<path d="${crown}" stroke="#7ec0a0" stroke-width="3" stroke-linejoin="round" fill="none" opacity=".4"/>`;
  save(base, `room/shell-${name}.svg`, shell);

  // A flat silhouette of the same room, used to mask the lighting passes. It
  // deliberately leaves out the ground shadow: masking with the blurred shadow
  // leaves a visible ring where its alpha falls off.
  save(base, `room/mask-${name}.svg`,
    `<path d="${plinthSide}" fill="#fff"/><path d="${plinthTop}" fill="#fff"/>`
    + `<path d="${leftFace}" fill="#fff"/><path d="${rightFace}" fill="#fff"/>`
    + polygon([p(0, 0), p(F, 0), p(F, F), p(0, F)], '#fff')
    + `<path d="${crown}" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);

  // ── Window ────────────────────────────────────────────────────────────────
  // Sits on the right wall, sized and placed from the grid so it scales with
  // the room instead of being pinned to one hand-tuned position.
  const wx = F * .5, ww = Math.min(F * .46, CELL * 2.3), wh = CELL * 2.1, sill = H * .36;
  const glass = (fill, extra = '') => {
    const corners = [[wx - ww / 2, sill], [wx + ww / 2, sill], [wx + ww / 2, sill + wh], [wx - ww / 2, sill + wh]];
    return polygon(corners.map(([x, z]) => p(x, 0, z)), fill, extra);
  };
  const mullions = line(p(wx, 0, sill), p(wx, 0, sill + wh), '#cfc3a4', 9)
    + line(p(wx - ww / 2, 0, sill + wh / 2), p(wx + ww / 2, 0, sill + wh / 2), '#cfc3a4', 9);
  const frame = polygon([[wx - ww / 2 - 13, sill - 13], [wx + ww / 2 + 13, sill - 13], [wx + ww / 2 + 13, sill + wh + 13], [wx - ww / 2 - 13, sill + wh + 13]].map(([x, z]) => p(x, 0, z)), '#123f38')
    + glass('#92c1ba');
  const sillShelf = makeBox(p)(wx - ww / 2 - 16, 0, sill - 24, ww + 32, 13, 9, '#e5b783', '#a9764a', '#c69667', 2);
  const pane = (sky, horizon, land, extras = '') =>
    `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${horizon}"/></linearGradient>`
    + `<clipPath id="pane">${glass('#fff')}</clipPath></defs>`
    + `<g clip-path="url(#pane)">${glass('url(#sky)')}${extras}`
    + polygon([[wx - ww / 2, sill + wh * .42], [wx - ww * .1, sill + wh * .62], [wx + ww * .18, sill + wh * .38], [wx + ww / 2, sill + wh * .58], [wx + ww / 2, sill], [wx - ww / 2, sill]].map(([x, z]) => p(x, 0, z)), land)
    + `</g>${mullions}`;

  save(base, `room/window-${name}.svg`, frame + pane('#79b9c3', '#d7dbb0', '#529b91') + sillShelf);
  save(base, `room/window-${name}-sunset.svg`, pane('#ba9e9e', '#f4b778', '#5c8583', ellipse(...p(wx + ww * .2, 0, sill + wh * .68), 26, 26, '#ffd69b')));
  save(base, `room/window-${name}-night.svg`, pane('#183c57', '#315c68', '#254b54',
    `<path d="M${pts([p(wx + ww * .22, 0, sill + wh * .78)])}m0 0a20 20 0 1 0 10 34a21 21 0 0 1-10-34Z" fill="#d9d5b6"/>`
    + [[-.3, .86], [.05, .62], [-.12, .72]].map(([u, v]) => ellipse(...p(wx + ww * u, 0, sill + wh * v), 1.6, 1.6, '#d7dabd')).join('')));
  save(base, `room/window-${name}-rain.svg`, pane('#658a96', '#95acaf', '#386b68'));

  // ── Daylight on the floor ─────────────────────────────────────────────────
  // The window's four panes cast onto the floor. The gaps between them are the
  // shadow of the mullions, which is what makes it read as light from a window
  // rather than a glow.
  const cast = (x, z) => p(x + z * .05, z * .75);
  const castPane = (x0, z0, x1, z1) => polygon([cast(x0, z0), cast(x1, z0), cast(x1, z1), cast(x0, z1)], 'url(#day)');
  const g = 7, half = ww / 2 - g, mid = sill + wh / 2;
  const daylight = `<defs><linearGradient id="day" gradientUnits="userSpaceOnUse" x1="${n(p(wx, 0, sill)[0] + 120)}" y1="${n(p(wx, 0, 0)[1] + 80)}" x2="${n(p(wx, 0, sill)[0] - 180)}" y2="${n(p(wx, 0, 0)[1] + 220)}"><stop stop-color="#fffaec"/><stop offset=".55" stop-color="#f6efd9" stop-opacity=".78"/><stop offset="1" stop-color="#e2ecf4" stop-opacity=".26"/></linearGradient>`
    + `<filter id="pool" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter></defs>`
    + `<g filter="url(#pool)">${castPane(wx - half, mid + g, wx - g, sill + wh)}${castPane(wx + g, mid + g, wx + half, sill + wh)}`
    + `${castPane(wx - half, sill, wx - g, mid - g)}${castPane(wx + g, sill, wx + half, mid - g)}</g>`;
  save(base, `room/light-${name}.svg`, daylight);
}

console.log(`Room shells regenerated for ${Object.keys(SIZES).join(', ')} (no runtime/build dependency).`);
