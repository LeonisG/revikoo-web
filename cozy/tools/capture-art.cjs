// Development-only visual inspection; never imported by the application.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const out = path.join(require('node:os').tmpdir(), 'cozy-art'); fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge'});
  const page = await browser.newPage({viewport:{width:1400,height:900},reducedMotion:'reduce'});
  page.on('pageerror', error => { throw error; });
  const base = process.env.COZY_URL || 'http://127.0.0.1:8765/cozy/';
  await page.goto(base+'?debug=true');
  if (process.argv.includes('--guides')) {
    for (const size of ['small','medium','large']) {
      await page.setContent(`<html style="background:transparent"><body style="margin:0;background:transparent"><img style="position:absolute;inset:0;width:1400px;height:900px" src="${base}assets/room/shell-${size}.svg"><img style="position:absolute;inset:0;width:1400px;height:900px" src="${base}assets/room/window-${size}.svg"></body></html>`);
      await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
      await page.screenshot({path:path.join(out,`guide-${size}.png`),omitBackground:true});
    }
  } else {
    const results=await page.evaluate(async () => {
      const {createEngine}=await import('./logic/engine.mjs'); const {createStorage}=await import('./logic/storage.mjs');
      const engine=createEngine(createStorage(),{debug:true}); engine.completeSetup(); engine.debug('rich'); engine.chooseSize('large'); engine.debug('clear');engine.debug('unlock');engine.preference('lighting','day');
      const keys={};
      for (const [id,gx,gy] of [['desk',0,0],['wardrobe-oak',4,0],['bookshelf',0,4],['chair',0,2],['drawers',3,0],['bed-cream',3,3],['floor-lamp',5,2],['rug-moss',1,3]]) keys[id]=engine.placeItem(id,{gx,gy,rotation:0}).key;
      for (const [id,host,slot] of [['vintage-lamp','desk',0],['laptop','desk',1],['mug','desk',2],['pothos','drawers',0],['candle','drawers',1],['book-stack','bookshelf',0]]) {
        const p=engine.state.room.placed[keys[host]];engine.placeItem(id,{gx:p.gx,gy:p.gy,parentSurfaceId:keys[host],surfaceSlot:slot});
      }
      return Object.values(engine.state.room.placed).length;
    });
    await page.reload(); await page.locator('.placed .item-sprite').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
    await page.screenshot({path:path.join(out,'golden-room.png'),fullPage:true}); console.log({placed:results});
  }
  console.log(out);await browser.close();
})();
