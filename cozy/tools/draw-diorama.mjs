/* Optional illustration source. Run with Node to regenerate the local SVG layers.
 * This is an art tool, not a build step. The browser serves the generated SVGs.
 * Orthographic projection: warm miniature objects, two visible faces + top. */
import { writeFileSync, mkdirSync } from 'node:fs';
const base = new URL('../assets/', import.meta.url);
const p = (x, y, z = 0) => [700 + x - y, 480 + (x + y) * .36 - z];
const NL = String.fromCharCode(10);
const pts = points => points.map(a => a.map(n => +n.toFixed(2)).join(',')).join(' ');
const polygon = (points, fill, extra = '') => `<polygon points="${pts(points)}" fill="${fill}" ${extra}/>`;
const line = (a, b, color, width = 2, extra = '') => `<path d="M${a}L${b}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const plane = (x, y, z, w, d, color, extra = '') => polygon([p(x,y,z),p(x+w,y,z),p(x+w,y+d,z),p(x,y+d,z)],color,extra);
// A box is three visible faces: front, side and top. Taking the projection as a
// parameter lets catalogue objects be built in their own 160x180 symbol box
// while keeping exactly the same geometry as the room.
const makeBox = P => (x,y,z,w,d,h,top,front,side,round=3) =>
  polygon([P(x,y+d,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x,y+d,z+h)],front,`stroke="${front}" stroke-width="${round}" stroke-linejoin="round"`)
  + polygon([P(x+w,y,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x+w,y,z+h)],side,`stroke="${side}" stroke-width="${round}" stroke-linejoin="round"`)
  + polygon([P(x,y,z+h),P(x+w,y,z+h),P(x+w,y+d,z+h),P(x,y+d,z+h)],top,`stroke="${top}" stroke-width="${round}" stroke-linejoin="round"`);
const box = makeBox(p);
const shadow = (x,y,rx,ry,opacity=.28) => ellipse(x,y,rx,ry,'#0c211a',`opacity="${opacity}" filter="url(#soft)"`);
const defs = `<defs>
 <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="contact" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#09251e" flood-opacity=".45"/></filter>
 <linearGradient id="left-wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#397f67"/><stop offset=".6" stop-color="#24624f"/><stop offset="1" stop-color="#174c40"/></linearGradient>
 <linearGradient id="right-wall" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#164a40"/><stop offset="1" stop-color="#347968"/></linearGradient>
 <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#b67b4f"/><stop offset="1" stop-color="#d19561"/></linearGradient>
 <radialGradient id="warm"><stop stop-color="#ffd086" stop-opacity=".4"/><stop offset="1" stop-color="#ffbe73" stop-opacity="0"/></radialGradient>
 <radialGradient id="screen"><stop stop-color="#a4dbc3"/><stop offset="1" stop-color="#599e91"/></radialGradient>
 <linearGradient id="pot"><stop stop-color="#e99570"/><stop offset=".5" stop-color="#cf6d55"/><stop offset="1" stop-color="#9b4f42"/></linearGradient>
 <linearGradient id="leaf"><stop stop-color="#93c86d"/><stop offset="1" stop-color="#408857"/></linearGradient>
 <linearGradient id="cloth"><stop stop-color="#d1795a"/><stop offset="1" stop-color="#914c3a"/></linearGradient>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#79b9c3"/><stop offset="1" stop-color="#d7dbb0"/></linearGradient>
 <linearGradient id="wainscot-left" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2d6c58"/><stop offset="1" stop-color="#1b5244"/></linearGradient>
 <linearGradient id="wainscot-right" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#174b40"/><stop offset="1" stop-color="#2a6755"/></linearGradient>
 <linearGradient id="ao-corner-left" gradientUnits="userSpaceOnUse" x1="700" y1="0" x2="584" y2="0"><stop stop-color="#03150f" stop-opacity=".62"/><stop offset="1" stop-color="#03150f" stop-opacity="0"/></linearGradient>
 <linearGradient id="ao-corner-right" gradientUnits="userSpaceOnUse" x1="700" y1="0" x2="816" y2="0"><stop stop-color="#03150f" stop-opacity=".52"/><stop offset="1" stop-color="#03150f" stop-opacity="0"/></linearGradient>
 <linearGradient id="wall-fade" gradientUnits="userSpaceOnUse" x1="0" y1="86" x2="0" y2="560"><stop stop-color="#02100b" stop-opacity=".58"/><stop offset=".55" stop-color="#02100b" stop-opacity=".14"/><stop offset="1" stop-color="#02100b" stop-opacity="0"/></linearGradient>
 <radialGradient id="floor-bounce"><stop stop-color="#ffd9a2" stop-opacity=".22"/><stop offset="1" stop-color="#ffd9a2" stop-opacity="0"/></radialGradient>
 <linearGradient id="daylight" gradientUnits="userSpaceOnUse" x1="880" y1="560" x2="580" y2="700"><stop stop-color="#fffaec" stop-opacity="1"/><stop offset=".55" stop-color="#f6efd9" stop-opacity=".78"/><stop offset="1" stop-color="#e2ecf4" stop-opacity=".26"/></linearGradient>
 <filter id="pool" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
 <radialGradient id="halo"><stop stop-color="#e8f4ff" stop-opacity=".3"/><stop offset="1" stop-color="#e8f4ff" stop-opacity="0"/></radialGradient>
