import {getSupabase} from './supabase-client.mjs';
import {AuthService} from './auth-service.mjs';
import {FinanceService,requestReceipt,clearReceipts,friendlyError} from './finance-service.mjs';
import {createFinanceState,clearFinanceState} from './finance-state.mjs';
import {parseCents,todayISO,shiftMonth,pendingOccurrences} from './finance-calculations.mjs';
import {button,title,escapeHTML} from './finance-ui.mjs';
import {authView} from './finance-auth.mjs';
import {accountsView,accountForm} from './finance-accounts.mjs';
import {transactionForm,movementList} from './finance-transactions.mjs';
import {dashboardView} from './finance-dashboard.mjs';
import {recurringView} from './finance-recurring.mjs';

export function createFinanceApp({root,nilo,onAuthReturn=()=>{},onReturnCity=()=>{},onFullscreenChange=()=>{}}) {
 const state=createFinanceState(),events=new AbortController();
 let client,auth,service,subscription,initializing,selection=null,salary=null,disposed=false,visible=false,historyMore=false,readVersion=0;
 let mode='office',full=false,returnAction='dashboard',scrollStyle='',series=[],demo=false,historyLoaded=false;
 const monthCache=new Map(),inertStates=new Map();
 const recoveryReturn=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
 const hasAuthReturn=/access_token=|error_description=/.test(location.hash)||new URLSearchParams(location.search).has('code');
 const on=(el,event,fn,capture=false)=>el.addEventListener(event,fn,{signal:events.signal,capture});
 function note(message,error=false) {state[error?'error':'notice']=message;const el=root.querySelector(error?'#bank-error':'#bank-notice');if(el){el.textContent=message;el.hidden=!message;}}
 function greeting(){const welcome=document.getElementById('welcome');if(!visible)return;welcome.textContent=state.user?'¡Bienvenido de nuevo! ¿Qué hacemos hoy?':'¡Hola! Vamos a cuidar de tus pequeños comienzos.';}
 function fullscreen(value){
  if(value===full)return;
  full=value;root.dataset.fullscreen=String(value);
  if(value){
   returnAction=document.activeElement?.dataset?.action||'dashboard';scrollStyle=document.body.style.overflow;document.body.style.overflow='hidden';
   for(const el of document.body.children)if(el!==root&&!['SCRIPT','STYLE'].includes(el.tagName)){inertStates.set(el,el.inert);el.inert=true;}
  }else{document.body.style.overflow=scrollStyle;for(const [el,value] of inertStates)el.inert=value;inertStates.clear();}
  onFullscreenChange(value);
 }
 function closeOverlay(){mode='office';fullscreen(false);render();root.querySelector(`[data-action="${returnAction}"]`)?.focus({preventScroll:true});}
 function render(focus=false) {
  if(disposed)return;
  const isFull=visible&&mode!=='office';fullscreen(isFull);root.dataset.mode=mode;
  const alerts=`<p id="bank-error" class="bank-error" role="alert" ${state.error?'':'hidden'}>${escapeHTML(state.error)}</p><p id="bank-notice" class="bank-notice" role="status" ${state.notice?'':'hidden'}>${escapeHTML(state.notice)}</p>`;
  if(mode==='office'){
   root.innerHTML=`<aside class="bank-welcome" aria-label="Bienvenida a Cozy Bank"><span class="bank-eyebrow">COZY BANK · TU RINCÓN FINANCIERO</span><h2>¿Por dónde empezamos?</h2><div class="bank-welcome-actions">${state.user?button('Abrir mis finanzas','dashboard','class="bank-primary"')+button('Añadir movimiento','transaction.new')+button('Ver a Nilo','nilo'):button('Iniciar sesión','login','class="bank-primary"')+button('Crear cuenta','register')}${button('Volver a la ciudad','city')}</div>${alerts}</aside>`;
   greeting();return;
  }
  let content;
  if(state.recovery)content=authView('password');
  else if(!state.user)content=authView(state.view);
  else if(!state.data)content=`<div class="bank-loading">${title('Un momento de calma…')}<p>Estamos preparando tus cuentas.</p><div class="bank-skeleton" aria-hidden="true"></div>${button('Reintentar','reload')}</div>`;
  else if(state.view==='account')content=accountForm(selection,!state.data.accounts.length);
  else if(state.view==='accounts')content=accountsView(state.data);
  else if(state.view==='transaction')content=transactionForm(state.data,selection||{});
  else if(state.view==='rule')content=transactionForm(state.data,selection||{},true);
  else if(state.view==='recurring')content=recurringView(state.data);
  else if(state.view==='history')content=`<div class="bank-section-heading"><div><span class="bank-eyebrow">CADA PEQUEÑO PASO</span>${title('Tus movimientos')}<p>El detalle de lo que entra, sale y cambia de lugar.</p></div>${button('Añadir movimiento','transaction.new','class="bank-primary"')}</div>${movementList(state.history,state.data)}${historyMore?button('Cargar más','history.more','class="bank-load-more"'):''}`;
  else content=dashboardView(state.data,state.month,series);
  const authMode=!state.user||state.recovery;
  const name=String(state.user?.user_metadata?.full_name||'').trim().split(/\s+/)[0];
  const menu=`<nav class="bank-nav" aria-label="Finanzas">${[['dashboard','Resumen','◫'],['history','Movimientos','↗'],['accounts','Mis cuentas','▤'],['recurring','Habituales','↻']].map(([action,label,icon])=>`<button type="button" data-action="${action}" aria-current="${state.view===action?'page':'false'}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav>`;
  root.innerHTML=authMode?`<div class="bank-overlay bank-auth-overlay" role="dialog" aria-modal="true" aria-label="Acceso a Cozy Bank"><button class="bank-auth-back" data-action="collapse">← Volver al despacho</button><div class="bank-auth-card"><div class="bank-brand"><span class="bank-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21V10M12 16C4 17 3 10 3 8c6 0 9 3 9 8ZM12 13c8 0 9-7 9-9-6 0-9 3-9 9Z"/></svg></span>cozy<span>bank.</span></div>${alerts}${content}<div class="bank-auth-footer">UN PEQUEÑO PASO HACIA TU TRANQUILIDAD</div></div></div>`:`<div class="bank-overlay bank-workspace" role="dialog" aria-modal="true" aria-label="Cozy Finance"><div class="bank-shell-header"><div class="bank-brand"><span class="bank-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21V10M12 16C4 17 3 10 3 8c6 0 9 3 9 8ZM12 13c8 0 9-7 9-9-6 0-9 3-9 9Z"/></svg></span>cozy<span>bank.</span></div><span class="bank-greeting">${name?'Hola, '+escapeHTML(name)+'.':'Un lugar para tus pequeños comienzos.'}</span><div class="bank-header-actions">${demo?'<span class="bank-demo">Datos de demostración</span>':''}${button('← Volver a Nilo','collapse')}${button('Salir','logout','class="bank-mobile-logout" aria-label="Cerrar sesión"')}</div></div><aside class="bank-sidebar"><span class="bank-eyebrow">TU ESPACIO</span>${menu}<div class="bank-sidebar-bottom"><p>Poco a poco,<br><em>también se llega lejos.</em></p>${button('Cerrar sesión','logout')}</div></aside><div class="bank-scroll"><div class="bank-content">${alerts}${content}${salary?`<aside class="bank-salary"><p>¿Guardamos esta nómina como movimiento mensual?</p>${button('Crear plantilla de nómina','salary')}${button('Ahora no','salary.dismiss')}</aside>`:''}</div><p class="bank-footnote">COZY BANK · TUS FINANZAS, CON CALMA</p></div></div>`;
  configureType();greeting();const scroller=root.querySelector('.bank-scroll');if(scroller)scroller.scrollTop=0;if(state.busy)busy(true);if(focus||isFull)root.querySelector('h2')?.focus({preventScroll:true});
 }
 function configureType() {
  const form=root.querySelector('form[data-form="transaction"],form[data-form="rule"]');if(!form)return;
  const type=form.elements.transaction_type.value,transfer=type==='transfer';
  form.querySelector('label[for="bank-account_id"]').textContent=transfer?'Cuenta origen':'Cuenta';
  form.querySelector('[data-category]').hidden=transfer;form.elements.category_id.disabled=transfer;
  form.querySelector('[data-destination]').hidden=!transfer;form.elements.destination_account_id.disabled=!transfer;
  const current=form.elements.category_id.value;
  const categories=state.data.categories.filter(c=>c.category_type===type);
  form.elements.category_id.innerHTML=categories.map(c=>`<option value="${c.id}" ${c.id===current?'selected':''}>${escapeHTML(c.name)}</option>`).join('');
 }
 function busy(value){state.busy=value;root.setAttribute('aria-busy',String(value));for(const el of root.querySelectorAll('button,input,select')){if(value){el.dataset.wasDisabled=String(el.disabled);el.disabled=true;}else if('wasDisabled' in el.dataset){el.disabled=el.dataset.wasDisabled==='true';delete el.dataset.wasDisabled;}}}
 function animate(phase){nilo(phase);}
 async function load(refresh=false) {
  const generation=state.generation,version=++readVersion,month=state.month;
  if(refresh)monthCache.clear();
  const snapshot=async m=>{if(monthCache.has(m))return monthCache.get(m);const d=await service.snapshot(m);if(generation===state.generation&&version===readVersion)monthCache.set(m,d);return d;};
  const data=await snapshot(month);
  const months=Array.from({length:7},(_,i)=>shiftMonth(month,i-6));
  const trend=[];
  // Bounded reads reuse the existing owner-scoped aggregate RPC and cache.
  for(let i=0;i<months.length;i+=3)trend.push(...await Promise.all(months.slice(i,i+3).map(async m=>{const d=await snapshot(m);return {month:m,income_cents:d.income_cents,expense_cents:d.expense_cents};})));
  if(disposed||generation!==state.generation||version!==readVersion)return;
  state.data=data;series=trend;
  while(monthCache.size>24)monthCache.delete(monthCache.keys().next().value);
  if(!data.accounts.length){state.view='account';selection=null;}
  else if(['welcome','login','register','recover'].includes(state.view))state.view='dashboard';
  render();
  const pending=pendingOccurrences(data.rules,data.occurrences);
  if(pending.length&&state.view==='dashboard')note(`Tienes ${pending.length} movimiento${pending.length===1?'':'s'} previsto${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}. Revísalos en Habituales.`);
 }
 async function changed(event,session) {
  if(disposed)return;
  const next=session?.user||null;
  if(event==='PASSWORD_RECOVERY'){state.recovery=true;state.view='password';}
  if(next?.id===state.user?.id&&event!=='PASSWORD_RECOVERY')return;
  const wasRecovery=state.recovery;
  if(next&&(mode==='auth'||hasAuthReturn))mode=wasRecovery?'auth':'finance';
  if(!next)mode='office';
  monthCache.clear();series=[];demo=false;historyLoaded=false;
  clearFinanceState(state);state.user=next;state.recovery=wasRecovery&&!!next;selection=null;salary=null;readVersion++;
  render();
  if(next){const gen=state.generation;try{const marker=await client.from('finance_requests').select('request_id').eq('action','fixture.cozy-glass-v1.1').limit(1);if(gen!==state.generation)return;demo=!!marker.data?.length;await service.bootstrap();if(gen===state.generation)await load();}catch(e){if(gen===state.generation)note(friendlyError(e),true);}}
  else clearReceipts();
 }
 async function init() {
  if(initializing)return initializing;
  initializing=(async()=>{
   client=await getSupabase();auth=new AuthService(client);service=new FinanceService(client);
   state.recovery=recoveryReturn;
   subscription=client.auth.onAuthStateChange((event,session)=>{
    // Never await SDK methods within the Auth lock callback.
    if(!session&&state.user){mode='office';monthCache.clear();series=[];demo=false;clearFinanceState(state);selection=null;salary=null;clearReceipts();render();}
    setTimeout(()=>changed(event,session),0);
   }).data.subscription;
   const {data,error}=await client.auth.getSession();if(error)throw error;
   if(data.session&&state.user?.id!==data.session.user.id)await changed('INITIAL_SESSION',data.session);
   if(hasAuthReturn){onAuthReturn();if(!data.session){state.recovery=false;state.view='recover';mode='auth';render();note('No se ha podido validar el enlace. Solicita uno nuevo.',true);}}
   render();
  })().catch(e=>{initializing=null;note(friendlyError(e),true);throw e;});
  return initializing;
 }
 async function save(action,payload,{next='dashboard',message='Guardado en tu banco.'}={}) {
  const generation=state.generation;
  const receipt=await requestReceipt(state.user.id,action,payload);
  animate('saving');
  try{
   const result=await service.mutate(action,payload,receipt.id);
   receipt.clear();
   if(generation!==state.generation||disposed)return;
   animate('success');state.view=next;selection=null;state.error='';state.notice=message;
   historyLoaded=false;try {await load(true);if(next==='history')await history(false);}catch {render();note('La operación se ha guardado, pero no se han podido actualizar los saldos. Pulsa Actualizar antes de registrar otra.',true);}
   return result;
  }catch(error){if(generation===state.generation)animate('error');throw error;}
 }
 async function history(more=false) {
  const generation=state.generation,items=await service.history(more?state.history.at(-1):null);
  if(generation!==state.generation)return;
  state.history=more?[...state.history,...items]:items;historyMore=items.length===50;historyLoaded=true;state.view='history';render(true);
 }
 function navigate(view,item=null) {mode=state.user&&!state.recovery?'finance':'auth';state.view=view;selection=item;state.error='';state.notice='';render(true);}
 function confirmAction(message){
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='bank-confirm';dialog.setAttribute('aria-labelledby','bank-confirm-title');
   dialog.innerHTML=`<h2 id="bank-confirm-title">Un momento antes de seguir</h2><p>${escapeHTML(message)}</p><div class="bank-row"><button type="button" data-answer="no" autofocus>Cancelar</button><button type="button" class="bank-primary" data-answer="yes">Confirmar</button></div>`;
   const finish=value=>{dialog.close();dialog.remove();resolve(value);};
   dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
   dialog.addEventListener('click',event=>{const answer=event.target.closest('[data-answer]');if(answer)finish(answer.dataset.answer==='yes');});
   root.append(dialog);dialog.showModal();
  });
 }
 async function action(action,el) {
  if(action==='collapse'){closeOverlay();return;}
  if(action==='city'){onReturnCity();return;}
  if(action==='nilo'){root.innerHTML=button('Abrir mis finanzas','dashboard','class="bank-open-finance"');document.getElementById('office-motion').focus();return;}
  if(action==='logout'){
   mode='office';monthCache.clear();series=[];demo=false;historyLoaded=false;clearFinanceState(state);selection=null;salary=null;clearReceipts();animate('idle');render();
   try{await auth.signOut();}catch{note('Los datos se han ocultado. No se pudo cerrar la sesión en el servidor; reintenta al recuperar la conexión.',true);}return;
  }
  if(action==='reload'){if(state.user)await load(true);return;}
  if(['welcome','register','login','recover'].includes(action)){navigate(action);return;}
  if(!state.user)return;
  if(!state.data){mode='finance';render(true);await load();return;}
  if(action==='dashboard'||action==='accounts'||action==='recurring'){navigate(action);return;}
  if(action==='history'||action==='history.more'){if(action==='history'&&historyLoaded)navigate('history');else{mode='finance';await history(action.endsWith('.more'));}return;}
  if(action.startsWith('month.')){state.month=shiftMonth(state.month,action==='month.prev'?-1:1);await load();return;}
  if(action==='account.new'){navigate('account');return;}
  if(action==='account.edit'){navigate('account',state.data.accounts.find(a=>a.id===el.dataset.id));return;}
  if(action==='transaction.new'){navigate('transaction',el.dataset.kind?{transaction_type:el.dataset.kind}:null);animate('idle');return;}
  const tx=[...state.history,...state.data.recent].find(t=>t.id===el.dataset.id);
  if(action==='transaction.edit'){if(tx)navigate('transaction',tx);return;}
  if(action==='transaction.delete'){
   if(tx&&await confirmAction('¿Eliminar este movimiento? Se recalcularán los saldos. Esta acción no se puede deshacer.'))await save('transaction.delete',{id:tx.id});return;
  }
  if(action==='rule.new'){navigate('rule');return;}
  const rule=state.data.rules.find(r=>r.id===el.dataset.id);
  if(action==='rule.edit'){if(rule)navigate('rule',rule);return;}
  if(action==='rule.toggle'){if(rule)await save('rule.toggle',{id:rule.id,active:!rule.active},{next:'recurring'});return;}
  if(action==='salary'){const template=salary;salary=null;navigate('rule',template);return;}
  if(action==='salary.dismiss'){salary=null;render();return;}
  if(action.startsWith('occurrence.')){
   const payload={rule_id:el.dataset.rule,period:el.dataset.period,decision:action==='occurrence.skip'?'skipped':'postponed'};
   if(payload.decision==='skipped'&&!await confirmAction('¿Omitir este periodo? No creará ningún movimiento.'))return;
   if(payload.decision==='postponed')payload.postponed_until=new Date(new Date(todayISO()+'T12:00:00Z').getTime()+7*86400000).toISOString().slice(0,10);
   await save('occurrence.decide',payload,{next:'recurring',message:payload.decision==='skipped'?'Periodo omitido.':'Te lo recordaré dentro de siete días.'});
  }
 }
 async function submitForm(form,values) {
  const kind=form.dataset.form;
  if(['login','register','recover','password'].includes(kind)){
   await init();
   if(kind==='login')await auth.signIn(values.email.trim(),values.password);
   if(kind==='register'){await auth.signUp(values.email.trim(),values.password);note('Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión.');}
   if(kind==='recover'){await auth.recover(values.email.trim());note('Si el correo está registrado, recibirás un enlace para recuperar el acceso.');}
   if(kind==='password'){await auth.updatePassword(values.password);state.recovery=false;mode='finance';state.view='dashboard';await load();note('Contraseña actualizada.');}
   return;
  }
  if(!state.user)throw new Error('Inicia sesión para guardar.');
  if(kind==='account'){
   await save('account.save',{...(form.dataset.id?{id:form.dataset.id}:{}),name:values.name.trim(),account_type:values.account_type,initial_balance_cents:parseCents(values.initial_balance,{signed:true}),is_primary:values.is_primary==='on'},{next:'accounts'});return;
  }
  if(kind==='occurrence'){
   await save('occurrence.decide',{rule_id:form.dataset.rule,period:form.dataset.period,decision:'confirmed',amount_cents:parseCents(values.amount)},{next:'recurring',message:'Movimiento confirmado y contabilizado.'});return;
  }
  if(kind==='transaction'||kind==='rule'){
   const transfer=values.transaction_type==='transfer';
   if(transfer&&values.account_id===values.destination_account_id)throw new Error('Elige dos cuentas distintas para la transferencia.');
   const payload={...(form.dataset.id?{id:form.dataset.id}:{}),transaction_type:values.transaction_type,amount_cents:parseCents(values.amount),account_id:values.account_id,destination_account_id:transfer?values.destination_account_id:null,category_id:transfer?null:values.category_id};
   if(kind==='rule')Object.assign(payload,{name:values.name.trim(),day_of_month:Number(values.day_of_month),start_date:values.start_date,active:selection?.active??true});
   else Object.assign(payload,{description:values.description.trim(),occurred_on:values.occurred_on});
   if(form.dataset.id&&!await confirmAction('¿Guardar la corrección? Los saldos se actualizarán con estos datos.'))return;
   const isSalary=kind==='transaction'&&!form.dataset.id&&state.data.categories.find(c=>c.id===payload.category_id)?.slug==='nomina';
   const result=await save(kind==='rule'?'rule.save':'transaction.save',payload,{next:kind==='rule'?'recurring':'dashboard'});
   if(result&&isSalary){salary={...payload,id:undefined,name:'Nómina',day_of_month:Number(values.occurred_on.slice(-2)),start_date:shiftMonth(values.occurred_on.slice(0,7)+'-01',1)};render();}
  }
 }
 async function run(work){if(state.busy)return;busy(true);state.error='';note('',true);try{await work();}catch(e){animate('error');if(e?.status===401||['28000','PGRST301','PGRST303'].includes(e?.code)){mode='auth';monthCache.clear();series=[];demo=false;clearFinanceState(state);state.view='login';render();}note(friendlyError(e),true);}finally{busy(false);}}
 on(root,'click',event=>{const el=event.target.closest('[data-action]');if(el)run(()=>action(el.dataset.action,el));});
 on(root,'submit',event=>{event.preventDefault();const form=event.target,values=Object.fromEntries(new FormData(form));run(()=>submitForm(form,values));});
 on(root,'change',event=>{if(event.target.name==='transaction_type')configureType();});
 on(window,'storage',event=>{if(event.key==='cozy-bank-auth-v1'&&!event.newValue){mode='office';monthCache.clear();series=[];demo=false;clearFinanceState(state);selection=null;salary=null;clearReceipts();render();}});
 on(document,'keydown',event=>{
  if(!full)return;
  const confirmation=root.querySelector('dialog[open]');
  if(confirmation){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();confirmation.dispatchEvent(new Event('cancel',{cancelable:true}));}return;}
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(!state.busy&&!state.recovery)closeOverlay();}
  if(event.key==='Tab'){
   const items=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
   const first=items[0],last=items.at(-1);if(!first)return;
   if(event.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus();}
  }
 },true);
 render();
 if(hasAuthReturn)init().catch(()=>{});
 return {enter(){visible=true;root.hidden=false;if(!hasAuthReturn&&!state.recovery)mode='office';render();init().catch(()=>{});},leave(){visible=false;mode='office';fullscreen(false);root.hidden=true;},dispose(){fullscreen(false);disposed=true;events.abort();subscription?.unsubscribe();monthCache.clear();clearFinanceState(state);},snapshot(){return {authenticated:!!state.user,view:state.view,mode,fullscreen:full,busy:state.busy,accounts:state.data?.accounts.length||0};}};
}
