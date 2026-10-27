const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.COZY_URL || 'http://127.0.0.1:8765/cozy/';
const out=path.resolve(__dirname,'../docs/qa/tripo-pilot');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge'});
  try {
    const context=await browser.newContext({viewport:{width:1400,height:900},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],bad=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
    page.on('request',r=>requests.push(r.url()));
    await page.goto(base);const normal=await page.evaluate(()=>localStorage.getItem('cozy-room:v2'));
    assert.equal(await page.locator('.art-inspector').count(),0);
    assert.ok(!requests.some(u=>u.includes('/vendor/three/')||u.endsWith('.glb')||u.includes('/candidates/')));
    async function ready(){await page.locator('#room-shell,.placed img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
    async function cleanShot(name) {
      for(const key of ['axes','bounds','footprints','lights'])await page.locator(`[data-art-layer=${key}]`).uncheck();
      await page.locator('#app').evaluate(el=>el.classList.remove('art-no-lights'));
      await page.locator('.art-inspector').evaluate(el=>el.hidden=true);await ready();
      await page.screenshot({path:path.join(out,name)});
      await page.locator('.art-inspector').evaluate(el=>el.hidden=false);
    }
    await page.goto(base+'?art-debug=true');await page.locator('#art-readout').waitFor();await ready();await cleanShot('original-room.png');
    await page.goto(base+'?art-debug=true&pilot=tripo-desk');await page.locator('#art-pilot-fixture').waitFor();await ready();
    const views=await page.evaluate(async()=> (await import('./assets/manifest.mjs')).availableOrientations('desk'));
    assert.deepEqual(views,[0,90,180,270]);
    const geometry=await page.evaluate(async()=>{
      const {CATALOG}=await import('./logic/catalog.mjs');const {geometryProfile}=await import('./logic/geometry-profile.mjs');
      return {original:CATALOG.desk.top,candidate:geometryProfile(CATALOG.desk).top};
    });
    assert.equal(geometry.original,132);assert.ok(Math.abs(geometry.candidate-113.73869858923008)<.0001);
    assert.ok((await page.locator('.placed[data-item=desk] .item-sprite').getAttribute('src')).includes('/candidates/tripo-desk/'));
    await cleanShot('candidate-room.png');
    const snapshots=[];
    await page.click('#art-pilot-fixture');
    for(const rotation of [0,90,180,270]) {
      await page.selectOption('#art-rotation',String(rotation));await ready();
      assert.equal(await page.locator('#art-error').textContent(),'');
      const desk=page.locator('.placed[data-item=desk] .item-sprite');
      assert.ok((await desk.getAttribute('src')).endsWith(`/view-${rotation}.webp`));
      assert.equal(await desk.evaluate(el=>el.style.transform),'');
      assert.ok((await page.locator('.placed[data-item=desk] .art-cast').getAttribute('src')).endsWith(`/shadow-${rotation}.webp`));
      assert.equal(await page.locator('.placed[data-item=mug]').count(),1);
      const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('cozy-room:artdebug:v1')));
      snapshots.push({rotation,storage:state,mugPosition:await page.locator('.placed[data-item=mug]').evaluate(el=>[el.style.left,el.style.top])});
      await page.screenshot({path:path.join(out,`surface-${rotation}.png`)});
    }
    assert.equal(new Set(snapshots.map(s=>s.mugPosition.join(','))).size,4,'surface slot rotates with host');
    await page.setViewportSize({width:360,height:800});await ready();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.screenshot({path:path.join(out,'mobile-360.png')});
    assert.equal(await page.evaluate(()=>localStorage.getItem('cozy-room:v2')),normal);
    // A pilot query alone cannot opt a real save into candidate delivery.
    await page.goto(base+'?pilot=tripo-desk');
    assert.deepEqual(await page.evaluate(async()=> (await import('./assets/manifest.mjs')).availableOrientations('desk')),[0]);
    assert.equal(await page.evaluate(async()=>{
      const {CATALOG}=await import('./logic/catalog.mjs');return (await import('./logic/geometry-profile.mjs')).geometryProfile(CATALOG.desk).top;
    }),132);
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,views,geometry,errors,bad,normalSaveUnchanged:true,productionLoadsNoThreeOrGLB:true,snapshots},null,2)+'\n');
    console.log('PASS: real four-view candidate, rotation and parented accessory, clean production route, normal save unchanged, no console/network errors. '+out);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
