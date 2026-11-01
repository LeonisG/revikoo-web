const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=JSON.parse(fs.readFileSync(process.env.QA_AUTH_FILE,'utf8'));
const out=path.resolve('cozy/docs/qa/bank-mvp'),base=process.env.BANK_URL||'http://127.0.0.1:8773/cozy/city/';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'}),checks=[],errors=[];
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 const stage=s=>p.waitForFunction(state=>window.cozyCity?.snapshot().bankState===state,s,{timeout:45000});
 const enter=async()=>{await p.locator('#enter-bank').click();await stage('OFFICE_IDLE');};
 const nav=name=>p.locator('#bank-finance nav').getByRole('button',{name,exact:true});
 const form=()=>p.locator('#bank-finance form');
 const ready=()=>p.waitForFunction(()=>document.querySelector('#bank-finance')?.getAttribute('aria-busy')!=='true');
 const shot=name=>p.screenshot({path:path.join(out,name+'.png'),fullPage:true});
 try{
  await p.goto(base);await stage('CITY_IDLE');await enter();
  await p.locator('#bank-finance').getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await form().getByLabel('Correo electrónico').fill(fixture.users[1].email);await form().getByLabel('Contraseña',{exact:true}).fill(fixture.users[1].password);await form().getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await p.getByRole('heading',{name:'Tu primera cuenta',exact:true}).waitFor();
  await form().getByLabel('Nombre de la cuenta').fill('Mi cuenta de prueba');await form().getByLabel('Saldo inicial (€)',{exact:true}).fill('1000,00');await form().getByRole('button',{name:'Guardar cuenta',exact:true}).click();
  await p.getByRole('heading',{name:'Mis cuentas',exact:true}).waitFor();assert.ok(await p.locator('#bank-finance').getByText('1.000,00 €',{exact:true}).count());checks.push('Real Auth login and first-account onboarding inside office');
  await nav('Añadir movimiento').click();await form().getByLabel('Importe (€)',{exact:true}).fill('100,00');await form().getByLabel('Concepto (opcional)',{exact:true}).fill('Compra de prueba');
  // Hold the actual write until WRITE has been verified; only then release it.
  let release;const gate=new Promise(r=>release=r);
  await p.route('**/rest/v1/rpc/finance_mutate',async route=>{if(route.request().postDataJSON().p_action==='transaction.save')await gate;await route.continue();});
  await form().getByRole('button',{name:'Guardar movimiento',exact:true}).click();
  await p.waitForFunction(()=>cozyCity.snapshot().nilo.clip==='NILO_WRITE');assert.equal(await form().getByRole('button',{name:'Guardar movimiento'}).isDisabled(),true);
  release();await p.getByRole('heading',{name:'Tu resumen',exact:true}).waitFor();await p.waitForFunction(()=>cozyCity.snapshot().nilo.clip==='NILO_STAMP');
  assert.equal(await p.locator('.bank-total strong').innerText(),'900,00\u00a0€');await p.unroute('**/rest/v1/rpc/finance_mutate');await shot('dashboard-desktop');checks.push('Expense persisted, balance 900 EUR, WRITE during request and STAMP only after backend response');
  await p.locator('#return-city').click();await stage('CITY_IDLE');await enter();await p.getByRole('heading',{name:'Tu resumen',exact:true}).waitFor();assert.equal(await p.locator('.bank-total strong').innerText(),'900,00\u00a0€');
  await p.reload();await stage('CITY_IDLE');await enter();await p.getByRole('heading',{name:'Tu resumen',exact:true}).waitFor();assert.equal(await p.locator('.bank-total strong').innerText(),'900,00\u00a0€');checks.push('Office return/re-entry and full page reload retain real account data');
  await nav('Añadir movimiento').click();await form().getByLabel('Importe (€)',{exact:true}).fill('18,500');await form().getByRole('button',{name:'Guardar movimiento',exact:true}).click();await ready();assert.match(await p.locator('#bank-error').innerText(),/dos decimales/);assert.equal((await p.evaluate(()=>cozyCity.snapshot())).nilo.clip,'NILO_IDLE');
  await form().getByLabel('Importe (€)',{exact:true}).fill('18,50');await form().getByLabel('Concepto (opcional)').fill('Respuesta perdida QA');
  let lost=true;
  await p.route('**/rest/v1/rpc/finance_mutate',async route=>{const body=route.request().postDataJSON();if(lost&&body.p_action==='transaction.save'){lost=false;const response=await route.fetch();assert.equal(response.ok(),true);await route.abort('failed');}else await route.continue();});
  await form().getByRole('button',{name:'Guardar movimiento',exact:true}).click();await p.locator('#bank-error:not([hidden])').waitFor();await ready();
  assert.equal((await p.evaluate(()=>cozyCity.snapshot())).nilo.clip,'NILO_IDLE');await form().getByRole('button',{name:'Guardar movimiento',exact:true}).click();await p.getByRole('heading',{name:'Tu resumen',exact:true}).waitFor();
  assert.equal(await p.locator('.bank-total strong').innerText(),'881,50\u00a0€');assert.equal(await p.locator('.bank-movements strong').getByText('Respuesta perdida QA',{exact:true}).count(),1);await p.unroute('**/rest/v1/rpc/finance_mutate');checks.push('Invalid decimals do not submit; committed request with lost response retries without duplication or false STAMP');
  await p.locator('.bank-movements li').filter({hasText:'Respuesta perdida QA'}).getByRole('button',{name:/Editar/}).click();await form().getByLabel('Importe (€)',{exact:true}).fill('10,00');await form().getByRole('button',{name:'Guardar corrección'}).click();await p.getByRole('heading',{name:'Tu resumen',exact:true}).waitFor();assert.equal(await p.locator('.bank-total strong').innerText(),'890,00\u00a0€');
  await p.locator('.bank-movements li').filter({hasText:'Respuesta perdida QA'}).getByRole('button',{name:/Eliminar/}).click();await ready();assert.equal(await p.locator('.bank-total strong').innerText(),'900,00\u00a0€');checks.push('UI edit/delete confirmations and balance recalculation');
  await p.locator('#bank-finance').getByRole('button',{name:'Cerrar sesión',exact:true}).click();await p.getByRole('heading',{name:'Tu dinero, con calma.',exact:true}).waitFor();assert.equal(await p.locator('#bank-finance').getByText('Compra de prueba').count(),0);checks.push('Logout immediately removes financial data');
  await p.locator('#bank-finance').getByRole('button',{name:'Iniciar sesión',exact:true}).click();await form().getByLabel('Correo electrónico').fill(fixture.users[0].email);await form().getByLabel('Contraseña',{exact:true}).fill(fixture.users[0].password);await form().getByRole('button',{name:'Iniciar sesión',exact:true}).click();await p.getByRole('heading',{name:'Tu resumen',exact:true}).waitFor();
  assert.equal(await p.locator('#bank-finance').getByText('Compra de prueba').count(),0);await nav('Habituales').click();await p.getByRole('heading',{name:'Movimientos habituales',exact:true}).waitFor();await shot('recurring-desktop');checks.push('Switching user shows only the new identity and persistent recurrence decisions');
  await p.setViewportSize({width:360,height:800});await nav('Resumen').click();await shot('dashboard-mobile');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),360);await nav('Añadir movimiento').click();await shot('form-mobile');assert.equal(await form().getByRole('button',{name:'Guardar movimiento'}).isEnabled(),true);checks.push('360 px responsive panel and usable form');
  await p.locator('#bank-finance').getByRole('button',{name:'Minimizar panel financiero'}).click();await p.getByRole('button',{name:'Abrir mi banco'}).waitFor();await shot('nilo-mobile');await p.getByRole('button',{name:'Abrir mi banco'}).click();await p.locator('#return-city').click();await stage('CITY_IDLE');
  assert.deepEqual(errors,[]);checks.push('Nilo can be uncovered and city return remains available; no uncaught browser errors');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),url:base,checks,errors,fixture:'Real temporary Supabase users; screenshot finances are QA data.'},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
 }catch(error){await shot('failure');console.error(await p.locator('#bank-finance').innerText().catch(()=>''));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