</defs>`;
function save(file, content) {
  mkdirSync(new URL('./',new URL(file,base)),{recursive:true});
  writeFileSync(new URL(file,base),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900" fill="none">${defs}\n${content}</svg>\n`);
}

// ── Room shell ───────────────────────────────────────────────────────────────
// A thick-walled maquette: two slab walls standing on a plinth, over a plank
// floor. Surface detail is drawn on the wall planes so it keeps the projection,
// and every meeting of two surfaces gets a blurred contact seam (fake AO) —
// that seam is what makes the room read as a physical model rather than flat art.
const FLOOR = 484, SKIRT = 19, RAIL = 124;
const wallL = (y0, z0, y1, z1) => [p(0, y0, z0), p(0, y1, z0), p(0, y1, z1), p(0, y0, z1)];
const wallR = (x0, z0, x1, z1) => [p(x0, 0, z0), p(x1, 0, z0), p(x1, 0, z1), p(x0, 0, z1)];
const seam = (a, b, width, opacity, color = '#04170f') => line(a, b, color, width, `opacity="${opacity}" filter="url(#soft)"`);

// Plinth: a chunky base with a dark underside so the model has visible mass.
let shell = `<ellipse cx="703" cy="822" rx="438" ry="57" fill="#040a08" opacity=".78" filter="url(#soft)"/>
<path d="M202 655L700 478L1198 655V692Q1198 706 1184 711L723 879Q700 888 678 879L217 711Q202 705 202 689Z" fill="#2b3d33"/>
<path d="M202 672L700 495L1198 672V692Q1198 706 1184 711L723 879Q700 888 678 879L217 711Q202 705 202 689Z" fill="#131e18" opacity=".85"/>
<path d="M202 655L700 478L1198 655L715 833Q700 840 685 833Z" fill="#dc9b6a"/>
<path d="M202 658L686 834Q700 840 714 834L1198 658" stroke="#f6c896" stroke-width="5" opacity=".6"/>
<path d="M216 654V287Q216 261 241 252L674 96Q700 86 700 113V480Z" fill="url(#left-wall)"/>
<path d="M700 113Q700 86 726 96L1159 252Q1184 261 1184 287V654L700 480Z" fill="url(#right-wall)"/>`;
// Plank floor, laid along the left wall and tinted toward the open front edges.
shell += polygon([p(0,0),p(FLOOR,0),p(FLOOR,FLOOR),p(0,FLOOR)],'url(#floor)');
for (let y = 60; y < FLOOR; y += 60) shell += line(p(0,y), p(FLOOR,y), '#8e5f3c', 2, 'opacity=".5"');
for (let y = 0; y < 480; y += 60) for (let x = (y/60 % 2 ? 100 : 230); x < FLOOR; x += 260) shell += line(p(x,y+2), p(x,Math.min(FLOOR,y+58)), '#9a6a44', 1.7, 'opacity=".5"');
// Wainscot panelling with a capping rail, then the skirting board beneath it.
shell += polygon(wallL(0,0,FLOOR,RAIL),'url(#wainscot-left)') + polygon(wallR(0,0,FLOOR,RAIL),'url(#wainscot-right)');
for (let y = 66; y < FLOOR; y += 66) shell += line(p(0,y,SKIRT+8), p(0,y,RAIL-10), '#154438', 3, 'opacity=".5"');
for (let x = 66; x < FLOOR; x += 66) shell += line(p(x,0,SKIRT+8), p(x,0,RAIL-10), '#123e34', 3, 'opacity=".5"');
shell += line(p(0,0,RAIL), p(0,FLOOR,RAIL), '#63ad8e', 5, 'opacity=".75"') + line(p(0,0,RAIL), p(FLOOR,0,RAIL), '#539b7f', 5, 'opacity=".75"');
shell += polygon(wallL(0,0,FLOOR,SKIRT),'#27604f') + polygon(wallR(0,0,FLOOR,SKIRT),'#20574a');
shell += line(p(0,0,SKIRT), p(0,FLOOR,SKIRT), '#6fb393', 3, 'opacity=".6"') + line(p(0,0,SKIRT), p(FLOOR,0,SKIRT), '#5ea183', 3, 'opacity=".6"');
// Light falls off toward the ceiling, and the inner corner is the darkest place.
shell += `<path d="M216 654V287Q216 261 241 252L674 96Q700 86 700 113V480Z" fill="url(#wall-fade)"/>
<path d="M700 113Q700 86 726 96L1159 252Q1184 261 1184 287V654L700 480Z" fill="url(#wall-fade)"/>`;
shell += polygon(wallL(0,0,116,420),'url(#ao-corner-left)') + polygon(wallR(0,0,116,420),'url(#ao-corner-right)');
// Contact seams: wall-to-wall, wall-to-floor, and the floor's own outer edges.
shell += seam(p(0,0,0), p(0,0,400), 22, '.5');
shell += seam(p(0,0), p(0,FLOOR), 26, '.42') + seam(p(0,0), p(FLOOR,0), 26, '.4');
shell += seam(p(0,FLOOR), p(FLOOR,FLOOR), 20, '.22') + seam(p(FLOOR,0), p(FLOOR,FLOOR), 20, '.22');
// A warm bounce under the desk lamp stays baked in; daylight gets its own layer.
shell += ellipse(...p(300,150), 190, 86, 'url(#floor-bounce)', 'filter="url(#soft)"');
// The open edges of the floor catch the light — it reads as a cut slab.
shell += line(p(0,FLOOR,5), p(FLOOR,FLOOR,5), '#e7ab73', 4, 'opacity=".45"') + line(p(FLOOR,0,5), p(FLOOR,FLOOR,5), '#e7ab73', 4, 'opacity=".45"');
// Thick exposed wall edges and the curved crown, drawn last so they stay crisp.
shell += `<path d="M216 654V287Q216 261 241 252L674 96Q700 86 726 96L1159 252Q1184 261 1184 287V654" stroke="#0e2b25" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M216 646V280Q216 253 243 245L674 89Q700 80 726 89L1157 245Q1184 253 1184 280V646" stroke="#56997e" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M216 640V277Q216 252 244 243L676 86Q700 77 724 86L1156 243Q1184 252 1184 277V640" stroke="#7ec0a0" stroke-width="3" stroke-linejoin="round" fill="none" opacity=".4"/>`;
save('room/shell.svg',shell);

