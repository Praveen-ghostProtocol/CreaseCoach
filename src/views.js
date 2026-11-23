import { feedback, filterInnings, focuses, patternText, suggestPlan, summarize } from './domain.js';
import { area, button, dateLabel, empty, escapeHtml as e, filterBar, firstName, icon, input, inningsTable, pageHead, panelHead, rate, select, sortedInnings, tag, trend, whole } from './ui.js';
import { profileDimensions } from './anthropometry-view.js';

export function home(data, isDemo) {
  const stats = summarize(data.innings);
  const suggestion = suggestPlan(data);
  const latest = data.plans.at(-1);
  const lastInnings = sortedInnings(data.innings)[0];
  const seededActivity = isDemo ? [
    ...sortedInnings(data.innings).filter(row=>row.source==='demo_simulated').slice(0,2)
      .map(row=>({date:row.date,text:`Logged ${row.runs} runs from ${row.balls} balls`})),
    ...data.plans.filter(item=>item.id==='demo-history' && item.complete).map(item=>({date:item.created,text:'Completed a review plan'})),
  ] : [];
  const activity = [...data.logs,...seededActivity].sort((a,b) => b.date.localeCompare(a.date)).slice(0,4);
  const tiles = [
    ['log','Innings logged',whole(stats.count),stats.count ? `${stats.notOut} not out` : 'Ready to record'],
    ['activity','Total runs',whole(stats.runs),stats.count ? `From ${stats.count} recorded innings` : 'Across recorded innings'],
    ['bolt','Strike rate',rate(stats.strikeRate),stats.rateRecords ? `${stats.rateRecords} innings with balls faced` : 'Needs balls faced'],
    ['flag','Highest score',stats.best == null ? '—' : whole(stats.best),lastInnings ? `Latest innings: ${lastInnings.runs}${lastInnings.out?'':'*'} runs` : 'Across recorded innings'],
  ];
  return `${pageHead('PLAYER OVERVIEW',`Welcome back, ${firstName(data.profile.name)}.`, 'Review your batting and give your next practice a clear focus.',
      button('Log an innings',{action:'new-innings',glyph:'plus',variant:'outline'}))}
    <section class="hero" aria-label="Next practice">
      <div class="hero-content"><div class="hero-label">${icon('target',16)} NEXT SESSION</div>
      <h2>Make your next<br>session <em>count.</em></h2>
      <p>Turn what happened at the crease into one practical objective you can take to the nets.</p>
      ${button('What should I practise next?',{to:'plan',glyph:'arrow',variant:'primary hero-button',trailing:true})}</div>
      <div class="hero-caption" aria-hidden="true"><span></span> THE CREASE</div>
    </section>
    <div class="section-heading"><h2>Performance snapshot</h2><span>${isDemo?'Fictional innings':'Your recorded innings'}</span></div>
    <section class="stat-grid" aria-label="Performance snapshot">${tiles.map(([glyph,label,value,detail]) => `<article class="stat"><div><span class="tile">${icon(glyph,17)}</span><span>${label}</span></div><strong>${value}</strong><p>${detail}</p></article>`).join('')}</section>
    <div class="dashboard-grid">
      <section class="panel trend-panel">${panelHead('Recent innings',`Runs scored · ${Math.min(8,stats.count)} recorded innings`,button('View log',{to:'log',glyph:'diagonal',variant:'subtle',trailing:true}))}${trend(data.innings)}</section>
      <section class="panel focus-panel">${panelHead('Practice focus','Your next decision',`<span class="tile">${icon('target',20)}</span>`)}
        <div class="focus-body">${tag(data.focus ? 'Selected focus' : 'Suggested focus','lime')}<h3>${focuses[suggestion.focus].title}</h3><p>${e(stats.repeat ? patternText(stats) : suggestion.reason)}</p></div>
        <div class="focus-foot"><span>${latest ? (latest.complete ? 'Last plan completed' : 'Plan in progress') : 'No saved plan yet'}</span>${button('Open plan',{to:'plan',glyph:'arrow',variant:'subtle',trailing:true})}</div>
      </section>
    </div>
    <div class="dashboard-grid bottom-grid">
      <section class="panel">${panelHead('Recent activity','Your batting and practice workspace')}
        ${activity.length ? `<ul class="timeline">${activity.map(item=>`<li><span class="tile">${icon('clock',15)}</span><span>${e(item.text)}</span><time datetime="${item.date}">${dateLabel(item.date)}</time></li>`).join('')}</ul>` : `<p class="muted">Changes you save will appear here.</p>`}
      </section>
      <section class="panel">${panelHead('What CreaseCoach knows','Your records, marked observations and calculated summaries.')}
        <p class="muted">Use patterns to decide what to look at next. A possible explanation remains a question for review.</p>
        <div class="button-row">${button('Insights',{to:'insights',glyph:'chart',variant:'outline'})}${button('Video Lab',{to:'video',glyph:'video',variant:'outline'})}${button('Load comparison demo',{to:'video-demo',glyph:'play',variant:'outline'})}</div>
      </section>
    </div>${profileDimensions(data.profile,isDemo)}`;
}

