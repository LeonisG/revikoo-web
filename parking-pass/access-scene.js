import * as THREE from './vendor/three/three.module.min.js';

const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

// All geometry and textures are procedural; the scene has no model or image requests.
export function createAccessScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setClearColor(0x0e110f);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e110f, 34, 65);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  const target = new THREE.Vector3(0, 1, -.6);
  const resources = [];
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .65, ...options });
  const concrete = material(0x565d57);
  const darkConcrete = material(0x242d28);
  const edgeMetal = material(0x9aa39b, { metalness: .72, roughness: .3 });
  const graphite = material(0x242c29, { metalness: .45, roughness: .4 });
  const light = material(0xf4eddb, { emissive: 0xf4eddb, emissiveIntensity: 1.3 });
  const lime = material(0xc8f64a, { emissive: 0x83b02a, emissiveIntensity: .7 });
  const paint = material(0xaeb9b3, { metalness: .74, roughness: .25 });
  const glass = material(0x172c30, { metalness: .55, roughness: .18 });
  const rubber = material(0x151917, { roughness: .92 });
  const brake = material(0x68221e, { emissive: 0xff311a, emissiveIntensity: .35 });
  const headlights = material(0xe7eddf, { emissive: 0xd9efdf, emissiveIntensity: 1.6 });

  function mesh(parent, geometry, mat, position = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (parent, size, mat, position) => mesh(parent, new THREE.BoxGeometry(...size), mat, position);
  const cylinder = (parent, r1, r2, h, mat, position) => mesh(parent, new THREE.CylinderGeometry(r1, r2, h, 32), mat, position);

  function canvasTexture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    draw(context, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    resources.push(texture);
    return { canvas, context, texture };
  }
  function sign(parent, text, width, height, position, color = '#e7eddf', bg = '#1b251e', fontSize = 70) {
    const source = canvasTexture(1024, 256, (ctx, w, h) => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color; ctx.font = `500 ${fontSize}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2);
    });
    const plane = mesh(parent, new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: source.texture }), position);
    plane.castShadow = false;
    return plane;
  }

  const ambient = new THREE.HemisphereLight(0xe9f0e7, 0x1a251e, 1.2);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff3df, 2.8);
  key.position.set(-8, 15, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -15; key.shadow.camera.right = 15;
  key.shadow.camera.top = 15; key.shadow.camera.bottom = -15;
  key.shadow.normalBias = .025;
  key.shadow.bias = -.0003;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd6e7f1, 2);
  rim.position.set(10, 5, -8); scene.add(rim);
  const insideLight = new THREE.PointLight(0xe6edcb, 35, 14, 2);
  insideLight.position.set(0, 3.3, -7); scene.add(insideLight);

  const environmentScene = new THREE.Scene();
  environmentScene.background = new THREE.Color(0x46504a);
  [[0, 6, 0], [-6, 3, 0], [4, 3, -4]].forEach((position, i) => {
    const panel = box(environmentScene, [i === 0 ? 12 : .1, 4, 10], new THREE.MeshBasicMaterial({ color: i === 2 ? 0xb2c5b6 : 0xffffff }), position);
    if (i === 0) panel.scale.y = .02;
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .025);
  scene.environment = environment.texture;
  scene.environmentIntensity = .55;
  pmrem.dispose();
  environmentScene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });

  const asphalt = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#323936'; ctx.fillRect(0, 0, w, h);
    let seed = 17;
    for (let i = 0; i < 13000; i++) {
      seed = (seed * 16807) % 2147483647; const x = seed % w;
      seed = (seed * 16807) % 2147483647; const y = seed % h;
      ctx.fillStyle = i % 2 ? '#4a504b' : '#252e28';
      ctx.globalAlpha = .2; ctx.fillRect(x, y, 1, 1);
    }
  }).texture;
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping; asphalt.repeat.set(7, 12);
  box(scene, [15, .25, 29], material(0x8b928c, { map: asphalt, roughness: .94 }), [0, -.18, -1]);
  for (const x of [-3.5, 3.5]) {
    box(scene, [.22, .22, 24], concrete, [x, .02, 0]);
    box(scene, [.07, .012, 20], material(0x969f91), [x * .87, -.04, .7]);
  }
  for (let z = 4; z <= 12; z += 3) box(scene, [.1, .013, 1.4], material(0x8b9488), [0, -.045, z]);
  box(scene, [5.8, .016, .18], material(0x98a18f), [0, -.035, 3.1]);
  const arrow = new THREE.Shape();
  arrow.moveTo(-.2, -1); arrow.lineTo(.2, -1); arrow.lineTo(.2, .1); arrow.lineTo(.65, .1); arrow.lineTo(0, .8); arrow.lineTo(-.65, .1); arrow.lineTo(-.2, .1);
  const arrowMesh = mesh(scene, new THREE.ShapeGeometry(arrow), material(0x8c9888), [0, -.02, 8.8]);
  arrowMesh.rotation.x = -Math.PI / 2;

  // Deep portal, structural returns and ceiling strips establish a real vanishing point.
  box(scene, [1.45, 4.65, 9], concrete, [-4.15, 2.2, -7.6]);
  box(scene, [1.45, 4.65, 9], darkConcrete, [4.15, 2.2, -7.6]);
  box(scene, [9.75, .72, 9], concrete, [0, 4.3, -7.6]);
  box(scene, [7, 4, .3], material(0x0d1510), [0, 1.9, -12]);
  box(scene, [6.8, .05, 8.5], material(0x26322a), [0, -.02, -7.6]);
  for (const z of [-3.3, -6.2, -9.2]) {
    box(scene, [6.6, .055, .08], light, [0, 3.89, z]);
    for (const x of [-3.39, 3.39]) box(scene, [.045, .055, 2], light, [x, .32, z - .5]);
  }
  box(scene, [9.4, .07, .09], edgeMetal, [0, 4.7, -3.12]);
  sign(scene, 'NODO   /   SERRANO', 5, .76, [0, 4.34, -3.04], '#edf0df', '#313d34', 68);
  sign(scene, 'P', .75, .72, [-4.14, 2.5, -3.06], '#c8f64a', '#202b23', 150);
  sign(scene, '12 PLAZAS', 1.1, .3, [-4.14, 1.91, -3.06], '#bcccaa', '#202b23', 76);

  const display = canvasTexture(1024, 256, () => {});
  box(scene, [2.85, .72, .12], graphite, [0, 3.48, -3.03]);
  mesh(scene, new THREE.PlaneGeometry(2.65, .57), new THREE.MeshBasicMaterial({ map: display.texture }), [0, 3.48, -2.96]);
  let previousDisplay = '';
  function setDisplay(message, sub = '1234 LKM') {
    if (previousDisplay === message + sub) return;
    previousDisplay = message + sub;
    const ctx = display.context;
    ctx.fillStyle = '#101c13'; ctx.fillRect(0, 0, 1024, 256);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8f64a'; ctx.font = '600 54px Arial'; ctx.fillText(message, 512, 90);
    ctx.fillStyle = '#a8b9a4'; ctx.font = '32px Arial'; ctx.fillText(sub, 512, 178);
    display.texture.needsUpdate = true;
  }

  const gateBase = box(scene, [.55, 1.25, .65], graphite, [-2.9, .6, 1.2]);
  box(scene, [.57, .07, .67], edgeMetal, [-2.9, 1.25, 1.2]);
  const gateLed = box(scene, [.3, .05, .02], lime, [-2.9, 1.04, 1.535]);
  const pivot = new THREE.Group(); pivot.position.set(-2.9, 1.17, 1.2); scene.add(pivot);
  const arm = box(pivot, [5.7, .13, .14], material(0xe0e4d9, { metalness: .35 }), [2.7, 0, 0]);
  for (let x = .4; x < 5.5; x += 1.1) box(pivot, [.38, .135, .15], material(0x525e52), [x, 0, 0]);
  const armLed = box(pivot, [5.5, .028, .008], lime, [2.7, .012, .078]);
  const hinge = cylinder(scene, .19, .19, .18, edgeMetal, [-2.9, 1.17, 1.56]);
  hinge.rotation.x = Math.PI / 2;
  box(scene, [.24, 1.1, .24], graphite, [2.95, .5, 1.2]);

  const anpr = new THREE.Group(); anpr.position.set(-3.1, 0, 5.7); scene.add(anpr);
  cylinder(anpr, .055, .08, 2.55, edgeMetal, [0, 1.25, 0]);
  box(anpr, [.54, .32, .65], graphite, [.12, 2.55, -.09]);
  box(anpr, [.6, .035, .76], edgeMetal, [.12, 2.73, -.12]);
  const lens = cylinder(anpr, .095, .11, .08, glass, [.12, 2.54, .28]);
  lens.rotation.x = Math.PI / 2;
  const cameraLedMaterial = material(0x71836c, { emissive: 0xc8f64a, emissiveIntensity: 0 });
  const cameraLed = mesh(anpr, new THREE.SphereGeometry(.027, 12, 8), cameraLedMaterial, [.3, 2.54, .25]);

  const car = new THREE.Group(); scene.add(car);
  const shell = new THREE.Group(); car.add(shell);
  function profile(points, width, mat, rounded = false) {
    const shape = new THREE.Shape();
    if (rounded) {
      const between = (a, b, amount) => [mix(a[0], b[0], amount), mix(a[1], b[1], amount)];
      const start = between(points[0], points[points.length - 1], .14);
      shape.moveTo(...start);
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        shape.quadraticCurveTo(...point, ...between(point, next, .14));
        shape.lineTo(...between(next, point, .14));
      });
    } else {
      points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .065, bevelThickness: .055 });
    geometry.translate(0, 0, -width / 2); geometry.rotateY(Math.PI / 2);
    return mesh(shell, geometry, mat);
  }
  profile([[-2.12,.52],[-2.17,.78],[-1.98,1],[-1.45,1.08],[.55,1.04],[1.7,.91],[2.14,.72],[2.14,.48],[1.65,.42],[-1.8,.42]], 1.77, paint, true);
  profile([[-1.49,1.04],[-.84,1.69],[.55,1.7],[1.32,1.02]], 1.49, paint);
  // Side glazing follows the cabin profile; the central pillars remain body coloured.
  for (const side of [-1, 1]) {
    const windows = [
      [[-1.31,1.11],[-.77,1.59],[-.22,1.6],[-.22,1.12]],
      [[-.12,1.12],[-.12,1.6],[.49,1.6],[1.15,1.11]]
    ];
    windows.forEach(points => {
      const shape = new THREE.Shape(); points.forEach(([z,y], i) => i ? shape.lineTo(z,y) : shape.moveTo(z,y)); shape.closePath();
      const panel = mesh(shell, new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color:0x142a2d, metalness:.7, roughness:.14, side:THREE.DoubleSide }));
      panel.rotation.y = Math.PI / 2; panel.position.x = side * .807;
    });
    box(shell, [.045,.035,.25], edgeMetal, [side*.94,.94,-.2]);
    box(shell, [.045,.035,.25], edgeMetal, [side*.94,.94,1]);
    box(shell, [.25,.12,.28], paint, [side*.98,1.15,-.85]);
    box(shell, [.025,.12,3.35], graphite, [side*.93,.46,0]);
  }
  const windshield = box(shell, [1.4,.025,.89], glass, [0,1.48,-.94]); windshield.rotation.x = -.72;
  const rearWindow = box(shell, [1.37,.025,.77], glass, [0,1.47,1.16]); rearWindow.rotation.x = .82;
  box(shell, [1.17,.015,1.12], glass, [0,1.772,.1]);
  box(shell, [1.65,.12,.045], graphite, [0,.55,-2.19]);
  box(shell, [1.59,.10,.04], graphite, [0,.55,2.22]);
  box(shell, [1.6,.065,.04], brake, [0,.84,2.21]);
  for (const side of [-1,1]) {
    box(shell, [.52,.065,.07], headlights, [side*.59,.8,-2.21]);
    box(shell, [.48,.07,.045], brake, [side*.61,.83,2.22]);
  }
  const headlightPool = new THREE.SpotLight(0xe5eedb, 18, 9, .48, .8, 2);
  headlightPool.position.set(0, .7, -2.1);
  headlightPool.target.position.set(0, -.05, -8);
  car.add(headlightPool, headlightPool.target);
  const wheelGroups = [];
  for (const x of [-.98,.98]) for (const z of [-1.37,1.38]) {
    const wheel = new THREE.Group(); wheel.position.set(x,.4,z); car.add(wheel); wheelGroups.push(wheel);
    const tire = mesh(wheel, new THREE.TorusGeometry(.315,.108,12,40), rubber); tire.rotation.y=Math.PI/2;
    const rimMesh = cylinder(wheel,.25,.25,.13,edgeMetal,[0,0,0]); rimMesh.rotation.z=Math.PI/2;
    const disc = cylinder(wheel,.21,.21,.145,graphite,[0,0,0]); disc.rotation.z=Math.PI/2;
    for (let spoke=0;spoke<5;spoke++) {
      const spokeMesh = box(wheel,[.16,.045,.44],edgeMetal,[0,0,0]); spokeMesh.rotation.x=spoke*Math.PI/5;
    }
    const hub=cylinder(wheel,.075,.075,.18,edgeMetal,[0,0,0]); hub.rotation.z=Math.PI/2;
  }
  const plate = canvasTexture(512,128,(ctx,w,h)=>{
    ctx.fillStyle='#eff0df'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#235a96';ctx.fillRect(0,0,36,h);
    ctx.fillStyle='#fff';ctx.font='22px Arial';ctx.fillText('E',10,94);
    ctx.fillStyle='#15201a';ctx.font='600 67px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1234 LKM',275,69);
  });
  const plateMat = new THREE.MeshBasicMaterial({map:plate.texture});
  const rearPlate=mesh(shell,new THREE.PlaneGeometry(.78,.195),plateMat,[0,.655,2.252]);
  const frontPlate=mesh(shell,new THREE.PlaneGeometry(.78,.195),plateMat,[0,.64,-2.252]);frontPlate.rotation.y=Math.PI;
  const focusFrame = new THREE.Group(); focusFrame.position.set(0,.655,2.27); shell.add(focusFrame);
  const focusMat=new THREE.MeshBasicMaterial({color:0xc8f64a,depthTest:false});
  for(const x of [-.46,.46]) for(const y of [-.14,.14]) {
    box(focusFrame,[.15,.012,.005],focusMat,[x-Math.sign(x)*.068,y,0]);
    box(focusFrame,[.012,.09,.005],focusMat,[x,y-Math.sign(y)*.04,0]);
  }
  const scan = box(focusFrame,[.8,.008,.005],focusMat,[0,0,.01]);
  const beamGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  const beam= new THREE.Line(beamGeometry,new THREE.LineBasicMaterial({color:0xc8f64a,transparent:true,opacity:.23}));scene.add(beam);
  const carShadow = canvasTexture(128,128,(ctx,w,h)=>{
    const gradient=ctx.createRadialGradient(w/2,h/2,5,w/2,h/2,w/2);
    gradient.addColorStop(0,'rgba(0,0,0,0.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  });
  const shadow = mesh(car,new THREE.PlaneGeometry(3.5,6),new THREE.MeshBasicMaterial({map:carShadow.texture,transparent:true,depthWrite:false}),[0,-.022,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;

  let width=0,height=0;
  function resize(){
    width=host.clientWidth; height=host.clientHeight;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    // Portrait scenes use a higher viewpoint so the complete arm and portal stay in frame.
    const narrow=width<580;
    camera.position.set(narrow?11:14,narrow?12.5:10.8,narrow?22.5:20.5);
    camera.fov=narrow?42:34;camera.lookAt(target);camera.updateProjectionMatrix();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  const plateWorld=new THREE.Vector3();const lensWorld=new THREE.Vector3();
  function render(time, reduced=false){
    let t=time;
    if(reduced) t=time<2?2.3:time<4?5.5:time<6?18.4:21.3;
    const exiting=t>=10.2;
    let z;
    if(t<2.3) z=mix(11.6,4.65,smooth(0,2.3,t));
    else if(t<5.7) z=4.65;
    else if(t<8.35) z=mix(4.65,-10.4,smooth(5.7,8.35,t));
    else if(t<10.2) z=-10.4;
    else if(t<12.25) z=mix(-10.4,-1.3,smooth(10.2,12.25,t));
    else if(t<15.35) z=-1.3;
    else z=mix(-1.3,16,smooth(15.35,18.2,t));
    car.position.set(exiting?.22:0,0,z);car.rotation.y=exiting?Math.PI:0;
    car.visible=t<8.4||t>=10.2&&t<18.2;
    shell.rotation.x=reduced?0:(t<2.3?.012*Math.sin(t/2.3*Math.PI):0);
    const moving=(t<2.3)||(t>5.7&&t<8.35)||(t>10.2&&t<12.25)||(t>15.35&&t<18.2);
    shell.position.y=moving&&!reduced?.008*Math.sin(t*8):0;
    wheelGroups.forEach(w=>w.rotation.x=z/.4);
    brake.emissiveIntensity=moving?.35:2;
    const depth=1-smooth(-4,-11,z);
    paint.color.setHex(0xaeb9b3).multiplyScalar(mix(.36,1,depth));
    const entryAngle=smooth(4.95,6.05,t)*(1-smooth(8.35,9.3,t));
    const exitAngle=smooth(14.6,15.75,t)*(1-smooth(18.25,19.25,t));
    const settle = start => t > start && t < start + .35 ? .008 * Math.sin((t - start) * 22) * (1 - (t - start) / .35) : 0;
    pivot.rotation.z=Math.max(entryAngle,exitAngle)*1.43+(reduced?0:settle(6.05)+settle(15.75));
    const authorized=(t>=4.6&&t<8.4)||(t>=14.35&&t<18.3);
    armLed.visible=authorized;gateLed.material=authorized?lime:graphite;
    const scanning=(t>=2.85&&t<3.4)||(t>=12.65&&t<13.2);
    cameraLedMaterial.emissiveIntensity=scanning?(Math.sin(t*20)>.1?2:.2):authorized?1:0;
    focusFrame.visible=scanning&&!reduced;
    // On exit the front plate faces the camera; the bracket follows the physical surface.
    focusFrame.position.z=exiting?-2.27:2.27;
    focusFrame.rotation.y=exiting?Math.PI:0;
    scan.position.y=Math.sin(t*8)*.11;
    beam.visible=scanning&&!reduced;
    if(scanning){
      scene.updateMatrixWorld(true);
      (exiting?frontPlate:rearPlate).getWorldPosition(plateWorld);cameraLed.getWorldPosition(lensWorld);
      const positions=beam.geometry.attributes.position;
      positions.setXYZ(0,lensWorld.x,lensWorld.y,lensWorld.z);positions.setXYZ(1,plateWorld.x,plateWorld.y,plateWorld.z);positions.needsUpdate=true;
      beam.geometry.computeBoundingSphere();
    }
    let message='ESPERE',sub='ACCESO POR MATRÍCULA';
    if(scanning) message='LEYENDO MATRÍCULA';
    else if(authorized){ message=exiting?'SALIDA AUTORIZADA':'BIENVENIDO';sub='1234 LKM'; }
    else if(t>=3.45&&t<4.6){message='VALIDANDO PLAN';sub='CITY · 60 CR';}
    else if(t>=13.2&&t<14.35){message='SESIÓN ENCONTRADA';sub='1 H 25 MIN · 4 CR';}
    else if(t>=8.4&&t<10.2){message='PARKING ACTIVO';sub='ENTRADA 11:42';}
    else if(t>=18.3){message='BUEN VIAJE';sub='NODO / SERRANO';}
    setDisplay(message,sub);
    if(!reduced){
      const turn=smooth(9.2,11,t);
      camera.position.x=(width<580?11:14)-turn*1.8;
      camera.lookAt(target);
    }
    renderer.render(scene,camera);
  }
  render(0);
  return {render,resize,dispose(){resizeObserver.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});resources.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();}};
}