// ── Daylight ─────────────────────────────────────────────────────────────────
// The window's four panes projected onto the floor. The gaps between them are
// the shadow of the mullions, which is what makes the pool read as window light
// rather than a glow. The app fades this layer with the time of day.
const cast = (x, z) => p(x + z * .05, z * .75);
const pane = (x0, z0, x1, z1) => polygon([cast(x0,z0),cast(x1,z0),cast(x1,z1),cast(x0,z1)], 'url(#daylight)');
let daylight = `<g filter="url(#pool)">${pane(98,253,191,334)}${pane(201,253,296,334)}${pane(98,162,191,243)}${pane(201,162,296,243)}</g>`;
// A softer halo ties the four panes together and lifts the wall beside them.
daylight += ellipse(...cast(197, 248), 190, 108, 'url(#halo)', 'filter="url(#soft)"');
save('room/light-floor.svg', daylight);

// A deep window on the right wall. Lighting states replace only its glass.
const windowShape = `<g transform="matrix(1 .36 0 1 790 170)"><rect x="-10" y="-10" width="234" height="208" rx="12" fill="#123f38"/><rect width="214" height="188" rx="7" fill="#92c1ba"/><rect x="8" y="8" width="198" height="172" rx="3" fill="url(#sky)"/><path d="M8 130Q60 80 109 120Q153 74 206 113V180H8Z" fill="#529b91"/><path d="M8 160Q70 119 109 153Q156 124 206 146V180H8Z" fill="#32746b"/><path d="M106 0V188M0 94H214" stroke="#b6c4a8" stroke-width="9"/><rect width="214" height="188" rx="7" stroke="#d9cfb0" stroke-width="10" fill="none"/><path d="M-10 196H224" stroke="#c69667" stroke-width="16" stroke-linecap="round"/><path d="M-13 189H220" stroke="#e5b783" stroke-width="7" stroke-linecap="round"/></g>`;
save('room/window.svg',windowShape);
for (const phase of ['sunset','night','rain']) {
 const sky = phase==='night' ? '#183c57' : phase==='rain' ? '#658a96' : '#ba9e9e';
 const horizon = phase==='night' ? '#315c68' : phase==='rain' ? '#95acaf' : '#f4b778';
 const landscape = phase==='night' ? '#254b54' : '#5c8583';
 const glow = phase==='night' ? `<path d="M163 23a20 20 0 1 0 10 34a21 21 0 0 1-10-34Z" fill="#d9d5b6"/><g fill="#d7dabd"><circle cx="39" cy="24" r="1.4"/><circle cx="74" cy="61" r="1.2"/><circle cx="124" cy="33" r="1.4"/></g>` : phase==='sunset' ? '<circle cx="158" cy="94" r="27" fill="#ffd69b"/>' : '';
 save(`room/window-${phase}.svg`,`<defs><linearGradient id="phase-sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${horizon}"/></linearGradient><clipPath id="glass"><path d="M8 8h93v81H8ZM111 8h95v81H111ZM8 99h93v81H8ZM111 99h95v81H111Z"/></clipPath></defs><g transform="matrix(1 .36 0 1 790 170)" clip-path="url(#glass)"><rect x="8" y="8" width="198" height="172" fill="url(#phase-sky)"/>${glow}<path d="M8 130Q60 80 109 120Q153 74 206 113V180H8Z" fill="${landscape}"/><path d="M8 160Q70 119 109 153Q156 124 206 146V180H8Z" fill="${phase==='night'?'#173e47':'#386b68'}"/></g>`);
}
// Small artwork, wall ledge, peg rail and soft practical light.
let wall=`<g transform="matrix(1 .36 0 1 1068 336)" filter="url(#contact)"><rect width="66" height="85" rx="4" fill="#a36242"/><rect x="6" y="6" width="54" height="73" rx="2" fill="#e7b15e"/><circle cx="33" cy="30" r="16" fill="#e27855"/><path d="M6 61Q29 38 60 56V79H6Z" fill="#3f8069"/><path d="M6 72Q37 54 60 66V79H6Z" fill="#285f53"/></g>`;
// The wall above the bookcase is deliberately left bare: it is where the
// wall-left slot hangs, and the room is meant to start unfinished.
wall+=box(405,3,132,52,29,8,'#c49260','#815b40','#9d7049');
wall+=`<g transform="translate(1126 462)"><ellipse cy="23" rx="15" ry="6" fill="#142e24" opacity=".4"/><path d="M-13-7H13L10 22Q0 28-10 22Z" fill="#c5a862"/><ellipse cy="-7" rx="13" ry="5" fill="#ead3a0"/><path d="M0-9Q-11-22 1-35Q12-20 0-9Z" fill="#ffe0a0"/>${ellipse(0,-17,35,42,'url(#warm)')}</g>`;
save('room/wall-decor.svg',wall);

