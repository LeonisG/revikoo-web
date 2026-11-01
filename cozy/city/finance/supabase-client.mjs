import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.mjs';
let singleton;
export function getSupabase() {
  if (!singleton) singleton = new Promise((resolve,reject)=>{
    if(globalThis.supabase){resolve();return;}
    const script=document.createElement('script');script.src=new URL('./vendor/supabase-2.118.0.js',import.meta.url).href;
    script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('No se ha podido cargar el cliente de acceso. Recarga la página.'));};document.head.append(script);
  }).then(() => {
    return globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storageKey: 'cozy-bank-auth-v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }) }
    });
  }).catch(error => { singleton = null; throw error; });
  return singleton;
}
