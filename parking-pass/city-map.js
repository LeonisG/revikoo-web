export const parkings = [
  { id: 'serrano', name: 'Parking Serrano', zone: 'Salamanca', x: 65, y: 43, places: 12, walk: 4, rate: '4 CR / estancia' },
  { id: 'colon', name: 'Parking Colón', zone: 'Centro', x: 48, y: 58, places: 8, walk: 7, rate: '4 CR / hora' },
  { id: 'azca', name: 'Parking AZCA', zone: 'AZCA', x: 43, y: 24, places: 20, walk: 5, rate: '2 CR / hora' },
  { id: 'retiro', name: 'Parking Retiro', zone: 'Retiro', x: 78, y: 66, places: 6, walk: 3, rate: '3 CR / hora' },
  { id: 'chamberi', name: 'Parking Chamberí', zone: 'Chamberí', x: 28, y: 40, places: 14, walk: 6, rate: '2 CR / hora' },
  { id: 'chamartin', name: 'Parking Chamartín', zone: 'Chamartín', x: 66, y: 17, places: 18, walk: 8, rate: '3 CR / hora' }
];

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export const cityRoads = [
  [[-80, 690], [210, 495], [432, 410], [543, 270], [602, -80]],
  [[-100, 260], [230, 330], [485, 330], [710, 285], [1130, 218]],
  [[650, -70], [650, 300], [678, 445], [670, 790]],
  [[-40, 580], [300, 580], [560, 520], [720, 520], [1100, 690]],
  [[-30, 87], [290, 140], [640, 140], [1060, 40]],
  [[120, -40], [235, 330], [280, 700]],
  [[970, -80], [930, 270], [955, 740]]
];
const routeCache = new Map();
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];

// Route within this illustrative street network; this is not real-world navigation.
// Split roads at intersections, then connect each parking by its shortest street path.
export function getParkingRoute(parking) {
  if (routeCache.has(parking.id)) return routeCache.get(parking.id);
  const start = [320, 695], end = [parking.x * 10, parking.y * 7];
  const segments = cityRoads.flatMap(road => road.slice(1).map((b, i) => ({ a: road[i], b, cuts: [0, 1] })));
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const one = segments[i], two = segments[j];
      const r = subtract(one.b, one.a), s = subtract(two.b, two.a), delta = subtract(two.a, one.a);
      const denominator = cross(r, s);
      if (Math.abs(denominator) < .00001) continue;
      const t = cross(delta, s) / denominator, u = cross(delta, r) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { one.cuts.push(t); two.cuts.push(u); }
    }
  }
  const pointAt = (segment, t) => segment.a.map((n, i) => n + (segment.b[i] - n) * t);
  function attach(point) {
    let closest;
    for (const segment of segments) {
      const vector = subtract(segment.b, segment.a), delta = subtract(point, segment.a);
      const t = clamp((delta[0] * vector[0] + delta[1] * vector[1]) / (vector[0] ** 2 + vector[1] ** 2));
      const projected = pointAt(segment, t), length = distance(point, projected);
      if (!closest || length < closest.length) closest = { segment, t, projected, length };
    }
    closest.segment.cuts.push(closest.t);
    return closest.projected;
  }
  const from = attach(start), to = attach(end), nodes = new Map();
  function node(point) {
    const key = point.map(n => n.toFixed(3)).join(',');
    if (!nodes.has(key)) nodes.set(key, { point, links: new Map(), cost: Infinity, previous: null });
    return nodes.get(key);
  }
  for (const segment of segments) {
    const cuts = [...new Set(segment.cuts)].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const a = node(pointAt(segment, cuts[i - 1])), b = node(pointAt(segment, cuts[i]));
      const cost = distance(a.point, b.point);
      a.links.set(b, cost); b.links.set(a, cost);
    }
  }
  const source = node(from), destination = node(to), remaining = new Set(nodes.values());
  source.cost = 0;
  while (remaining.size) {
    let current;
    for (const item of remaining) if (!current || item.cost < current.cost) current = item;
    if (!Number.isFinite(current.cost)) break;
    remaining.delete(current);
    if (current === destination) break;
    for (const [next, length] of current.links) {
      if (current.cost + length < next.cost) { next.cost = current.cost + length; next.previous = current; }
    }
  }
  const path = [];
  for (let current = destination; current; current = current.previous) path.unshift(current.point);
  const route = [start, ...path, end];
  routeCache.set(parking.id, route);
  return route;
}