// The bookshelf is a real deep object, built in the left wall's perspective.
let shelf=shadow(465,626,160,31,.34);
shelf+=box(13,153,0,65,277,310,'#ae7950','#674b36','#4c382a',5);
// Dark inset front, divided into four cavities.
shelf+=polygon([p(82,161,12),p(82,421,12),p(82,421,300),p(82,161,300)],'#392f25');
for (const z of [12,87,162,237,305]) shelf+=box(20,153,z,70,277,10,'#bc8d5b','#87603d','#a5754b',3);
// Back-to-front order gives each spine a top and an exposed fore edge.
const colors=[['#65a8aa','#467d83','#326469'],['#e8b65a','#c58b37','#a4752e'],['#d77c62','#b76048','#944632'],['#91af79','#6e8e58','#526d42'],['#b4b7a1','#969b81','#777f67'],['#8b8db3','#6b6e91','#535575']];
for (let row=0;row<4;row++) {
  let y=175;
  for(let n=0;n<(row===2?4:8);n++) {
    const c=colors[(row*3+n)%colors.length],width=13+(n*7%10),height=42+(n*13+row*7)%22,z=22+row*75;
    shelf+=box(44,y,z,43,width,height,...c,2);
    shelf+=line(p(88,y+3,z+height-9),p(88,y+width-3,z+height-9),'#f2deaa',2,'opacity=".65"');
    y+=width+4;
  }
}
// Space for the user's own book spines is deliberately left on the middle shelf.
shelf+=box(44,341,22,42,61,19,'#d7c8a5','#b95f4d','#924638');
shelf+=box(43,346,42,38,55,12,'#e5d9b5','#5e999d','#45767c');
// Small ceramic bird, souvenir and mustard storage box.
shelf+=`<g transform="translate(359 402)">${ellipse(0,0,19,13,'#d6ab57')}<circle cx="10" cy="-14" r="11" fill="#e5bb65"/><path d="M18-17l14 5-14 3Z" fill="#bf7647"/><circle cx="12" cy="-16" r="2" fill="#3a4432"/><path d="M-12-1q13-9 20 5" stroke="#ba8d43" stroke-width="3" fill="none"/></g>`;
shelf+=box(45,345,97,42,60,39,'#d3ad65','#a98140','#c29751',4);
shelf+=line(p(89,365,119),p(89,385,119),'#e5c68b',4);
shelf+=box(14,153,8,77,10,306,'#c49660','#7c573b','#a2764c',4);
shelf+=box(14,420,8,77,10,306,'#c49660','#7c573b','#a2764c',4);
save('furniture/bookshelf.svg',shelf);

