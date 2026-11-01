export function parseCents(value, { signed = false } = {}) {
  const text = String(value).trim();
  if (!(signed ? /^-?\d+(?:[.,]\d{1,2})?$/ : /^\d+(?:[.,]\d{1,2})?$/).test(text))
    throw new Error('Escribe un importe sin separadores de miles y con un máximo de dos decimales.');
  const negative = text.startsWith('-'), [whole, fraction = ''] = text.replace('-', '').split(/[.,]/);
  const result = (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))) * (negative ? -1n : 1n);
  if ((!signed && result <= 0n) || result > 999999999999999999n || result < -999999999999999999n)
    throw new Error(signed ? 'El saldo está fuera del intervalo permitido.' : 'El importe debe ser mayor que cero y estar dentro del intervalo permitido.');
  return result.toString();
}
export function inputAmount(cents) {
  const n = BigInt(cents), abs = n < 0n ? -n : n;
  return `${n < 0n ? '-' : ''}${abs / 100n},${String(abs % 100n).padStart(2, '0')}`;
}
export function euros(cents) {
  const [whole, fraction] = inputAmount(cents).split(',');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction}\u00a0€`;
}
export function todayISO(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year','month','day'].map(key=>parts.find(p=>p.type===key).value).join('-');
}
export const monthOf = date => date.slice(0, 7) + '-01';
export function shiftMonth(month, by) { const d = new Date(month + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth()+by); return d.toISOString().slice(0,10); }
export function monthLabel(month) { return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + 'T12:00:00Z')); }
export function dueOn(rule, period) {
  const last = new Date(new Date(shiftMonth(period,1)+'T12:00:00Z').getTime()-86400000).getUTCDate();
  return period.slice(0,8) + String(Math.min(rule.day_of_month,last)).padStart(2,'0');
}
export function pendingOccurrences(rules, decisions, today = todayISO()) {
  const byPeriod = new Map(decisions.map(d=>[d.rule_id+':'+d.period,d]));
  const result = [];
  for (const rule of rules.filter(r=>r.active)) {
    for (let period=monthOf(rule.start_date); period<=monthOf(today); period=shiftMonth(period,1)) {
      const due=dueOn(rule,period), decision=byPeriod.get(rule.id+':'+period);
      if (due<rule.start_date || due>today || ['confirmed','skipped'].includes(decision?.decision)) continue;
      if (decision?.decision==='postponed' && decision.postponed_until>today) continue;
      result.push({rule,period,due});
    }
  }
  return result.sort((a,b)=>a.due.localeCompare(b.due));
}
export const sumCents = values => values.reduce((sum,value)=>sum+BigInt(value),0n).toString();
export function percent(value, total) { return BigInt(total)>0n ? Number(BigInt(value)*10000n/BigInt(total))/100 : 0; }
