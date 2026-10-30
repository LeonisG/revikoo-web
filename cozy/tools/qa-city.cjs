const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.COZY_URL||'http://127.0.0.1:8773/cozy/',out=path.resolve(__dirname,'../docs/qa/city');
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({channel:'msedge'});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await p.goto(base+'city/');await p.waitForFunction(()=>window.cozyCity?.snapshot().loaded,{timeout:60000});
 const state=()=>p.evaluate(()=>cozyCity.snapshot());await p.waitForTimeout(300);
 await p.screenshot({path:path.join(out,'desktop.png')});const initial=await state();assert.equal(initial.triangles>40000,true);
 await p.mouse.move(800,480);await p.mouse.wheel(0,-400);await p.waitForTimeout(150);assert.ok((await state()).zoom>initial.zoom);
 await p.mouse.down();await p.mouse.move(1000,560,{steps:12});await p.mouse.up();assert.notEqual((await state()).azimuth,initial.azimuth);
 await p.click('#reset');assert.equal((await state()).zoom,1);assert.equal((await state()).azimuth,initial.azimuth);
 const closed=await p.evaluate(()=>cozyCity.doorPose());await p.click('#doors');await p.waitForFunction(()=>!cozyCity.snapshot().playing);const opened=await p.evaluate(()=>cozyCity.doorPose());assert.notDeepEqual(opened,closed);
 await p.screenshot({path:path.join(out,'doors-open.png')});await p.click('#doors');await p.waitForFunction(()=>!cozyCity.snapshot().playing);const restored=await p.evaluate(()=>cozyCity.doorPose());restored.forEach((door,i)=>door.quaternion.forEach((v,j)=>assert.ok(Math.abs(v-closed[i].quaternion[j])<1e-6)));
 await p.locator('#viewport').focus();await p.keyboard.press('ArrowRight');assert.notEqual((await state()).azimuth,initial.azimuth);await p.keyboard.press('Home');
 await p.setViewportSize({width:360,height:800});await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),360);await p.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 await p.goto(base);await p.click('#setup-next');await p.click('#setup-next');await p.locator('#setup').waitFor({state:'hidden'});await p.click('[data-open="settings"]');await p.locator('a[href="./city/"]').waitFor({state:'visible'});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,initial,errors,bad},null,2));console.log('PASS city',initial);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