// Desk and objects share their own plane. Legs are rooted in contact shadows.
let desk=shadow(808,625,176,40,.25);
for(const [x,y] of [[151,83],[355,83],[151,200],[355,200]]) { const q=p(x,y);desk+=shadow(q[0]+4,q[1]+4,15,7,.4)+box(x,y,0,14,14,147,'#b57c4b','#714630','#8b5435',4); }
desk+=box(147,79,140,224,139,16,'#dca36c','#9e653f','#bc8050',8);
desk+=line(p(148,220,155),p(370,220,155),'#ebbd87',3);
desk+=box(303,105,87,53,100,51,'#a97247','#95603d','#b37b4c',4);
desk+=line(p(318,208,115),p(341,208,115),'#573e2d',4);
// Monitor / laptop: a thick body, a soft luminous screen and a tiny mountain desktop.
desk+=box(223,100,157,94,64,5,'#a8beb1','#758e84','#526e64',3);
desk+=plane(235,127,163,68,24,'#425f55');
desk+=plane(257,153,163,25,8,'#8aa497');
desk+=`<g transform="matrix(1 .36 -.12 .96 820 363)" filter="url(#contact)"><rect x="-5" y="-4" width="108" height="77" rx="7" fill="#28483f"/><rect width="98" height="66" rx="4" fill="url(#screen)"/><path d="M0 51L27 27L49 46L68 25L98 50V66H0Z" fill="#4b877c"/><path d="M0 61L31 44L55 60L77 48L98 58V66H0Z" fill="#31665d"/><circle cx="76" cy="18" r="8" fill="#d8d5a1"/></g>`;
// Notebook and pencil.
desk+=box(179,160,158,48,39,5,'#e0cfa9','#c2b18c','#978565',2);
desk+=plane(177,158,164,51,42,'#ce775e',`stroke="#e38b6d" stroke-width="2" stroke-linejoin="round"`);
desk+=line(p(184,158,165),p(184,200,165),'#a85645',3);
desk+=plane(190,168,165,23,14,'#e7d3a7');
desk+=line(p(233,158,165),p(233,199,165),'#e8ba5c',4);
// Catalog, casually placed at the near edge of the desk.
desk+=box(287,190,158,45,27,3,'#e7d7a9','#bdb58e','#97a081',2);
desk+=plane(287,190,162,45,27,'#497d6c');
desk+=plane(295,196,163,17,15,'#e9b567');
// Mint mug, off-center. Curved cylinder highlights add a tactile feel.
desk+=`<g transform="translate(808 485)">${shadow(0,23,17,7,.25)}<path d="M-12-3H12V20Q0 28-12 20Z" fill="#9fbda0"/><path d="M11 1q20-3 13 14q-3 6-12 3" stroke="#adc9aa" stroke-width="6" fill="none"/><ellipse cy="-3" rx="12" ry="5" fill="#d2d5ae"/><ellipse cy="-3" rx="8" ry="3" fill="#75533c"/><path d="M-8 2v16" stroke="#c6d6b2" stroke-width="3"/></g>`;
// Mushroom task lamp and tiny tactile timer.
desk+=`<g transform="translate(943 446)">${shadow(0,40,27,9,.3)}<ellipse cy="36" rx="26" ry="8" fill="#cc9a4f"/><path d="M-7-13H7L9 33Q0 42-9 33Z" fill="#e0ad63"/><path d="M-33-8Q-30-48 0-49Q30-48 33-8Q0 7-33-8Z" fill="#e7af59"/><path d="M-27-12Q-23-42 0-43" stroke="#f6ce81" stroke-width="4" fill="none"/><ellipse cy="-7" rx="32" ry="7" fill="#ffe1a0"/></g>`;
desk+=`<g transform="matrix(1 .36 0 1 872 478)"><rect x="-5" y="-5" width="40" height="34" rx="8" fill="#a75942"/><rect width="31" height="23" rx="5" fill="#e2b675"/><rect x="4" y="4" width="23" height="14" rx="3" fill="#3b574a"/><path d="M8 8h5m-5 5h5m5-5h5m-5 5h5" stroke="#d9d6a9" stroke-width="2"/></g>`;
save('furniture/desk.svg',desk);

// Turned coral chair: exaggerated, upholstered, softly bevelled edges.
let chair=shadow(642,709,73,23,.3);
for(const [x,y] of [[237,274],[296,274],[237,337],[296,337]]) {const q=p(x,y);chair+=shadow(q[0],q[1]+2,12,6,.32)+box(x,y,0,9,9,73,'#a77b4e','#674832','#86603e',3);}
chair+=box(230,266,72,78,80,15,'#d68965','#aa5c47','#bc7052',10);
chair+=`<g transform="matrix(1 .36 -.04 1 588 521)" filter="url(#contact)"><path d="M0 20Q0 0 21 0H63Q82 0 82 20V72Q82 85 65 85H17Q0 85 0 68Z" fill="url(#cloth)"/><path d="M8 20Q8 9 20 9H62Q72 9 72 22" stroke="#e6a07b" stroke-width="4" fill="none"/><path d="M14 68H68" stroke="#e19470" stroke-width="3"/><path d="M8 84v30m64-30v30" stroke="#8f6540" stroke-width="7" stroke-linecap="round"/></g>`;
save('furniture/chair.svg',chair);

// Broad glossy-matte leaves (not photorealistic) and a thick coral ceramic pot.
let plant=`<g transform="translate(1040 681)">${shadow(0,9,53,16,.32)}<path d="M-39-51H39L31 2Q1 21-31 2Z" fill="url(#pot)"/><ellipse cy="-51" rx="40" ry="12" fill="#ec9e79"/><ellipse cy="-52" rx="32" ry="8" fill="#594638"/><path d="M-24-43l5 43" stroke="#ed9c77" stroke-width="5"/><path d="M0-52Q-10-139 9-202M0-78l-44-57M2-111l43-57M0-147l-31-36" stroke="#627744" stroke-width="6" stroke-linecap="round"/>`;
for(const [x,y,r,angle] of [[-32,-164,30,-38],[26,-192,35,25],[-44,-126,38,-55],[39,-146,38,45],[20,-94,32,62]]) plant+=`<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 30Q-32 10-24-22Q-4-45 22-25Q37 1 0 30Z" fill="url(#leaf)"/><path d="M0 23V-25" stroke="#b3d57d" stroke-width="2" opacity=".55"/><path d="M0 21Q25-2 17-27Q36-5 0 30Z" fill="#4b8b51" opacity=".6"/></g>`;
plant+='</g>';save('plants/large-plant.svg',plant);