export function log(data, filters) {
  const visible = filterInnings(data.innings,filters);
  return `${pageHead('PERFORMANCE LOG','Innings log','Record the outcome first. Add shot details when you remember them.',button('Log an innings',{action:'new-innings',glyph:'plus',variant:'primary'}))}
    <section class="panel">${panelHead('Recorded innings',`${visible.length} of ${data.innings.length} shown`)}
      ${filterBar(filters,'log')}${inningsTable(data,filters)}
    </section>`;
}

function distribution(title, counts, denominator, key, detail) {
  return `<section class="panel distribution">${panelHead(title,detail)}
    ${counts.length ? counts.map(row => `<button type="button" class="dist-row" data-action="inspect" data-field="${key}" data-value="${e(row.label)}"><span class="dist-label"><strong>${e(row.label)}</strong><span>${row.count} of ${denominator} · ${row.percent}% ${icon('diagonal',13)}</span></span><span class="dist-track" aria-hidden="true"><span style="width:${row.percent}%"></span></span></button>`).join('') : `<p class="muted">No comparable entries in the current view.</p>`}
  </section>`;
}

export function insights(data, filters, tab) {
  const records = filterInnings(data.innings,filters);
  const stats = summarize(records);
  const key = stats.repeat ? `pattern-${stats.repeat.label}` : 'sparse';
  const candidate = stats.repeat?.label === 'Caught' ? 'Field placement, shot intent or delivery context may help explain the catches.' : 'Delivery and match context may explain some of the repeated outcomes.';
  const tools = `<div class="tab-strip" aria-label="Insights tools">${button('Evidence review',{action:'insights-tab',glyph:'chart',variant:tab==='patterns'?'tab active':'tab',attrs:`data-tab="patterns" aria-pressed="${tab==='patterns'}"`})}${button('Bat Motion Explorer',{action:'insights-tab',glyph:'cube',variant:tab==='motion'?'tab active':'tab',attrs:`data-tab="motion" aria-pressed="${tab==='motion'}"`})}</div>`;
  return `${pageHead('PERFORMANCE INSIGHTS','Read the evidence','Look for repeated outcomes and choose what to investigate.')} ${tools}
    ${tab === 'motion' ? `<section id="motion-root" class="panel"><p class="muted" role="status">Loading the Bat Motion Explorer…</p></section>` : `<section class="panel filter-panel">${panelHead('Evidence window',`${stats.count} of ${data.innings.length} recorded innings · ${stats.outs} dismissals · ${stats.notOut} not out`)}${filterBar(filters,'insights')}</section>
    <section class="panel evidence-panel">${panelHead('Guided interpretation','Review the recorded outcome before choosing your next step.')}
      <div class="evidence-grid">
        <article><div class="tile">${icon('chart',18)}</div>${tag('Calculated','lime')}<h3>What we observed</h3><p><strong>${e(patternText(stats))}</strong></p>${stats.repeat ? button('Inspect supporting innings',{action:'inspect',variant:'subtle',glyph:'arrow',trailing:true,attrs:`data-field="dismissal" data-value="${e(stats.repeat.label)}"`}) : ''}</article>
        <article><div class="tile">${icon('info',18)}</div>${tag('Hypothesized','amber')}<h3>What might explain it</h3><p>${stats.repeat ? candidate : 'More comparable records may help you form a question worth testing.'}</p></article>
        <article><div class="tile">${icon('target',18)}</div>${tag('Next action','gray')}<h3>What to investigate next</h3><p>${stats.repeat?.label==='Caught' ? 'Record the shot you intended and where the fielders were when you chose it.' : 'Record the shot you intended and compare it with the outcome for a few similar deliveries.'}</p>${button('Open next session plan',{to:'plan',variant:'subtle',glyph:'arrow',trailing:true})}</article>
      </div>
      <div class="feedback-row">${select('feedback','Your assessment',feedback,data.feedback[key],'Choose your response',`data-feedback="${e(key)}"`)}<p>${data.feedback[key]==='Ask a coach' ? 'Show the supporting innings and ask which details would help interpret the outcome.' : data.feedback[key]==='This observation needs correction' ? 'Inspect the underlying innings and correct any entries in the log.' : 'Your assessment is saved with this workspace.'}</p></div>
    </section>
    <div class="three-grid">${distribution('Dismissal distribution',stats.dismissals,stats.outs,'dismissal',`${stats.outs} dismissals · ${stats.notOut} not out excluded`)}${distribution('Shot categories',stats.shots,stats.knownShots,'shotCategory',`${stats.knownShots} of ${stats.count} innings with a known shot`)}${distribution('Match phases',stats.phases,stats.knownPhases,'phase',`${stats.knownPhases} of ${stats.count} innings with a phase`)}</div>
    <section class="panel">${panelHead('Runs across innings',`Latest ${Math.min(8,stats.count)} visible innings`)}${trend(records)}</section>`}`;
}

