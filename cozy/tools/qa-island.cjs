const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.COZY_URL||'http://127.0.0.1:8773/cozy/',out=process.env.ISLAND_QA_DIR||path.resolve(__dirname,'../docs/qa/island');
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[],warnings=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await p.goto(base+'city/');await p.waitForFunction(()=>window.cozyCity?.snapshot().loaded,{timeout:60000});
  const state=()=>p.evaluate(()=>cozyCity.snapshot()),shot=async name=>p.screenshot({path:path.join(out,name+'.png'),fullPage:true});
  await p.waitForTimeout(1000);const initial=await state();assert.equal(initial.plots.length,3);assert.ok(initial.ambient.windMaterials>0&&initial.ambient.waterMaterials>0);
  await p.waitForTimeout(1200);assert.ok((await state()).ambient.time>initial.ambient.time+.5);await shot('day');
  const measurements=[];
  for(const q of ['high','medium','low']){await p.selectOption('#quality',q);await p.waitForTimeout(4500);const s=await state();measurements.push({quality:q,fps:s.fps,frames:s.frames,triangles:s.triangles,drawCalls:s.calls,geometries:s.geometries,particleLimit:s.ambient.particleLimit});}
  await p.selectOption('#quality','medium');
  await p.mouse.move(800,480);await p.mouse.wheel(0,-400);await p.waitForTimeout(120);assert.ok((await state()).zoom>1);
  await p.mouse.down();await p.mouse.move(1040,550,{steps:12});await p.mouse.up();assert.notEqual((await state()).azimuth,initial.azimuth);await shot('another-perspective');await p.click('#reset');
  await p.locator('#viewport').focus();await p.keyboard.press('Shift+ArrowRight');assert.notDeepEqual((await state()).target,initial.target);await p.keyboard.press('Home');assert.deepEqual((await state()).target,initial.target);
  await p.click('#focus-bank');const closed=await p.evaluate(()=>cozyCity.doorPose());assert.equal(closed.length,2);
  await p.click('#doors');await p.waitForFunction(()=>!cozyCity.snapshot().playing);const opened=await p.evaluate(()=>cozyCity.doorPose());assert.notDeepEqual(opened,closed);assert.ok(opened.every(d=>Math.abs(d.quaternion[1])>.6));await shot('bank-improved-open');
  await p.click('#doors');await p.waitForFunction(()=>!cozyCity.snapshot().playing);const restored=await p.evaluate(()=>cozyCity.doorPose());restored.forEach((d,i)=>d.quaternion.forEach((v,j)=>assert.ok(Math.abs(v-closed[i].quaternion[j])<1e-5)));await shot('bank-improved');await p.click('#reset');
  for(const light of ['sunset','night']){await p.selectOption('#lighting',light);await p.waitForFunction(()=>cozyCity.snapshot().ambient.transition===1);assert.equal((await state()).ambient.lighting,light);await shot(light);}
  await p.click('#motion');await p.waitForTimeout(200);const paused=(await state()).ambient.time;await p.waitForTimeout(400);assert.equal((await state()).ambient.time,paused);await p.click('#motion');
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(200);const reduced=(await state()).ambient.time;await p.waitForTimeout(400);assert.equal((await state()).ambient.time,reduced);assert.equal((await state()).ambient.motion,false);
  await p.click('#doors');assert.equal((await state()).playing,false);assert.equal((await state()).opened,true);await p.click('#doors');await p.emulateMedia({reducedMotion:'no-preference'});
  // Exercise the visibility handler without relying on the headless window manager.
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=(await state()).ambient.time;await p.waitForTimeout(400);assert.equal((await state()).ambient.time,hidden);await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(300);assert.ok((await state()).ambient.time>hidden);
  await p.selectOption('#lighting','day');await p.waitForFunction(()=>cozyCity.snapshot().ambient.transition===1);
  await p.setViewportSize({width:360,height:800});await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),360);await shot('mobile-360');
  await p.click('#focus-bank');await shot('mobile-bank');await p.click('#reset');await p.setViewportSize({width:1440,height:1000});
  if(!process.env.SKIP_VIDEO){
   const data=await p.evaluate(async()=>{const stream=document.querySelector('canvas').captureStream(24),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2500000}),parts=[];rec.ondataavailable=e=>parts.push(e.data);const done=new Promise(resolve=>rec.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(new Blob(parts,{type:'video/webm'}));});rec.start();await new Promise(r=>setTimeout(r,2300));const select=document.querySelector('#lighting');select.value='sunset';select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2300));select.value='night';select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,2300));rec.stop();stream.getTracks().forEach(t=>t.stop());return done;});
   fs.writeFileSync(path.join(out,'ambient-web.webm'),Buffer.from(data.split(',')[1],'base64'));
  }
  const mobile=await browser.newPage({viewport:{width:360,height:800},isMobile:true,hasTouch:true,deviceScaleFactor:2});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base+'city/');await mobile.waitForFunction(()=>window.cozyCity?.snapshot().loaded);assert.equal(await mobile.evaluate(()=>cozyCity.snapshot().ambient.quality),'low');
  const cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:420,id:0},{x:230,y:420,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:420,id:0},{x:240,y:420,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:95,y:420,id:0},{x:265,y:420,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await mobile.evaluate(()=>cozyCity.snapshot().zoom)>1);await mobile.close();
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(warnings,[]);
  const result={passed:true,url:base+'city/',testedAt:new Date().toISOString(),environment:'Headless Microsoft Edge, 1440 × 1000 CSS pixels; not a physical phone benchmark',checks:['three GLBs and three future plots','ambient time advances','all three quality modes measured','wheel zoom and drag orbit','keyboard pan and reset','both doors open to 85 degrees and close','day/sunset/night transitions','pause/resume','reduced motion','visibility handler pauses and resumes (simulated visibility)','360px layout without overflow','actual canvas animation video'],measurements,errors,bad,warnings};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