// A sleeping terracotta cat nestled on a round teal cushion, without a pet system.
let cat=`<g transform="translate(827 754)">${shadow(0,16,61,15,.3)}<ellipse cy="6" rx="59" ry="22" fill="#32695c"/><ellipse rx="58" ry="20" fill="#558b73"/><path d="M-39-4Q-48-35-8-40Q34-45 44-14Q52 9 7 12Z" fill="#d5a16a"/><path d="M-38-20l-1-22 17 12 18-11-1 22" fill="#dcac74"/><path d="M-36-37l9 8-9 3m24-9-8 9 8-2" fill="#ae7555"/><path d="M-31-18q4 5 9 0m8-1q4 5 9 0" stroke="#69472f" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M30-27Q0-41-2-17Q-5 2 27-3" stroke="#edc28a" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M0-36l4 9m9-11 4 8" stroke="#b17d4c" stroke-width="4" stroke-linecap="round"/></g>`;
save('furniture/cat.svg',cat);

let rug=plane(180,230,2,230,215,'#386c62',`stroke="#2b534b" stroke-width="9" stroke-linejoin="round"`);
rug+=plane(193,243,3,204,189,'none',`stroke="#82a08a" stroke-width="3"`);
rug+=plane(208,258,3,174,159,'none',`stroke="#739783" stroke-width="2"`);
for(let x=190;x<405;x+=13)rug+=line(p(x,447,2),p(x,458,2),'#a5ac86',2);
save('room/rug.svg',rug);
console.log('Diorama layers regenerated (no runtime/build dependency).');

// ── Catalogue objects ────────────────────────────────────────────────────────
// Every buyable object is drawn in the same orthographic projection as the room,
// so a thing looks like the same physical object in the catalogue and on the
// shelf. Each symbol owns a 160x180 box whose floor line sits at y=150 — that is
// the point a room slot anchors to, so objects of different heights all stand on
// the same surface. Shapes stay simple: a clear silhouette, two or three flat
// tones per material, a contact shadow, and no detail that dies at 90px.
const o = (x, y, z = 0) => [80 + x - y, 150 + (x + y) * .36 - z];
const obox = makeBox(o);
const ground = (rx, opacity = .34, cy = 152) => `<ellipse cx="80" cy="${cy}" rx="${rx}" ry="${(rx * .36).toFixed(1)}" fill="#08231c" opacity="${opacity}" filter="url(#soft)"/>`;
// A tapered vessel: body, a shaded left flank, a rim, and what sits inside it.
const cyl = (cy, rTop, rBot, h, body, rim, inner) => {
  const e = r => +(r * .4).toFixed(1);
  return `<path d="M${80 - rTop} ${cy - h}L${80 - rBot} ${cy - 4}A${rBot} ${e(rBot)} 0 0 0 ${80 + rBot} ${cy - 4}L${80 + rTop} ${cy - h}Z" fill="${body}"/>`
    + `<path d="M${80 - rTop} ${cy - h}L${80 - rBot} ${cy - 4}A${rBot} ${e(rBot)} 0 0 0 ${80 - rBot * .3} ${cy - 4 + e(rBot)}L${80 - rTop * .4} ${cy - h}Z" fill="#06150f" opacity=".17"/>`
    + `<ellipse cx="80" cy="${cy - h}" rx="${rTop}" ry="${e(rTop)}" fill="${rim}"/>`
    + (inner ? `<ellipse cx="80" cy="${cy - h}" rx="${rTop - 4}" ry="${e(rTop - 4)}" fill="${inner}"/>` : '');
};
// Leaves are one shape rotated and scaled: a limited vocabulary keeps every
// plant looking like it came from the same hand.
const leaf = (x, y, size, angle, fill, vein = '#ffffff30', split = false) =>
  `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${size})">`
  + `<path d="M0 14Q-15 4-11-11Q-2-21 10-12Q17 1 0 14Z" fill="${fill}"/>`
  + (split ? `<path d="M-1 10L-8-3M0 4L7-5" stroke="#0c2a1e" stroke-width="1.6" opacity=".38" stroke-linecap="round" fill="none"/>` : '')
  + `<path d="M0 12V-12" stroke="${vein}" stroke-width="1.4"/></g>`;
const symbols = {};

symbols.monstera = ground(30) + cyl(152, 27, 20, 40, '#c4714f', '#e49168', '#4c3a2b')
  + `<path d="M80 112V72m0 26-20-20m22-6 19-17" stroke="#4e6b41" stroke-width="4" fill="none" stroke-linecap="round"/>`
  + [[58, 66, 1.5, -28], [100, 58, 1.7, 26], [66, 36, 1.4, -14], [98, 88, 1.3, 52], [80, 28, 1.2, 4]]
      .map(([x, y, s, a]) => leaf(x, y, s, a, '#5d8a4e', '#9fd07e44', true)).join('');

