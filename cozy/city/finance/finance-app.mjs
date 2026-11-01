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

export function createFinanceApp({root,nilo,onAuthReturn=()=>{}}) {
 const state=createFinanceState(),events=new AbortController();
 let client,auth,service,subscription,initializing,selection=null,salary=null,disposed=false,visible=false,historyMore=false,readVersion=0;
 const recoveryReturn=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
 const hasAuthReturn=/access_token=|error_description=/.test(location.hash)||new URLSearchParams(location.search).has('code');
 const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:events.signal});
 function note(message,error=false) {state[error?'error':'notice']=message;const el=root.querySelector(error?'#bank-error':'#bank-notice');if(el){el.textContent=message;el.hidden=!message;}}
 function greeting(){const welcome=document.getElementById('welcome');if(!visible)return;welcome.textContent=state.user?'¡Bienvenido de nuevo! ¿Qué hacemos hoy?':'¡Hola! Vamos a cuidar de tus pequeños comienzos.';}
 function render(focus=false) {
  if(disposed)return;
  let content;
  if(state.user&&!state.data&&!state.recovery) content=`${title('Preparando tus cuentas…')}<p>Consultando tus datos guardados.</p>${button('Reintentar','reload')}`;
  else if(state.recovery)content=authView('password');
  else if(!state.user)content=authView(state.view);
  else if(state.view==='account')content=accountForm(selection,!state.data.accounts.length);
  else if(state.view==='accounts')content=accountsView(state.data);
  else if(state.view==='transaction')content=transactionForm(state.data,selection||{});
  else if(state.view==='rule')content=transactionForm(state.data,selection||{},true);
  else if(state.view==='recurring')content=recurringView(state.data);
  else if(state.view==='history')content=`${title('Todos tus movimientos')}${movementList(state.history,state.data)}${historyMore?button('Cargar más','history.more'):''}`;
  else content=dashboardView(state.data,state.month);
  const menu=state.user&&state.data?.accounts.length&&!state.recovery?`<nav aria-label="Finanzas">${[['dashboard','Resumen'],['transaction.new','Añadir movimiento'],['accounts','Mis cuentas'],['recurring','Habituales']].map(([action,label])=>button(label,action,`aria-current="${state.view===action?'page':'false'}"`)).join('')}</nav>`:'';
  root.innerHTML=`<div class="bank-panel" aria-label="Cozy Bank"><div class="bank-panel-top"><span>COZY BANK</span><div>${state.user?button('↻','reload','aria-label="Actualizar datos" title="Actualizar"')+button('Cerrar sesión','logout'):''}${button('Ver a Nilo','collapse','aria-label="Minimizar panel financiero"')}</div></div>${menu}<p id="bank-error" class="bank-error" role="alert" ${state.error?'':'hidden'}>${escapeHTML(state.error)}</p><p id="bank-notice" class="bank-notice" role="status" ${state.notice?'':'hidden'}>${escapeHTML(state.notice)}</p><div class="bank-content">${content}</div>${salary&&state.user?`<aside class="bank-salary"><p>¿Guardamos esta nómina como movimiento mensual?</p>${button('Crear plantilla de nómina','salary')}${button('Ahora no','salary.dismiss')}</aside>`:''}</div>`;
  configureType();greeting();if(focus)root.querySelector('h2')?.focus({preventScroll:true});
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
 async function load() {
  const generation=state.generation,version=++readVersion,month=state.month;
  const data=await service.snapshot(month);
  if(disposed||generation!==state.generation||version!==readVersion)return;
  state.data=data;
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
  clearFinanceState(state);state.user=next;state.recovery=wasRecovery&&!!next;selection=null;salary=null;readVersion++;
  render();
  if(next){const gen=state.generation;try{await service.bootstrap();if(gen===state.generation)await load();}catch(e){if(gen===state.generation)note(friendlyError(e),true);}}
  else clearReceipts();
 }
 async function init() {
  if(initializing)return initializing;
  initializing=(async()=>{
   client=await getSupabase();auth=new AuthService(client);service=new FinanceService(client);
   state.recovery=recoveryReturn;
   subscription=client.auth.onAuthStateChange((event,session)=>{
    // Never await SDK methods within the Auth lock callback.
    if(!session&&state.user){clearFinanceState(state);selection=null;salary=null;clearReceipts();render();}
    setTimeout(()=>changed(event,session),0);
   }).data.subscription;
   const {data,error}=await client.auth.getSession();if(error)throw error;
   if(data.session&&state.user?.id!==data.session.user.id)await changed('INITIAL_SESSION',data.session);
   if(hasAuthReturn){onAuthReturn();if(!data.session){state.recovery=false;state.view='recover';note('No se ha podido validar el enlace. Solicita uno nuevo.',true);}}
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
   try {await load();if(next==='history')await history(false);}catch {render();note('La operación se ha guardado, pero no se han podido actualizar los saldos. Pulsa Actualizar antes de registrar otra.',true);}
   return result;
  }catch(error){if(generation===state.generation)animate('error');throw error;}
 }
 async function history(more=false) {
  const generation=state.generation,items=await service.history(more?state.history.at(-1):null);
  if(generation!==state.generation)return;
  state.history=more?[...state.history,...items]:items;historyMore=items.length===50;state.view='history';render(true);
 }
 function navigate(view,item=null) {state.view=view;selection=item;state.error='';state.notice='';render(true);}
 async function action(action,el) {
  if(action==='collapse'){root.innerHTML=button('Abrir mi banco','expand','class="bank-open"');return;}
  if(action==='expand'){render(true);return;}
  if(action==='logout'){
   clearFinanceState(state);selection=null;salary=null;clearReceipts();animate('idle');render();
   try{await auth.signOut();}catch{note('Los datos se han ocultado. No se pudo cerrar la sesión en el servidor; reintenta al recuperar la conexión.',true);}return;
  }
  if(action==='reload'){await load();return;}
  if(['welcome','register','login','recover'].includes(action)){navigate(action);return;}
  if(!state.user||!state.data)return;
  if(action==='dashboard'||action==='accounts'||action==='recurring'){navigate(action);return;}
  if(action==='history'||action==='history.more'){await history(action.endsWith('.more'));return;}
  if(action.startsWith('month.')){state.month=shiftMonth(state.month,action==='month.prev'?-1:1);await load();return;}
  if(action==='account.new'){navigate('account');return;}
  if(action==='account.edit'){navigate('account',state.data.accounts.find(a=>a.id===el.dataset.id));return;}
  if(action==='transaction.new'){navigate('transaction');animate('idle');return;}
  const tx=[...state.history,...state.data.recent].find(t=>t.id===el.dataset.id);
  if(action==='transaction.edit'){if(tx)navigate('transaction',tx);return;}
  if(action==='transaction.delete'){
   if(tx&&confirm('¿Eliminar este movimiento? Se recalcularán los saldos. Esta acción no se puede deshacer.'))await save('transaction.delete',{id:tx.id});return;
  }
  if(action==='rule.new'){navigate('rule');return;}
  const rule=state.data.rules.find(r=>r.id===el.dataset.id);
  if(action==='rule.edit'){if(rule)navigate('rule',rule);return;}
  if(action==='rule.toggle'){if(rule)await save('rule.toggle',{id:rule.id,active:!rule.active},{next:'recurring'});return;}
  if(action==='salary'){const template=salary;salary=null;navigate('rule',template);return;}
  if(action==='salary.dismiss'){salary=null;render();return;}
  if(action.startsWith('occurrence.')){
   const payload={rule_id:el.dataset.rule,period:el.dataset.period,decision:action==='occurrence.skip'?'skipped':'postponed'};
   if(payload.decision==='skipped'&&!confirm('¿Omitir este periodo? No creará ningún movimiento.'))return;
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
   if(kind==='password'){await auth.updatePassword(values.password);state.recovery=false;state.view='dashboard';await load();note('Contraseña actualizada.');}
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
   if(form.dataset.id&&!confirm('¿Guardar la corrección? Los saldos se actualizarán con estos datos.'))return;
   const isSalary=kind==='transaction'&&!form.dataset.id&&state.data.categories.find(c=>c.id===payload.category_id)?.slug==='nomina';
   const result=await save(kind==='rule'?'rule.save':'transaction.save',payload,{next:kind==='rule'?'recurring':'dashboard'});
   if(result&&isSalary){salary={...payload,id:undefined,name:'Nómina',day_of_month:Number(values.occurred_on.slice(-2)),start_date:shiftMonth(values.occurred_on.slice(0,7)+'-01',1)};render();}
  }
 }
 async function run(work){if(state.busy)return;busy(true);state.error='';note('',true);try{await work();}catch(e){animate('error');if(e?.status===401||['28000','PGRST301','PGRST303'].includes(e?.code)){clearFinanceState(state);render();}note(friendlyError(e),true);}finally{busy(false);}}
 on(root,'click',event=>{const el=event.target.closest('[data-action]');if(el)run(()=>action(el.dataset.action,el));});
 on(root,'submit',event=>{event.preventDefault();const form=event.target,values=Object.fromEntries(new FormData(form));run(()=>submitForm(form,values));});
 on(root,'change',event=>{if(event.target.name==='transaction_type')configureType();});
 on(window,'storage',event=>{if(event.key==='cozy-bank-auth-v1'&&!event.newValue){clearFinanceState(state);selection=null;salary=null;clearReceipts();render();}});
 render();
 if(hasAuthReturn)init().catch(()=>{});
 return {enter(){visible=true;root.hidden=false;greeting();init().then(()=>{if(state.user&&state.data)load().catch(e=>note(friendlyError(e),true));}).catch(()=>{});},leave(){visible=false;root.hidden=true;},dispose(){disposed=true;events.abort();subscription?.unsubscribe();clearFinanceState(state);},snapshot(){return {authenticated:!!state.user,view:state.view,busy:state.busy,accounts:state.data?.accounts.length||0};}};
}
