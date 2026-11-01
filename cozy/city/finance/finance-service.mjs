export class FinanceService {
  constructor(client) { this.client = client; }
  async rpc(name, args) { const {data,error}=await this.client.rpc(name,args); if(error) throw error; return data; }
  snapshot(month) { return this.rpc('finance_snapshot',{p_month:month}); }
  history(before) { return this.rpc('finance_history',{p_before_date:before?.occurred_on||null,p_before_id:before?.id||null}); }
  mutate(action,payload,requestId) { return this.rpc('finance_mutate',{p_action:action,p_payload:payload,p_request_id:requestId}); }
  bootstrap() { return this.mutate('bootstrap',{},crypto.randomUUID()); }
}
// A receipt key persists across reloads without storing financial fields.
const inMemoryReceipts=new Map();
export async function requestReceipt(userId, action, payload) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([userId,action,payload])));
  const key='cozy-bank-request:'+Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  let id=inMemoryReceipts.get(key); try { id ||= sessionStorage.getItem(key); } catch { /* Storage may be denied. */ }
  id ||= crypto.randomUUID();inMemoryReceipts.set(key,id);try { sessionStorage.setItem(key,id); } catch { /* Retry still works in this tab. */ }
  return {id,clear(){inMemoryReceipts.delete(key);try {sessionStorage.removeItem(key);}catch{}}};
}
export function clearReceipts() { inMemoryReceipts.clear();try { for(const key of Object.keys(sessionStorage))if(key.startsWith('cozy-bank-request:'))sessionStorage.removeItem(key); } catch {} }
export function friendlyError(error) {
  const code=error?.code||'';
  if (code==='invalid_credentials') return 'El correo o la contraseña no son correctos.';
  if (code==='email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión.';
  if (code==='over_email_send_rate_limit') return 'Se ha alcanzado el límite temporal de correo. Inténtalo más tarde.';
  if (code==='email_address_not_authorized') return 'El servicio de correo todavía no permite registrar este correo. La configuración de envío está pendiente.';
  if (/Error sending.*email/i.test(error?.message||'')) return 'El servidor no ha podido enviar el correo. No se ha completado el registro o la recuperación; vuelve a intentarlo más tarde.';
  if (['PGRST301','PGRST303','28000'].includes(code)||error?.status===401) return 'La sesión ha caducado. Vuelve a iniciar sesión.';
  if (['42501','23503'].includes(code)) return 'La cuenta, categoría o movimiento no está disponible para tu usuario.';
  if (['23514','22023','22P02','22008','22003','23502'].includes(code)) return 'Revisa el importe, las fechas y las cuentas seleccionadas.';
  if (error instanceof TypeError || /fetch|network|abort|timeout/i.test(error?.message||'')) return 'No se ha podido confirmar la respuesta. Reintenta con los mismos datos: no se duplicará la operación.';
  return error instanceof Error && !code ? error.message : 'No se ha podido completar la operación. Vuelve a intentarlo.';
}
