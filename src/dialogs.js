import { categories, dismissals, events, formats, noteKinds, phases, storyboardId, today } from './domain.js';
import { bodyMeasures, dimensionSources } from './anthropometry.js';
import { area, button, dateLabel, escapeHtml as e, icon, iconButton, input, rate, select, tag } from './ui.js';

export const dialog = document.querySelector('#dialog');

export function showDialog(title, content) {
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${e(title)}</h2>${iconButton('Close dialog','close','close-dialog')}</div>${content}`;
  if (!dialog.open) dialog.showModal();
  else dialog.querySelector('[autofocus], button, input, select')?.focus();
  dialog.scrollTop = 0;
}

export function dialogForm(kind, fields, submit = 'Save', attrs = '') {
  return `<form data-form="${kind}" ${attrs}>${fields}<p class="form-error" role="alert"></p><div class="button-row dialog-actions">${button('Cancel',{action:'close-dialog',variant:'outline'})}<button class="btn primary" type="submit">${e(submit)}</button></div></form>`;
}

export function inningsEditor(data, record) {
  const row = record || {date:today(),out:false};
  const reviews = data.videos.filter(item => item.id !== storyboardId).map(item=>[item.id,item.title]);
  if (record?.videoId && !reviews.some(([id])=>id===record.videoId)) reviews.push([record.videoId,'Previously linked clip']);
  showDialog(record?'Edit innings':'Log an innings',dialogForm('innings',`
    <div class="form-grid">${input('date','Date',row.date,'type="date" required autofocus')}
    ${select('out','Outcome',[['no','Not out'],['yes','Out']],row.out?'yes':'no','','id="innings-out"')}
    ${input('runs','Runs',row.runs,'type="number" inputmode="numeric" min="0" max="9999" step="1" required')}
    ${input('balls','Balls faced',row.balls,'type="number" inputmode="numeric" min="0" max="9999" step="1" required')}
    <div class="span-all" id="dismissal-field" ${row.out?'':'hidden'}>${select('dismissal','Dismissal type',dismissals,row.dismissal,'Choose dismissal',row.out?'required':'disabled')}</div></div>
    <details class="form-details" ${record && (row.shot || row.notes || row.phase) ? 'open' : ''}><summary>Match and shot details <span>Optional</span></summary><div class="form-grid">
      ${select('session','Session',['Match','Practice'],row.session,'Not recorded')}${select('format','Format',formats,row.format,'Not recorded')}
      ${input('position','Batting position',row.position,'type="number" inputmode="numeric" min="1" max="11" step="1"')}${select('phase','Match phase',phases,row.phase,'Not recorded')}
      ${select('shotCategory','Shot category',categories,row.shotCategory,'Not recorded')}${input('shot','Shot attempted',row.shot,'maxlength="80"')}
      <div class="span-all">${input('delivery','Delivery line or length',row.delivery,'maxlength="120"')}${reviews.length ? select('videoId','Related clip',reviews,row.videoId,'None') : ''}
      ${area('notes','What happened?',row.notes,'rows="2" maxlength="600"')}${area('reflection','My focus or confidence',row.reflection,'rows="2" maxlength="600"')}</div>
    </div></details>`,'Save innings',`data-id="${e(record?.id || '')}"`));
}

export function showInnings(data, record) {
  const review = data.videos.find(item=>item.id===record.videoId);
  const details = [['Session',record.session],['Format',record.format],['Phase',record.phase],['Batting position',record.position],['Shot category',record.shotCategory],['Shot attempted',record.shot],['Delivery',record.delivery],['Player notes',record.notes],['Player reflection',record.reflection],['Related clip',review?.title]];
  showDialog(`Innings · ${dateLabel(record.date,{day:'numeric',month:'short',year:'numeric'})}`,`
    <div class="detail-score"><strong>${record.runs}${record.out?'':'*'}</strong><span>${record.balls} balls · SR ${rate(record.balls ? record.runs/record.balls*100 : null)}</span>${tag(record.out?record.dismissal:'Not out','lime')}</div>
    <p>${tag(record.source==='demo_simulated'?'Fictional record':'Observed / entered',record.source==='demo_simulated'?'violet':'gray')}</p>
    <dl class="record-detail">${details.filter(([,value])=>value).map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('')}</dl><div class="button-row dialog-actions">${review ? button('Open related clip',{action:'related-clip',glyph:'video',variant:'outline',attrs:`data-id="${e(review.id)}"`}) : ''}${button('Edit innings',{action:'edit-innings',glyph:'edit',variant:'primary',attrs:`data-id="${e(record.id)}"`})}</div>`);
}

export function dimensionFields(dimensions) {
  return `<div class="dimension-fields">${bodyMeasures.map(({key,label,guide})=>`<div class="dimension-field-row">
    ${input(key,`${label} (cm)`,dimensions?.[key]?.cm,'type="number" min="0.1" max="300" step="any" inputmode="decimal"')}
    ${select(`${key}Source`,`${label} source`,[['reported',dimensionSources.reported],['measured',dimensionSources.measured]],dimensions?.[key]?.source||'reported','',`aria-label="${label} source"`)}
    <p>${guide}</p></div>`).join('')}</div>`;
}

export function clipDimensionEditor(clip) {
  showDialog('Edit clip anthropometry',dialogForm('clip-dimensions',`<p class="muted">${e(clip.title)} · Add dimensions you have measured or the batter has reported. Leave unknown values blank.</p>
    ${dimensionFields(clip.dimensions)}`,'Save dimensions',`data-clip-id="${e(clip.id)}"`));
}

export function markerEditor(review,phase,position) {
  const saved=review.markers?.[phase.key];
  const initial=saved ?? Math.min(review.duration,Math.round(position*100)/100);
  showDialog(`${saved===undefined?'Set':'Edit'} ${phase.label.toLowerCase()} marker`,dialogForm('marker',`
    <p class="muted">${e(review.title)}</p>
    ${input('time','Time in seconds',initial,`type="number" min="0" max="${review.duration}" step="any" inputmode="decimal" required autofocus`)}
    <p class="muted">Use the first frame where you can see this phase begin.</p>`, 'Save marker',`data-clip-id="${e(review.id)}" data-phase="${phase.key}"`));
}

export function noteEditor(review, note, position, draft = null) {
  showDialog(note?'Edit observation':'Add observation',dialogForm('note',`<div class="form-grid">
    ${input('time','Time in seconds',note?.time ?? Math.min(review.duration,Math.round(position*100)/100),`type="number" inputmode="decimal" step="any" min="0" max="${review.duration}" required`)}
    ${select('event','Moment',events,note?.event || 'Other','')}</div>
    ${select('kind','Evidence type',noteKinds,note?.kind || draft?.kind || noteKinds[0],'')}
    ${area('text','What did you notice?',note?.text || draft?.text,'rows="3" maxlength="600" required autofocus placeholder="Describe one moment in your own words."')}
    ${note?.source || draft?.source ? '<p class="muted">AI-assisted observation. Review or edit the estimate before selecting it for practice.</p>' : ''}
    <label class="check"><input type="checkbox" name="selected" ${note?.selected?'checked':''}> Use in practice plan</label>`, 'Save observation',`data-id="${e(note?.id || '')}" data-note-source="${e(note?.source || draft?.source || '')}"`));
}

export function confirmAction(title, description, label, action, attrs = '') {
  showDialog(title,`<p>${e(description)}</p><div class="button-row dialog-actions">${button('Cancel',{action:'close-dialog',variant:'outline',attrs:'autofocus'})}${button(label,{action,variant:'danger',attrs})}</div>`);
}

export function workspaceDialog(isDemo, profile, installedPrompt) {
  showDialog('Workspace',`<p class="muted">${isDemo?'You’re exploring a fictional player.':'Your personal records are stored in this browser.'}</p>
    <div class="workspace-options">${button('Explore demo player',{action:'switch-demo',glyph:'play',variant:isDemo?'primary':'outline'})}${button('Start with my own records',{action:'switch-personal',glyph:'user',variant:isDemo?'outline':'primary'})}</div>
    <p>${[profile.name,profile.hand,profile.level].filter(Boolean).map(e).join(' · ')}</p>
    ${isDemo ? `<div class="workspace-options">${button('Reset demo records',{action:'reset-demo',glyph:'reset',variant:'subtle'})}</div>` : `<div class="workspace-options">${button('Edit batting profile',{action:'edit-profile',glyph:'edit',variant:'outline'})}${button('Export records',{action:'export',glyph:'download',variant:'outline'})}${button('Import records',{action:'choose-backup',glyph:'upload',variant:'outline'})}</div>`}
    <div class="callout">${icon('shield',18)}<p>Footage stays on your device. An export contains personal records and notes, so keep it somewhere private.</p></div>
    ${button(installedPrompt?'Install CreaseCoach':'Installation help',{action:'install',glyph:'download',variant:'subtle'})}`);
}