symbols.fern = ground(28) + cyl(152, 25, 19, 36, '#9aa37e', '#c2caa2', '#43372a')
  + `<g fill="none" stroke="#587a46" stroke-width="3.4" stroke-linecap="round"><path d="M80 116Q62 70 46 58M80 116Q74 62 70 38M80 116Q88 64 94 42M80 116Q100 74 116 62"/></g>`
  + [[46, 58, -62], [70, 38, -14], [94, 42, 16], [116, 62, 64]].map(([x, y, a]) =>
      `<g transform="translate(${x} ${y}) rotate(${a})">${[0, 8, 16, 24].map(d =>
        `<path d="M0 ${d}l-9-5 9-3 9 3Z" fill="#6d9552"/>`).join('')}</g>`).join('');

symbols.pothos = ground(27) + cyl(152, 25, 19, 34, '#8f8f7e', '#b3b39d', '#453c2c')
  + `<path d="M66 116q-26 8-30 32m42-32q-5 22 4 36m16-38q24 8 28 30m-10-34q14-16 10-30" stroke="#4f7a4a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
  + [[38, 146, .85, -58], [52, 128, .8, -32], [80, 152, .85, 4], [110, 144, .82, 38], [124, 146, .8, 64], [66, 100, .88, -14], [100, 96, .85, 18], [112, 80, .75, 34]]
      .map(([x, y, s, a]) => leaf(x, y, s, a, '#5f9150')).join('');

symbols.mushroom = ground(26) + `<path d="M74 116h12l3 32H71Z" fill="#e8dcc0"/><ellipse cx="80" cy="116" rx="7" ry="3" fill="#f2e9d2"/>`
  + `<path d="M46 112Q50 66 80 65Q110 66 114 112Q80 128 46 112Z" fill="#d9834f"/>`
  + `<path d="M53 106Q57 72 79 70" stroke="#efa871" stroke-width="5" fill="none" stroke-linecap="round"/>`
  + `<ellipse cx="80" cy="113" rx="34" ry="9" fill="#f7e2b4"/><ellipse cx="80" cy="113" rx="25" ry="6" fill="#ffd79a" opacity=".8"/>`
  + `<ellipse cx="80" cy="110" rx="52" ry="30" fill="url(#obj-glow)"/>`;

symbols.vintage = ground(24) + obox(-13, -13, 0, 26, 26, 5, '#5f6b63', '#38433d', '#2a332e', 3)
  + `<path d="M80 136V74" stroke="#8d7047" stroke-width="4" stroke-linecap="round"/>`
  + `<path d="M58 70h44l-9-28H67Z" fill="#3f6f5f"/><path d="M58 70h17l-6-28h-2Z" fill="#558a76"/>`
  + `<ellipse cx="80" cy="70" rx="22" ry="6" fill="#ffdfa4"/><ellipse cx="80" cy="42" rx="13" ry="4" fill="#2e5a4c"/>`
  + `<ellipse cx="80" cy="82" rx="40" ry="24" fill="url(#obj-glow)"/>`;

symbols.lantern = ground(22) + obox(-11, -11, 0, 22, 22, 6, '#b2854f', '#7b5634', '#946844', 3)
  + `<path d="M80 128Q44 116 44 86Q44 52 80 48Q116 52 116 86Q116 116 80 128Z" fill="#ead8ae"/>`
  + `<path d="M80 128Q58 116 58 86Q58 54 80 48" stroke="#f6ead0" stroke-width="7" fill="none" opacity=".5"/>`
  + `<path d="M80 48v80M62 56v64m36-64v64" stroke="#c0a376" stroke-width="2" opacity=".55"/>`
  + `<ellipse cx="80" cy="88" rx="46" ry="38" fill="url(#obj-glow)"/>`;

symbols.candle = ground(18) + `<ellipse cx="80" cy="148" rx="22" ry="8" fill="#9a6d4e"/><ellipse cx="80" cy="145" rx="22" ry="8" fill="#c08a63"/>`
  + cyl(144, 13, 14, 44, '#dfa25c', '#f0c184') + `<path d="M80 100v-7" stroke="#53402c" stroke-width="2"/>`
  + `<path d="M80 93q-7-9 0-17q7 8 0 17Z" fill="#ffe3a4"/><ellipse cx="80" cy="88" rx="26" ry="22" fill="url(#obj-glow)"/>`;

symbols.vase = ground(20) + `<path d="M64 150q-9-30 6-42q-12-20 10-28q22 8 10 28q15 12 6 42Z" fill="#cfd9c4"/>`
  + `<path d="M64 150q-9-30 6-42q-12-20 10-28" stroke="#e8f0e0" stroke-width="6" fill="none" opacity=".5"/>`
  + `<ellipse cx="80" cy="80" rx="10" ry="4" fill="#8e9c87"/>`
  + `<path d="M80 80q-10-26-22-34m22 34q2-30 14-38m-14 38q10-22 22-24" stroke="#9c8a5e" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  + [[58, 46, .7, -36], [94, 42, .7, 28], [102, 56, .6, 62]].map(([x, y, s, a]) => leaf(x, y, s, a, '#b8a06a')).join('');

