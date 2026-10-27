// Browser acceptance and repeatable captures. Requires a running local server.
// PLAYWRIGHT_MODULE=... PLAYWRIGHT_CHANNEL=msedge node cozy/tools/qa-art.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const out = path.resolve(__dirname, '../docs/qa/art-audit');
const base = process.env.COZY_URL || 'http://127.0.0.1:8765/cozy/';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({viewport:{width:1400,height:900},reducedMotion:'reduce'});
    const errors = [], broken = [];
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) broken.push(`${r.status()} ${r.url()}`); });
    await page.goto(base);
    // Capture the actual ordinary save; QA must not alter it even when resets
    // and room-size changes happen in the inspector.
    const normal = await page.evaluate(() => localStorage.getItem('cozy-room:v2'));
    await page.goto(base + '?art-debug=true');
    await page.locator('#art-readout').waitFor();
    async function ready() {
      await page.locator('#room-shell, .placed .item-sprite').evaluateAll(images => Promise.all(images.map(i=>i.decode())));
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    const expected = ['bookshelf','chair','desk','floor-lamp','wardrobe-oak'];
    const report = { viewport:[1400,900], screenshots:[], errors, broken, cases:[] };
    for (const size of ['small','medium','large']) {
      await page.selectOption('#art-size',size); await ready();
      assert.equal(await page.locator('#art-error').textContent(),'');
      assert.deepEqual((await page.locator('.placed').evaluateAll(els=>els.map(e=>e.dataset.item))).sort(),expected);
      assert.equal(await page.locator('#app').getAttribute('data-light'),'day');
      assert.equal(await page.locator('#app').getAttribute('data-weather'),'clear');
      assert.ok(await page.locator('#app').evaluate(el=>el.classList.contains('reduce-motion')));
      assert.ok(await page.locator('.item-sprite').evaluateAll(els=>els.every(e=>!e.style.transform)));
      const before = await page.locator('.placed').evaluateAll(els=>els.map(e=>[e.dataset.item,e.style.left,e.style.top]));
      await page.click('#art-golden'); await ready();
      assert.deepEqual(await page.locator('.placed').evaluateAll(els=>els.map(e=>[e.dataset.item,e.style.left,e.style.top])),before);
      await page.screenshot({path:path.join(out,`${size}-diagnostic.png`)});
      report.screenshots.push(`${size}-diagnostic.png`);
      for(const layer of ['axes','bounds','footprints','lights']) await page.locator(`[data-art-layer=${layer}]`).uncheck();
      // Keep the normal atmospheric layers for the clean scene, hide only the
      // diagnostic emitter markers and panel.
      await page.locator('#app').evaluate(el=>el.classList.remove('art-no-lights'));
      await page.locator('.art-inspector').evaluate(el=>el.hidden=true);
      await page.screenshot({path:path.join(out,`${size}-clean.png`)});
      await page.locator('.art-inspector').evaluate(el=>el.hidden=false);
      for(const layer of ['axes','bounds','footprints','lights']) await page.locator(`[data-art-layer=${layer}]`).check();
      report.screenshots.push(`${size}-clean.png`);
      report.cases.push(`${size}: five golden candidates, stable positions, day, clear, no affine`);
    }
    // All catalog types must be inspectable, including wall/surface/companions.
    const ids = await page.locator('#art-item option').evaluateAll(els=>els.map(e=>e.value));
    for (const id of ids) {
      await page.selectOption('#art-item',id); await page.click('#art-solo');
      assert.equal(await page.locator('#art-error').textContent(),'', id);
      const surface = await page.evaluate(async id => (await import('./logic/catalog.mjs')).CATALOG[id].placement === 'surface',id);
      assert.equal(await page.locator('.placed').count(),surface ? 2 : 1,id);
      assert.equal(await page.locator(`.placed[data-item="${id}"]`).count(),1,id);
    }
    report.cases.push(`${ids.length} catalog objects individually placed without errors`);
    await page.click('#art-empty');
    assert.equal(await page.locator('.placed').count(),0);
    await ready(); await page.screenshot({path:path.join(out,'empty-room.png')});
    await page.click('#art-golden');
    await page.selectOption('#art-light','night');
    assert.equal(await page.locator('#app').getAttribute('data-light'),'night');
    await page.reload(); await page.locator('#art-readout').waitFor(); await ready();
    assert.equal(await page.locator('#app').getAttribute('data-light'),'day');
    const profiles = await page.locator('.art-contact').evaluateAll(els=>els.map(e=>e.dataset.shadowProfile));
    assert.ok(profiles.includes('desk') && profiles.includes('chair') && profiles.includes('lamp') && profiles.includes('cabinet'));
    await page.setViewportSize({width:360,height:800}); await ready();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.screenshot({path:path.join(out,'mobile-360.png')});
    assert.equal(await page.evaluate(()=>localStorage.getItem('cozy-room:v2')),normal);
    report.cases.push('reload resets QA lighting; normal save unchanged; mobile 360px without overflow');
    assert.deepEqual(errors,[]); assert.deepEqual(broken,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:true,cases:report.cases,screenshots:out}));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
