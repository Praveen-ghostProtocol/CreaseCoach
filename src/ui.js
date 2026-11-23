import { dismissals, phases, categories, filterInnings } from './domain.js';

const glyphs = {
  home:'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', log:'M6 3h12v18H6z M9 8h6m-6 4h6m-6 4h4',
  chart:'M4 20h16M7 16v-5m5 5V5m5 11V8', video:'M3 6h13v12H3z M16 10l5-3v10l-5-3',
  target:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z M12 7a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 5h.01',
  arrow:'M4 12h15m-6-6 6 6-6 6', diagonal:'M6 18 18 6m-10 0h10v10', chevron:'m8 10 4 4 4-4',
  plus:'M12 5v14M5 12h14', play:'m8 5 12 7-12 7z', pause:'M9 5v14m6-14v14', close:'m6 6 12 12M18 6 6 18',
  user:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2',
  shield:'M12 22s7-4 7-10V5l-7-3-7 3v7c0 6 7 10 7 10z M9 12l2 2 4-4',
  activity:'M2 12h5l3-8 4 16 3-8h5', flag:'M5 21V4m0 1h13l-3 4 3 4H5', bolt:'m13 2-9 12h7l-1 8 10-12h-8z',
  info:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 8v6m0-10h.01', calendar:'M4 6h16v14H4z M4 10h16M8 4v4m8-4v4',
  edit:'m4 16 11-11 4 4L8 20H4z M13 7l4 4', trash:'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5',
  check:'m5 12 4 4L19 6', download:'M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5', upload:'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  reset:'M4 11a8 8 0 1 1 1 6m-1-6V5m0 6h6', cube:'m12 3 8 4.5v9L12 21l-8-4.5v-9z M4 7.5l8 4.5 8-4.5M12 12v9',
  book:'M4 4h6a2 2 0 0 1 2 2v14a3 3 0 0 0-3-2H4zm16 0h-6a2 2 0 0 0-2 2v14a3 3 0 0 1 3-2h5z',
  clock:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 4v5l4 2', camera:'M4 7h4l2-3h4l2 3h4v13H4z M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  settings:'M4 7h16M4 17h16M9 4v6m6 4v6', film:'M3 5h18v14H3z M7 5v14m10-14v14M3 10h4m10 0h4M3 14h4m10 0h4',
};

export const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${glyphs[name] || glyphs.info}"/></svg>`;

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const dateLabel = (value, opts = {day:'numeric',month:'short'}) => value ? new Intl.DateTimeFormat('en-GB', opts).format(new Date(`${value}T12:00:00`)) : '—';
export const whole = value => new Intl.NumberFormat('en-IN').format(value);
export const rate = value => value == null ? '—' : value.toFixed(1);
export const timeLabel = value => {
  const tenths = Math.round(value*10);
  return `${Math.floor(tenths/600)}:${((tenths%600)/10).toFixed(1).padStart(4,'0')}`;
};
export const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function button(label, {action, to, glyph, variant = '', attrs = '', trailing = false} = {}) {
  const content = `${glyph && !trailing ? icon(glyph,17) : ''}<span>${escapeHtml(label)}</span>${glyph && trailing ? icon(glyph,17) : ''}`;
  if (to) return `<a class="btn ${variant}" href="#${to}" ${attrs}>${content}</a>`;
  return `<button type="button" class="btn ${variant}" data-action="${action}" ${attrs}>${content}</button>`;
}

export function iconButton(label, glyph, action, attrs = '') {
  return `<button type="button" class="icon-btn" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" data-action="${action}" ${attrs}>${icon(glyph,17)}</button>`;
}