symbols['book-stack'] = ground(26) + [['#6f9ea0', '#4d7a7e', '#3c6165'], ['#d98b63', '#b26847', '#92523a'], ['#cdbd8e', '#a89974', '#8a7c5c']]
  .map(([t, f, si], i) => obox(-20 + (i % 2 ? 3 : -2), -14, i * 13, 40, 28, 12, t, f, si, 2)).join('')
  + obox(-16, -11, 39, 34, 23, 10, '#8f8fb0', '#6b6b91', '#555575', 2);

symbols.teapot = ground(28) + `<path d="M50 112q0-32 30-32t30 32q0 26-30 26t-30-26Z" fill="#c96f55"/>`
  + `<path d="M50 112q0-32 30-32" stroke="#e59277" stroke-width="7" fill="none" opacity=".55"/>`
  + `<path d="M110 92q18-4 16 14q-2 14-16 12" stroke="#b05f48" stroke-width="7" fill="none" stroke-linecap="round"/>`
  + `<path d="M50 94q-16-10-22 4" stroke="#b05f48" stroke-width="8" fill="none" stroke-linecap="round"/>`
  + `<ellipse cx="80" cy="80" rx="22" ry="7" fill="#e08f72"/><ellipse cx="80" cy="76" rx="13" ry="5" fill="#f0ad8e"/>`
  + `<circle cx="80" cy="70" r="5" fill="#e8c489"/>`;

// Framed pieces hang on a wall, so they are drawn flat and the room skews them
// into whichever wall plane their slot belongs to.
const frame = (art, mat = '#efe6cc', wood = '#a9754b', shade = '#7c5436') =>
  `<rect x="34" y="34" width="92" height="112" rx="4" fill="${shade}"/><rect x="31" y="30" width="92" height="112" rx="4" fill="${wood}"/>`
  + `<rect x="40" y="39" width="74" height="94" fill="${mat}"/>${art}`;
symbols['print-botanical'] = frame(`<path d="M77 124V62" stroke="#5c7447" stroke-width="3"/>`
  + [[62, 74, .8, -52], [94, 68, .8, 44], [66, 96, .7, -36], [90, 92, .7, 32]].map(([x, y, s, a]) => leaf(x, y, s, a, '#6d8f55')).join(''));
symbols['print-sunset'] = frame(`<rect x="40" y="39" width="74" height="94" fill="#f2cf9d"/><circle cx="77" cy="80" r="18" fill="#e08457"/>`
  + `<path d="M40 110q20-20 37-6q16-14 37 2v27H40Z" fill="#9d5a46"/><path d="M40 122q22-12 37-2q17-10 37 0v13H40Z" fill="#6f4036"/>`);
symbols['print-moon'] = frame(`<rect x="40" y="39" width="74" height="94" fill="#2c3f5e"/>`
  + [[58, 62, 9], [77, 62, 11], [96, 62, 9], [58, 102, 7], [77, 102, 12], [96, 102, 7]]
      .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e6dcb6" opacity="${i === 1 || i === 4 ? 1 : .5}"/>`).join(''));

// Rugs lie flat on the floor plane, so their symbol is a diamond that the room
// stretches to the width of whichever slot it lands in.
const rugArt = (field, border, line) => `<polygon points="150,4 296,60 150,116 4,60" fill="${field}"/>`
  + `<polygon points="150,4 296,60 150,116 4,60" fill="none" stroke="${border}" stroke-width="7"/>`
  + `<polygon points="150,18 268,60 150,102 32,60" fill="none" stroke="${line}" stroke-width="3" opacity=".8"/>`
  + `<polygon points="150,32 240,60 150,88 60,60" fill="none" stroke="${line}" stroke-width="2" opacity=".55"/>`;
symbols['rug-cream'] = rugArt('#ddcfae', '#bfae8a', '#9f8f6c');
symbols['rug-moss'] = rugArt('#4d6f52', '#3a5640', '#86a473');
symbols['rug-clay'] = rugArt('#b5664d', '#8d4b38', '#dd9876');

const objectDefs = `<defs>
 <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
 <radialGradient id="obj-glow"><stop stop-color="#ffcd85" stop-opacity=".5"/><stop offset="1" stop-color="#ffbe73" stop-opacity="0"/></radialGradient>
</defs>`;
writeFileSync(new URL('objects.svg', base), `<svg xmlns="http://www.w3.org/2000/svg" fill="none">${objectDefs}\n`
  + Object.entries(symbols).map(([id, art]) =>
      id.startsWith('rug-')
      ? `<symbol id="${id}" viewBox="0 0 300 120" overflow="visible">${art}</symbol>`
      // Objects are drawn with their floor line at y=150, but a room slot anchors
      // the BOTTOM of the symbol box. Shifting them down parks that floor line on
      // the slot, so nothing hovers above the surface it is standing on.
      : `<symbol id="${id}" viewBox="0 0 160 180" overflow="visible"><g transform="translate(0 18)">${art}</g></symbol>`).join(NL)
  + '\n</svg>\n');
