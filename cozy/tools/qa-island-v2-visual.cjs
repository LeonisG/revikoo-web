const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../docs/qa/island-v2/comparison');fs.mkdirSync(out,{recursive:true});
const shots={paths:[[10,-5,2.3],5],bench:[[6,-8,2.7],12],fountain:[[1,-4,3.25],10],lamp:[[7,-9,4.1],12],fences:[[-24,1,2.8],9],gardens:[[-7,-10,2.5],12],trees:[[-30,0,4.4],4],river:[[-9.8,7.9,3.4],6],waterfall:[[-9.88,-28,-.5],7]};
(async()=>{const b=await chromium.launch({channel:'msedge'});try{
 for(const version of ['v1','v2']){
  const p=await b.newPage({viewport:{width:1100,height:900}});
  await p.route('**/city/city.mjs',async r=>{const response=await r.fetch(),body=(await response.text()).replace('window.cozyCity={','window.cozyCity={inspect:(p,z)=>{target.fromArray(p);zoom=z;azimuth=-1.98;elevation=.67;aim();},');await r.fulfill({response,body});});
  const prefix=version==='v1'?'cozy/local-backups/island-before-v2/cozy/':'cozy/';await p.goto('http://127.0.0.1:8773/'+prefix+'city/');await p.waitForFunction(()=>window.cozyCity?.snapshot().loaded);
  await p.selectOption('#quality','high');await p.click('#motion');await p.addStyleTag({content:'header,footer,.intro,.world-settings,.controls,.hint,#status{display:none!important}main{height:100vh!important}'});
  for(const [name,[target,zoom]] of Object.entries(shots)){await p.evaluate(([a,z])=>cozyCity.inspect(a,z),[target,zoom]);await p.waitForTimeout(150);await p.locator('canvas').screenshot({path:path.join(out,name+'-'+version+'.png')});}
  await p.close();
 }
 console.log('Saved matched V1/V2 camera comparisons for',Object.keys(shots));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
