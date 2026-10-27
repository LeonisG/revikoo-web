/* Optional browser QA for the room builder. No production dependency.
 * Set PLAYWRIGHT_MODULE to a local Playwright module if it is not installed.
 *   node tests/browser.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '../..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/revikoo-web(?=\/)/, '');
  let filename = path.resolve(root, `.${pathname}`);
  if (!filename.startsWith(root + path.sep) && filename !== root) { response.writeHead(403).end(); return; }
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
  if (!fs.existsSync(filename)) { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'text/plain' }); fs.createReadStream(filename).pipe(response);
});

(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce',hasTouch:true});
  page.setDefaultTimeout(8000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const shots=path.join(os.tmpdir(),'cozy-qa');fs.mkdirSync(shots,{recursive:true});
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cozy-room:debug:v2')));
  const mutate=fn=>page.evaluate(async source=>{
    const {createEngine}=await import('./logic/engine.mjs');const {createStorage}=await import('./logic/storage.mjs');
    const e=createEngine(createStorage(),{debug:true});new Function('e',source)(e);
  },fn);
  const point=async (gx,gy,z=0)=>page.evaluate(async([gx,gy,z])=>{
    const {toStage,CELL}=await import('./logic/grid.mjs');const p=toStage((gx+.5)*CELL,(gy+.5)*CELL,z);
    const b=document.querySelector('#room-stage').getBoundingClientRect();return {x:b.left+b.width*p.x/100,y:b.top+b.height*p.y/100};
  },[gx,gy,z]);
  const dragStart=async id=>{
    const tile=page.locator(`[data-pick="${id}"]`);await tile.scrollIntoViewIfNeeded();
    const b=await tile.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y-15,{steps:4});
  };
  const moveTo=async(gx,gy,z=0)=>{const p=await point(gx,gy,z);await page.mouse.move(p.x,p.y,{steps:7});};
  const drag=async(id,gx,gy,z=0)=>{await dragStart(id);await moveTo(gx,gy,z);await page.mouse.up();};
  const keyOf=async id=>Object.entries((await stored()).room.placed).find(([,p])=>p.item===id)?.[0];
  const select=async key=>{await page.locator(`[data-key="${key}"]`).focus();await page.keyboard.press('Enter');};
  try {
    await page.goto(`${base}/cozy/?debug=true`);
    await mutate("e.completeSetup();e.debug('rich');e.chooseSize('large');e.debug('unlock');e.preference('lighting','day');");
    await page.reload();await page.locator('#edit-toggle').click();
    await dragStart('desk');await moveTo(0,0);
    assert.equal(await page.locator('.placement-preview.good').count(),1);
    assert.match(await page.locator('.placement-preview img').getAttribute('src'),/desk\.webp$/);
    await page.screenshot({path:path.join(shots,'drag-valid.png')});await page.mouse.up();
    const desk=await keyOf('desk');assert.ok(desk);assert.equal((await stored()).inventory.desk,undefined);
    const beforeInvalid=await stored();
    await dragStart('chair');await moveTo(1,0);
    assert.equal(await page.locator('.placement-preview.bad').count(),1);
    await page.screenshot({path:path.join(shots,'drag-invalid.png')});await page.mouse.up();
    assert.deepEqual(await stored(),beforeInvalid,'invalid release is atomic');
    await dragStart('chair');await moveTo(2,2);await page.keyboard.press('Escape');await page.mouse.up();
    assert.deepEqual(await stored(),beforeInvalid,'Escape cancels active pointer capture');
    assert.equal(await page.locator('.placement-preview').count(),0);
    await dragStart('chair');await moveTo(2,2);await page.keyboard.press('r');
    assert.match(await page.locator('.placement-preview img').getAttribute('src'),/chair\.webp$/);
    assert.equal(await page.locator('[data-held=rotate]').isVisible(),false);
    await page.mouse.up();const chair=await keyOf('chair');assert.equal((await stored()).room.placed[chair].rotation,0);
    await drag('journal',0,0,142);const journal=await keyOf('journal');
    assert.equal((await stored()).room.placed[journal].parentSurfaceId,desk);
    await drag('vintage-lamp',1,0,142);const lamp=await keyOf('vintage-lamp');
    assert.equal((await stored()).room.placed[lamp].surfaceSlot,2);
    await select(desk);await page.locator('[data-edit=move]').click();await moveTo(3,0);await page.keyboard.press('r');
    assert.equal(await page.locator('.placement-preview').count(),3,'host previews its children');
    await page.keyboard.press('Enter');
    assert.equal((await stored()).room.placed[journal].gx,3);assert.equal((await stored()).room.placed[lamp].gy,0);
    const beforeMove=await stored();await select(desk);await page.locator('[data-edit=move]').click();await moveTo(0,3);await page.locator('[data-held=cancel]').click();
    assert.deepEqual(await stored(),beforeMove,'cancel restores host and children');
    const chairPoint=await point(2,2,84);
    await page.mouse.move(chairPoint.x,chairPoint.y);await page.mouse.down();
    await page.mouse.move(chairPoint.x+10,chairPoint.y,{steps:3});await moveTo(2,3);await page.mouse.up();
    assert.equal((await stored()).room.placed[chair].gy,3,'drag an existing painted object without duplication');
    await select(desk);await page.locator('[data-edit=store]').click();
    assert.equal((await stored()).inventory.journal,2,'free starter plus stored unit');
    assert.equal((await stored()).room.placed[lamp],undefined);
    await drag('desk',0,0);await drag('journal',0,0,142);
    await drag('rug-cream',0,3);await drag('rug-moss',3,3);
    await dragStart('print-sunset');
    const wall=await page.evaluate(async()=>{const {wallAnchor}=await import('./logic/grid.mjs');const a=wallAnchor('left',1,6);const b=document.querySelector('#room-stage').getBoundingClientRect();return{x:b.left+b.width*a.x/100,y:b.top+b.height*a.y/100};});
    await page.mouse.move(wall.x,wall.y,{steps:6});await page.mouse.up();assert.ok(await keyOf('print-sunset'));
    await select(chair);await page.locator('[data-edit=sell]').click();await page.locator('#confirm-no').click();assert.ok((await stored()).room.placed[chair]);
    await page.locator('[data-edit=sell]').click();await page.locator('#confirm-yes').click();assert.equal((await stored()).room.placed[chair],undefined);
    const saved=await stored();await page.reload();await page.locator('.placed').first().waitFor();
    assert.deepEqual((await stored()).room.placed,saved.room.placed);
    await page.locator('#explore-toggle').click();await page.locator('.room-nav [data-open=shop]').click();
    await page.locator('[data-action=buy][data-id=chair]').click();
    await page.locator('[data-action=place][data-id=chair]').click();
    assert.equal(await page.locator('#world-panel').isVisible(),false);
    assert.equal(await page.locator('#held-bar').isVisible(),true);
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.ok(await keyOf('chair'),'buy -> place now -> keyboard placement');
    await page.locator('#edit-done').click();
    // Actual secondary click outside build mode, on a visible painted part.
    const c=await point(0,2,77);await page.mouse.click(c.x,c.y,{button:'right'});
    assert.equal(await page.locator('.object-actions').isVisible(),true);
    await page.locator('[data-edit=dismiss]').click();
    for (const [size,n] of [['small',4],['medium',5],['large',6]]) {
      await mutate(`e.debug('clear');e.debug('size','${size}');`);await page.reload();await page.locator('#edit-toggle').click();
      assert.equal(await page.locator('.cell').count(),n*n);await drag('desk',n-2,n-1);
      assert.ok(await keyOf('desk'));await page.locator('#edit-done').click();
    }
    // Mobile pointer events produced by Chromium's actual touch input pipeline.
    await mutate("e.debug('clear');e.debug('size','small');");await page.reload();await page.setViewportSize({width:360,height:740});
    await page.locator('#edit-toggle').click();await page.locator('[data-pick=chair]').scrollIntoViewIfNeeded();
    const b=await page.locator('[data-pick=chair]').boundingBox(), cdp=await page.context().newCDPSession(page);
    const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:2,radiusY:2}]});
    await touch('touchStart',b.x+b.width/2,b.y+b.height/2);
    await touch('touchMove',b.x+b.width/2,b.y-20);const mobile=await point(1,1);
    await touch('touchMove',mobile.x,mobile.y);await touch('touchEnd');assert.ok(await keyOf('chair'),'real touch drag');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('.placed').first().evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion');
    await page.screenshot({path:path.join(shots,'builder-touch-360.png'),fullPage:true});
    await page.emulateMedia({reducedMotion:'no-preference'});await drag('monstera',2,2);
    assert.equal(await page.locator('.placed[data-item=monstera]').evaluate(el=>getComputedStyle(el).animationName),'settle');
    await drag('desk',0,0);await drag('journal',0,0,142);await page.locator('#edit-done').click();
    const notebook=await page.locator('.hotspot[data-open=tasks]').boundingBox();
    await touch('touchStart',notebook.x+notebook.width/2,notebook.y+notebook.height/2);
    await page.waitForTimeout(520);await touch('touchEnd');
    assert.equal(await page.locator('.object-actions').isVisible(),true,'long press selects interactive tools');
    assert.equal(await page.locator('#world-panel').isVisible(),false,'long press does not accidentally open tasks');
    await page.locator('[data-edit=move]').click();
    await page.locator('[data-held=cancel]').click();
    assert.equal(await page.locator('#edit-bar').isVisible(),false,'quick-edit cancellation restores the prior mode');
    await mutate("e.debug('clear');e.debug('pets');e.placeItem('cat',{gx:1,gy:1});");
    await page.setViewportSize({width:1440,height:900});await page.reload();
    const cat=await keyOf('cat');await select(cat);
    await page.locator('[data-pet-pose]').selectOption('sleep');
    assert.match(await page.locator(`[data-key="${cat}"] img`).getAttribute('src'),/cat-sleep\.webp$/);
    await page.locator('[data-edit=move]').click();await moveTo(2,2);
    assert.match(await page.locator('.placement-preview img').getAttribute('src'),/cat-sleep\.webp$/,'moving preview preserves the actual posture');
    await page.keyboard.press('Enter');await page.reload();
    assert.equal((await stored()).room.placed[cat].pose,'sleep');
    assert.match(await page.locator(`[data-key="${cat}"] img`).getAttribute('src'),/cat-sleep\.webp$/);
    assert.deepEqual(errors,[]);
    console.log('PASS: real mouse/touch drag, exact raster ghost, collision, cancel, canonical orientation, host/children move, store, replace, wall, rugs, sell, reload, buy/place, keyboard, all room sizes, mobile, reduced motion.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