function evidenceRows(evidence) {
  return evidence.length ? `<ul class="evidence-list">${evidence.map(row=>`<li>${tag(row.kind,row.kind==='Simulated'?'violet':['Hypothesized','AI pose estimate'].includes(row.kind)?'amber':'lime')}<div><strong>${e(row.source)}</strong><p>${e(row.text)}</p></div></li>`).join('')}</ul>` : `<p class="muted">No recurring outcome or selected observation yet. You can start with a general review set.</p>`;
}

export function plan(data, selectedId, draft = null) {
  const saved = data.plans.find(item => item.id === selectedId) || null;
  const suggestion = suggestPlan(data,draft?.focus || saved?.focus || data.focus,saved?.id);
  const model = draft || saved || suggestion;
  const base = focuses[model.focus];
  const history = [...data.plans].reverse();
  return `${pageHead('NEXT SESSION PLAN','What should I practise next?','Choose one focus, review the evidence and adapt the activities to your next session.',button('New plan',{action:'new-plan',glyph:'plus',variant:'outline'}))}
    <div class="plan-grid">
      <section class="panel plan-editor">${panelHead(saved?'Saved practice plan':'Build a practice plan',saved?`Created ${dateLabel(saved.created,{day:'numeric',month:'short',year:'numeric'})}`:suggestion.reason,saved?tag(saved.complete?'Completed':'In progress',saved.complete?'lime':'gray'):'')}
      <form id="plan-form"><input type="hidden" name="planId" value="${e(saved?.id || '')}">
        ${select('focus','Practice focus',Object.entries(focuses).map(([key,value])=>[key,value.title]),model.focus,'','data-plan-focus')}
        <details class="mobile-evidence"><summary>Review current evidence <span>${suggestion.evidence.length} ${suggestion.evidence.length===1?'source':'sources'}</span></summary>
          ${evidenceRows(suggestion.evidence)}<p class="callout">${e(suggestion.uncertainty)}</p></details>
        ${area('objective','One improvement objective',model.objective,'maxlength="400" rows="2" required')}
        <div class="plan-activities"><h3>Practice activities</h3>${model.activities.map((activity,i) => {
          const [, ,equipment,instructions,observe] = base.activities[i] || [];
          return `<article class="activity"><div class="activity-top"><span class="tile">${icon('target',17)}</span><div><h4>${e(activity.title)}</h4><p>${e(equipment)}</p></div></div><p>${e(instructions)}</p><p><strong>Observe</strong> ${e(observe)}</p>
            <div class="activity-edit">${input(`title-${i}`,'Activity name',activity.title,'maxlength="80" required')}${input(`dose-${i}`,'Duration or reps',activity.dose,'maxlength="80" required')}</div>
            ${saved ? `<label class="check"><input type="checkbox" name="done-${i}" ${activity.done?'checked':''}> Activity completed</label>` : ''}<details><summary>Activity review status</summary><p>Illustrative, staff and coach review pending. Adapt the setup to your available space, equipment and coaching advice.</p></details></article>`;
        }).join('')}</div>
        ${area('criterion','Check-in criterion',model.criterion,'maxlength="400" rows="2" required')}
        ${input('next','Next check-in date',model.next,'type="date"')}
        ${saved ? `${area('reflection','Post-session reflection',model.reflection,'maxlength="800" rows="3" placeholder="What did you observe? What would you try again?"')}<label class="check"><input type="checkbox" name="complete" ${model.complete?'checked':''}> Mark session complete</label>` : ''}
        <p class="form-error" role="alert"></p><div class="button-row"><button type="submit" class="btn primary">${icon('check',17)} ${saved?'Save changes':'Save practice plan'}</button>${saved ? button('Delete plan',{action:'delete-plan',glyph:'trash',variant:'subtle',attrs:`data-id="${e(saved.id)}"`}) : ''}</div>
      </form></section>
      <div class="plan-aside"><section class="panel desktop-evidence">${panelHead('Current evidence','Updates as innings and observations change.')}${evidenceRows(suggestion.evidence)}<div class="callout">${icon('info',19)}<p>${e(suggestion.uncertainty)}</p></div><div class="button-row">${button('Review insights',{to:'insights',variant:'subtle',glyph:'arrow',trailing:true})}${button('Review clips',{to:'video',variant:'subtle',glyph:'arrow',trailing:true})}</div></section>
      <section class="panel">${panelHead('Plan history',`${history.length} saved ${history.length===1?'plan':'plans'}`)}${history.length ? `<div class="history">${history.map(item=>`<button type="button" data-action="open-plan" data-id="${e(item.id)}" aria-pressed="${item.id===saved?.id}"><div><strong>${e(focuses[item.focus].title)}</strong><small>${dateLabel(item.created)} · ${item.complete?'Completed':'In progress'}</small></div>${icon('arrow',17)}</button>`).join('')}</div>` : '<p class="muted">Your saved practice sessions will appear here.</p>'}</section></div>
    </div>`;
}