// One cartographic vocabulary, rendered as pixels at each surface's actual size.
// The map is intentionally illustrative, not a geographic or routing service.
export function createCityMap(canvas) {
  const mode = canvas.dataset.city;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { draw() {}, setSelected() {}, dispose() {} };
  const dark = mode === 'hero' || mode === 'vision' || mode === 'access';
  const compact = mode === 'mini' || mode === 'app';
  let width = 0, height = 0, selected = parkings[0], progress = 0, intro = 1;
  let visible = false;
  const palette = dark
    ? { bg: '#0b0d0c', block: '#111610', edge: '#1b2418', road: '#202b1b', line: '#33422a', park: '#172412', text: '#819273', route: '#c7ff4a' }
    : { bg: '#e6e9df', block: '#dce1d3', edge: '#d1d8c7', road: '#f5f6ef', line: '#c7cfbc', park: '#c9d4bb', text: '#71825f', route: '#779b40' };

  function path(points, color, lineWidth = 1, dash = []) {
    ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
  }
  function label(text, x, y, size = 9, color = palette.text) {
    ctx.fillStyle = color; ctx.font = `500 ${size}px "IBM Plex Mono", monospace`; ctx.fillText(text, x, y);
  }
  function node(x, y, radius, color, outline = false) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (outline) { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
  }
  function drawVision() {
    const cities = [[610, 325, 'MADRID'], [864, 180, 'BARCELONA'], [780, 440, 'VALENCIA'], [480, 565, 'SEVILLA'], [620, 630, 'MÁLAGA'], [575, 112, 'BILBAO']];
    ctx.scale(width / 1000, height / 700);
    for (let x = 30; x < 1000; x += 35) for (let y = 20; y < 700; y += 35) node(x, y, .7, '#24301f');
    const amount = .35 + progress * .65;
    cities.slice(1).forEach(([x, y], i) => {
      ctx.globalAlpha = clamp(amount * 2 - i * .13);
      path([[610, 325], [(610 + x) / 2 + 30, (325 + y) / 2], [x, y]], '#4c6736', 1);
    });
    ctx.globalAlpha = 1;
    cities.forEach(([x, y, name], i) => {
      node(x, y, i ? 4 : 7, i ? '#799b4c' : '#c7ff4a');
      node(x, y, i ? 10 : 17, '#435b30', true);
      label(name, x + 15, y + 3, 8, '#839b6b');
    });
  }
  function drawCity() {
    if (mode === 'hero') {
      const narrow = width < 650;
      const zoom = 1 + progress * .6;
      ctx.translate(width * (narrow ? .05 : .29), height * (narrow ? .40 : .04));
      ctx.scale(width / 1000 * (narrow ? 1.35 : .95) * zoom, height / 700 * (narrow ? .68 : 1.05) * zoom);
      ctx.translate(170, 20); ctx.rotate(-.17); ctx.translate(-170, -20);
      ctx.globalAlpha = .85 * intro;
    } else if (mode === 'access') {
      ctx.translate(width * .02, height * -.18);
      ctx.scale(width / 900, height / 580);
      ctx.rotate(-.12);
    } else if (compact) {
      const target = mode === 'app' ? selected : parkings[0];
      ctx.scale(width / 520, height / 320);
      ctx.translate(520 * (mode === 'app' ? .63 : .60) - target.x * 10, 320 * (mode === 'app' ? .32 : .34) - target.y * 7);
    } else ctx.scale(width / 1000, height / 700);

    // Urban blocks, courtyards and an identifiable park, not a generic grid texture.
    for (let col = -4; col < 25; col++) {
      for (let row = -3; row < 19; row++) {
        const x = col * 49 + (row % 3) * 3, y = row * 45;
        if (x > 710 && x < 950 && y > 365 && y < 650) continue;
        const variant = (col * 3 + row + 40) % 5;
        const inset = variant * 1.3;
        ctx.fillStyle = palette.block; ctx.fillRect(x + 5, y + 5, 36 - inset, 33);
        ctx.strokeStyle = palette.edge; ctx.lineWidth = .6; ctx.strokeRect(x + 5, y + 5, 36 - inset, 33);
        ctx.fillStyle = palette.bg;
        if (variant < 2) ctx.fillRect(x + 16, y + 15, 13 - inset, 12);
        else if (variant === 3) ctx.fillRect(x + 20, y + 5, 3, 33);
        else if (variant === 4) ctx.fillRect(x + 5, y + 21, 36 - inset, 3);
      }
    }
    ctx.fillStyle = palette.park; ctx.fillRect(730, 390, 188, 223);
    for (let x = 747; x < 910; x += 22) for (let y = 410; y < 600; y += 22) node(x, y, 3, dark ? '#2b3f20' : '#b0c29d');
    path([[745, 410], [895, 595]], dark ? '#34492a' : '#a9bc94', 2);
    path([[895, 410], [745, 595]], dark ? '#34492a' : '#a9bc94', 2);
    cityRoads.forEach((road, i) => {
      path(road, palette.line, i ? 8 : 14);
      path(road, palette.road, i ? 6 : 11);
      if (dark) path(road, '#3e5032', .5, [5, 8]);
    });
    if (!compact && mode !== 'hero' && mode !== 'access') {
      label('PASEO DE LA CASTELLANA', 480, 80, 8);
      label('SALAMANCA', 736, 335, 10);
      label('RETIRO', 777, 500, 11);
      label('CHAMBERÍ', 265, 270, 9);
      label('CENTRO', 390, 640, 10);
      label('AZCA', 385, 128, 9);
    }
    const route = getParkingRoute(mode === 'network' || mode === 'app' ? selected : parkings[0]);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.save();
    const routeLength = route.slice(1).reduce((length, point, i) => length + distance(route[i], point), 0);
    ctx.setLineDash([routeLength + 1]); ctx.lineDashOffset = (routeLength + 1) * (1 - intro);
    ctx.beginPath(); route.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = palette.route; ctx.lineWidth = dark ? 3 : 2.4; ctx.stroke();
    ctx.restore();
    if (mode !== 'network' && !compact) {
      parkings.forEach((p, i) => {
        const x = p.x * 10, y = p.y * 7;
        node(x, y, 13, dark ? '#1f2b16' : '#c8d6b3'); node(x, y, 5, i ? palette.text : palette.route);
        label(p.zone.toUpperCase(), x + 20, y - 4, 8);
        label(i ? 'NODO / P' : '12 PLAZAS / SERRANO', x + 20, y + 10, 6);
      });
    }
    if (mode === 'network' || mode === 'work') {
      for (let i = 0; i < 28; i++) {
        const x = 200 + ((i * 137) % 620), y = 130 + ((i * 83) % 360);
        node(x, y, 2.5, '#83996a');
      }
    }
    ctx.globalAlpha = 1;
  }
  function draw(nextProgress = progress, nextIntro = intro) {
    progress = clamp(nextProgress); intro = clamp(nextIntro);
    if (!width || !height) return;
    const ratio = canvas.width / width;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, width, height);
    ctx.save();
    mode === 'vision' ? drawVision() : drawCity();
    ctx.restore();
  }
  const resize = new ResizeObserver(() => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    draw();
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) draw();
  }, { rootMargin: '100px' });
  observer.observe(canvas);
  return {
    mode, canvas,
    draw(p, i) { if (visible || mode === 'hero') draw(p, i); else { progress = p ?? progress; intro = i ?? intro; } },
    setSelected(parking) { selected = parking; draw(); },
    dispose() { resize.disconnect(); observer.disconnect(); }
  };
}