export function options(values, current, blank = '') {
  return `${blank ? `<option value="">${escapeHtml(blank)}</option>` : ''}${values.map(item => {
    const [value,label] = Array.isArray(item) ? item : [item,item];
    return `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('')}`;
}

export const select = (name, label, values, current, blank, attrs = '') => `<label class="field"><span>${label}</span><select name="${name}" ${attrs}>${options(values,current,blank)}</select></label>`;
export const input = (name, label, value, attrs = '') => `<label class="field"><span>${label}</span><input name="${name}" value="${escapeHtml(value)}" ${attrs}></label>`;
export const area = (name, label, value, attrs = '') => `<label class="field"><span>${label}</span><textarea name="${name}" ${attrs}>${escapeHtml(value)}</textarea></label>`;
export const tag = (label, tone = 'gray') => `<span class="tag ${tone}">${escapeHtml(label)}</span>`;
export const panelHead = (title, detail = '', right = '') => `<div class="panel-head"><div><h2>${title}</h2>${detail ? `<p>${detail}</p>` : ''}</div>${right}</div>`;
export const pageHead = (label, title, detail, action = '') => `<header class="page-heading"><div><div class="eyebrow"><span></span>${label}</div><h1>${title}</h1><p>${detail}</p></div>${action}</header>`;
export const empty = (glyph, title, detail, action = '') => `<div class="empty"><span class="tile">${icon(glyph,22)}</span><h3>${title}</h3><p>${detail}</p>${action}</div>`;
export const firstName = name => escapeHtml(name.trim().split(/\s+/)[0] || 'player');
export const initials = name => escapeHtml(name.trim().split(/\s+/).slice(0,2).map(word => word.charAt(0).toUpperCase()).join('') || 'P');
export const sortedInnings = records => [...records].sort((a,b) => b.date.localeCompare(a.date));

export function filterBar(filters, key) {
  return `<div class="filter-bar" aria-label="Filter innings">
    ${select('dismissal','Dismissal',dismissals,filters.dismissal,'All dismissals',`data-filter="${key}"`)}
    ${select('phase','Match phase',phases,filters.phase,'All phases',`data-filter="${key}"`)}
    ${select('shotCategory','Shot category',categories,filters.shotCategory,'All shots',`data-filter="${key}"`)}
    ${select('session','Session',['Match','Practice'],filters.session,'All sessions',`data-filter="${key}"`)}
    ${Object.values(filters).some(Boolean) ? button('Clear filters',{action:'clear-filters',variant:'subtle',attrs:`data-key="${key}"`}) : ''}
  </div>`;
}

export function trend(records) {
  if (!records.length) return empty('chart','Your trend starts with one innings','Runs appear here as you record them.');
  const ordered = sortedInnings(records).slice(0,8).reverse();
  const max = Math.max(20,Math.ceil(Math.max(...ordered.map(item => item.runs))/20)*20);
  return `<div class="trend" aria-label="Runs in the latest ${ordered.length} recorded innings">
    <div class="trend-axis" aria-hidden="true"><span>${max}</span><span>${max*3/4}</span><span>${max/2}</span><span>${max/4}</span><span>0</span></div>
    <div class="trend-grid"><div class="trend-lines" aria-hidden="true"></div><div class="trend-bars">${ordered.map((item,i) => `<div class="trend-slot">
      <button class="trend-bar ${i===ordered.length-1?'last':''}" style="--amount:${item.runs/max*100}%" type="button" data-action="view-innings" data-id="${escapeHtml(item.id)}" aria-label="${dateLabel(item.date)}, ${item.runs} runs, view innings"><span>${item.runs}</span></button>
      <span class="trend-date">${dateLabel(item.date)}</span></div>`).join('')}</div></div>
  </div>`;
}

export function inningsTable(data, filters) {
  const rows = sortedInnings(filterInnings(data.innings,filters));
  if (!rows.length) return empty('log',data.innings.length?'No innings match these filters':'No innings logged yet',data.innings.length?'Try clearing one or more filters.':'Start with the runs, balls and outcome from your last innings.',data.innings.length?'':button('Log an innings',{action:'new-innings',glyph:'plus',variant:'primary'}));
  return `<table class="record-table"><thead><tr><th scope="col">Innings</th><th scope="col">Score</th><th scope="col">Strike rate</th><th scope="col">Outcome</th><th scope="col">Shot</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>
  ${rows.map(record => `<tr><td><button class="text-btn" data-action="view-innings" data-id="${escapeHtml(record.id)}">${dateLabel(record.date,{day:'numeric',month:'short',year:'numeric'})}</button><small>${escapeHtml([record.session,record.format,record.phase].filter(Boolean).join(' · ') || 'Session details unrecorded')}</small></td>
  <td data-label="Score"><strong>${record.runs}${record.out?'':'*'}</strong> <small>${record.balls} balls</small></td>
  <td data-label="Strike rate">${rate(record.balls ? record.runs/record.balls*100 : null)}</td>
  <td data-label="Outcome">${tag(record.out ? record.dismissal : 'Not out',record.out?'gray':'lime')}</td>
  <td data-label="Shot">${escapeHtml(record.shotCategory || 'Unrecorded')}</td><td class="row-actions">
  ${iconButton('Edit innings','edit','edit-innings',`data-id="${escapeHtml(record.id)}"`)}${iconButton('Delete innings','trash','delete-innings',`data-id="${escapeHtml(record.id)}"`)}</td></tr>`).join('')}
  </tbody></table>`;
}
