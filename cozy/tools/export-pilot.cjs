// Render real GLB geometry; never mirrors or warps a 2D source.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path');
const id = process.argv[2] || 'desk';
if (!/^[a-z-]+$/.test(id)) throw new Error('Invalid asset id');
const dir = path.resolve(__dirname,`../assets/candidates/tripo-${id}`);
const base = process.env.COZY_URL || 'http://127.0.0.1:8765/cozy/';
(async()=>{
  const b=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge'});
  try {
    const p=await b.newPage({viewport:{width:1150,height:850}}),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'tools/model-review.html?asset='+id); await p.waitForFunction(()=>window.cozyModelReview);
    for(const angle of [0,90,180,270]) {
      for(const [prefix,material] of [['view','albedo'],['shadow','shadow']]) {
        await p.evaluate(o=>cozyModelReview.draw(o),{angle,material});
        const url=await p.evaluate(()=>cozyModelReview.canvas.toDataURL('image/png'));
        fs.writeFileSync(path.join(dir,`${prefix}-${angle}.png`),Buffer.from(url.split(',')[1],'base64'));
      }
    }
    for(const [name,material,view,angle] of [['clay','clay','canonical',0],['wire','wire','canonical',0],['lit','lit','canonical',0],['back','clay','back',0],['underside','clay','underside',0]]) {
      await p.evaluate(o=>cozyModelReview.draw(o),{material,view,angle});
      await p.locator('canvas').screenshot({path:path.join(dir,`${name}-review.png`)});
    }
    const metrics=await p.evaluate(()=>cozyModelReview.metrics);
    metrics.browserErrors=errors;
    fs.writeFileSync(path.join(dir,'render-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
    if(errors.length)throw new Error(errors.join('\n'));
    console.log(JSON.stringify({views:4,triangles:metrics.triangles,projectedTop:metrics.projectedTop,errors}));
  } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
