export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const button = (text,action,extra='') => `<button type="button" data-action="${action}" ${extra}>${escapeHTML(text)}</button>`;
export function field(label,name,value='',extra='') { return `<label>${escapeHTML(label)}<input name="${name}" value="${escapeHTML(value)}" ${extra}></label>`; }
export function select(label,name,options,value) { return `<div class="bank-field"><label for="bank-${name}">${escapeHTML(label)}</label><select id="bank-${name}" name="${name}" required>${options.map(o=>`<option value="${escapeHTML(o.id)}" ${o.id===value?'selected':''}>${escapeHTML(o.name)}</option>`).join('')}</select></div>`; }
export const submit = label => `<button class="bank-primary" type="submit">${escapeHTML(label)}</button>`;
export const title = text => `<h2 tabindex="-1">${escapeHTML(text)}</h2>`;
export const empty = text => `<p class="bank-empty">${escapeHTML(text)}</p>`;
