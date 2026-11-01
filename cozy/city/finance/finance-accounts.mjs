import {button,field,select,submit,title,escapeHTML} from './finance-ui.mjs';
import {euros,inputAmount} from './finance-calculations.mjs';
export function accountsView(data) {
 return `${title('Mis cuentas')}<div class="bank-stack">${data.accounts.map(a=>`<article class="bank-account"><div><strong>${escapeHTML(a.name)}</strong><small>${a.is_primary?'Cuenta predeterminada':'EUR'}</small></div><b>${euros(a.balance_cents)}</b>${button('Editar','account.edit',`data-id="${a.id}" aria-label="Editar ${escapeHTML(a.name)}"`)}</article>`).join('')}</div>${button('Crear cuenta','account.new','class="bank-primary"')}`;
}
export function accountForm(account,first=false) {
 return `${title(first?'Tu primera cuenta':account?'Editar cuenta':'Añadir una cuenta')}<p>${first?'Empecemos con el dinero que tienes hoy.':'El saldo inicial y los movimientos determinan el saldo actual.'}</p><form data-form="account" data-id="${account?.id||''}">${field('Nombre de la cuenta','name',account?.name||'','required maxlength="80" autocomplete="off" placeholder="Cuenta principal"')}${select('Tipo','account_type',[{id:'checking',name:'Cuenta corriente'},{id:'savings',name:'Ahorro'},{id:'cash',name:'Efectivo'},{id:'other',name:'Otra'}],account?.account_type||'checking')}${field('Saldo inicial (€)','initial_balance',account?inputAmount(account.initial_balance_cents):'0,00','required inputmode="decimal"') }<label class="bank-checkbox"><input name="is_primary" type="checkbox" ${account?.is_primary||first?'checked':''}>Usar como cuenta predeterminada</label>${submit('Guardar cuenta')}</form>`;
}
