// Browser-based art review. Screenshots are evidence, never production sprites.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.resolve(__dirname, '../docs/qa');
const base = process.env.COZY_URL || 'http://127.0.0.1:8765/cozy/';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const decode = () => page.locator('img.item-sprite').evaluateAll(async images => {
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map(image => image.decode()));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  try {
    await page.goto(base + '?debug=true');
    await page.evaluate(async () => {
      const { createEngine } = await import('./logic/engine.mjs');
      const { createStorage } = await import('./logic/storage.mjs');
      const e = createEngine(createStorage(), { debug: true }); e.completeSetup(); e.preference('lighting','day');
    });
    await page.reload();
    const empty = await page.evaluate(() => performance.getEntriesByType('resource').map(r=>({url:r.name, bytes:r.encodedBodySize})).filter(r=>r.url.includes('/assets/')));
    assert.equal(empty.filter(r=>r.url.includes('/items/')).length, 0, 'empty room does not request catalog artwork');
    await page.screenshot({ path: path.join(out, 'empty-room.png') });
    const sets = {
      'oak-cozy': ['desk','wardrobe-oak','bookshelf','chair','drawers','bed-cream','floor-lamp','rug-moss','vintage-lamp','laptop','mug','pothos','candle','book-stack'],
      gamer: ['gamer-desk','wardrobe-dark','gamer-shelf','gamer-chair','gamer-dresser','gamer-bed','gamer-floor-lamp','gamer-rug','gamer-lamp','gamer-monitor','gamer-mug','gamer-plant','gamer-controller','gamer-games'],
      futuristic: ['future-desk','future-wardrobe','future-shelf','future-chair','future-dresser','future-bed','future-floor-lamp','future-rug','future-lamp','future-device','future-mug','future-plant','future-orb','future-books'],
      industrial: ['industrial-desk','wardrobe-rack','industrial-shelf','industrial-chair','industrial-dresser','industrial-bed','industrial-floor-lamp','industrial-rug','industrial-lamp','industrial-books','industrial-mug','industrial-basket','lantern','book-stack'],
      mixed: ['industrial-desk','wardrobe-dark','future-shelf','chair','drawers','bed-cream','industrial-floor-lamp','rug-moss','future-lamp','gamer-pc','mug','pothos','future-orb','book-stack'],
    };
    for (const [collection, ids] of Object.entries(sets)) {
      await page.goto(base + '?debug=true');
      await page.evaluate(async ids => {
        const { createEngine } = await import('./logic/engine.mjs'); const { createStorage } = await import('./logic/storage.mjs');
        const e = createEngine(createStorage(),{debug:true});e.debug('clear');e.debug('rich');e.chooseSize('large');e.debug('unlock');e.preference('lighting','day');
        const positions = [[0,0],[4,0],[0,4],[0,2],[3,0],[3,3],[5,2],[1,3]], keys=[];
        for (let i=0;i<8;i++) keys[i]=e.placeItem(ids[i],{gx:positions[i][0],gy:positions[i][1],rotation:0}).key;
        for (const [i,host,slot] of [[8,0,0],[9,0,1],[10,0,2],[11,4,0],[12,4,1],[13,2,0]]) {
          const p=e.state.room.placed[keys[host]];e.placeItem(ids[i],{gx:p.gx,gy:p.gy,parentSurfaceId:keys[host],surfaceSlot:slot});
        }
        for(const [id,gx,gy] of [['cat',4,5],['dog',0,5],['rabbit',2,5]]) e.placeItem(id,{gx,gy});
      }, ids);
      await page.reload(); await decode();
      if (collection === 'mixed') {
        await page.evaluate(async () => {
          const { createEngine } = await import('./logic/engine.mjs'); const { createStorage } = await import('./logic/storage.mjs');
          const e=createEngine(createStorage(),{debug:true});
          e.placeItem('goal-board',{wall:'left',index:1});e.placeItem('future-art',{wall:'right',index:3});
        });
        await page.reload(); await decode();
      }
      await page.screenshot({ path: path.join(out, `${collection}-room.png`) });
      if(collection==='oak-cozy') {
        const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.encodedBodySize})).filter(r=>r.url.includes('/assets/')));
        fs.writeFileSync(path.join(out,'network.json'),JSON.stringify({empty,decorated:resources},null,2));
        await page.setViewportSize({width:360,height:800});
        const edges=await page.locator('#room-shell').evaluate(image=>{
          const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
          const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
          let min=canvas.width,max=0;
          for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>128){min=Math.min(min,x);max=Math.max(max,x);}
          const b=image.getBoundingClientRect();return {left:b.left+min/canvas.width*b.width,right:b.left+max/canvas.width*b.width,viewport:innerWidth};
        });
        assert.ok(edges.left>=0&&edges.right<=edges.viewport,`Visible diorama clipped: ${JSON.stringify(edges)}`);
        await page.screenshot({path:path.join(out,'mobile-360.png')});await page.setViewportSize({width:1400,height:900});
      }
      if(collection !== 'mixed') {
        await page.goto(base + 'tools/preview.html'); await page.locator('#collection').selectOption(collection); await decode();
        await page.screenshot({ path:path.join(out,`${collection}-catalog.png`),fullPage:true });
      }
    }
    await page.goto(base+'tools/preview.html');
    await page.evaluate(()=>document.querySelectorAll('figure').forEach(f=>{if(!['cat','dog','rabbit'].includes(f.querySelector('img')?.dataset.sprite))f.remove();}));
    await decode();await page.screenshot({path:path.join(out,'pets-idle.png')});
    for(const pose of ['sleep','sit']) {
      await page.locator('#pose').selectOption(pose);
      await page.evaluate(()=>document.querySelectorAll('figure').forEach(f=>{if(!['cat','dog','rabbit'].includes(f.querySelector('img')?.dataset.sprite))f.remove();}));
      await decode();await page.screenshot({path:path.join(out,`pets-${pose}.png`)});
    }
    assert.deepEqual(errors,[]);console.log('Art review captured: '+out);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});


