/* Optional illustration source. Run with Node to regenerate the local SVG layers.
 * This is an art tool, not a build step. The browser serves the generated SVGs.
 * Orthographic projection: warm miniature objects, two visible faces + top. */
import { writeFileSync, mkdirSync } from 'node:fs';
const base = new URL('../assets/', import.meta.url);
const p = (x, y, z = 0) => [700 + x - y, 480 + (x + y) * .36 - z];
const pts = points => points.map(a => a.map(n => +n.toFixed(2)).join(',')).join(' ');
const polygon = (points, fill, extra = '') => `<polygon points="${pts(points)}" fill="${fill}" ${extra}/>`;
const line = (a, b, color, width = 2, extra = '') => `<path d="M${a}L${b}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const plane = (x, y, z, w, d, color, extra = '') => polygon([p(x,y,z),p(x+w,y,z),p(x+w,y+d,z),p(x,y+d,z)],color,extra);
function box(x,y,z,w,d,h,top,front,side,round=3) {
  return polygon([p(x,y+d,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x,y+d,z+h)],front,`stroke="${front}" stroke-width="${round}" stroke-linejoin="round"`)
    + polygon([p(x+w,y,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x+w,y,z+h)],side,`stroke="${side}" stroke-width="${round}" stroke-linejoin="round"`)
    + plane(x,y,z+h,w,d,top,`stroke="${top}" stroke-width="${round}" stroke-linejoin="round"`);
}
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
</defs>`;
function save(file, content) {
  mkdirSync(new URL('./',new URL(file,base)),{recursive:true});
  writeFileSync(new URL(file,base),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900" fill="none">${defs}\n${content}</svg>\n`);
}

// Rounded shell: a sculpted front plinth, thick exposed wall edges and a curved crown.
let shell = `<ellipse cx="703" cy="815" rx="425" ry="52" fill="#080f0d" opacity=".6" filter="url(#soft)"/>
<path d="M202 655L700 478L1198 655V684Q1198 697 1184 702L723 870Q700 879 678 870L217 702Q202 696 202 681Z" fill="#313f32"/>
<path d="M202 655L700 478L1198 655L715 833Q700 840 685 833Z" fill="#e4a371"/>
<path d="M202 663L686 839Q700 845 714 839L1198 663" stroke="#e6b083" stroke-width="5" opacity=".6"/>
<path d="M216 654V287Q216 261 241 252L674 96Q700 86 700 113V480Z" fill="url(#left-wall)"/>
<path d="M700 113Q700 86 726 96L1159 252Q1184 261 1184 287V654L700 480Z" fill="url(#right-wall)"/>
<path d="M216 654V287Q216 261 241 252L674 96Q700 86 726 96L1159 252Q1184 261 1184 287V654" stroke="#102f29" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M216 646V280Q216 253 243 245L674 89Q700 80 726 89L1157 245Q1184 253 1184 280V646" stroke="#519378" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M700 111V481" stroke="#0b382e" stroke-opacity=".5" stroke-width="12"/>
${polygon([p(0,0),p(484,0),p(484,484),p(0,484)],'url(#floor)')}
${line(p(0,0,4),p(0,484,4),'#6f5036',14)}${line(p(0,0,4),p(484,0,4),'#684a34',14)}
${line(p(0,0,13),p(0,484,13),'#ce9b67',4)}${line(p(0,0,13),p(484,0,13),'#ce9b67',4)}`;
for(let y=60;y<484;y+=60) shell+=line(p(0,y),p(484,y),'#90603d',2,'opacity=".55"');
for(let y=0;y<480;y+=60) for(let x=(y/60%2?100:230);x<484;x+=260) shell+=line(p(x,y+2),p(x,Math.min(484,y+58)),'#9b6b45',1.7,'opacity=".55"');
shell+=plane(90,70,1,240,270,'url(#warm)');
save('room/shell.svg',shell);

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
wall+=`<g transform="matrix(1 -.36 0 1 584 234)"><rect width="59" height="70" rx="3" fill="#d39a64"/><rect x="5" y="5" width="49" height="60" fill="#e7d9af"/><path d="M15 44L25 19l21 27Z" fill="#e78d5c"/><circle cx="41" cy="18" r="7" fill="#deb95a"/><path d="M15 54h30" stroke="#879175" stroke-width="2"/></g>`;
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
