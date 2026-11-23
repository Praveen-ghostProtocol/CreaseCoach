import { STORAGE, decode, encode, events, focuses, makeDemo, makePlayer, noteKinds, storyboardId, suggestPlan, today, validDate, validWorkspace, validateInnings } from './domain.js';
import { button, dateLabel, escapeHtml as e, icon, iconButton, id, initials, input, select, timeLabel } from './ui.js';
import { home, insights, log, plan } from './views.js';
import { getReview, inspectVideo, setupPlayback, videoView } from './video.js';
import { confirmAction, dialog, dialogForm, inningsEditor, noteEditor, showDialog, showInnings, workspaceDialog } from './dialogs.js';

const destinations = {
  home:['Home','Home','home'], log:['Performance Log','Log','log'], insights:['Performance Insights','Insights','chart'],
  video:['Video Lab','Video','video'], plan:['Next Session Plan','Plan','target'],
};
const tour = [
  ['home','Meet the demo player','Arjun’s fictional workspace starts with six recorded innings.'],
  ['log','Update the record','Edit an innings or add one to see how the evidence changes.'],
  ['insights','Read the evidence','Compare recorded outcomes, then try the Bat Motion Explorer with its simulated sessions.'],
  ['video','Review a moment','Pause the schematic or a local clip and mark an observation for the plan.'],
  ['plan','Choose what to practise','Edit and save one objective, then record what happened after practice.'],
];
const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const videoFiles = {demo:new Map(),personal:new Map()};
const videoMemory = {demo:new Map(),personal:new Map()};
let state = {mode:'demo',demo:makeDemo(),personal:makePlayer()};
let storageIssue = '';
let storedDataInvalid = false;
let filterLog = {};
let filterInsights = {};
let tab = 'patterns';
let planId = '';
let planDraft = null;
let reviewId = storyboardId;
let playback = null;
let videoPending = false;
let videoError = '';
let motionCleanup = null;
let installPrompt = null;
let tourIndex = -1;
let toastTimer;
let lastTrigger;
let pendingBackup;

try {
  const raw = localStorage.getItem(STORAGE);
  if (raw) {
    try { state = decode(raw); }
    catch { storedDataInvalid = true; storageIssue = 'Existing workspace records could not be read. Edits are temporary until storage is restored.'; }
  }
} catch { storageIssue = 'Browser storage is unavailable. Edits may be lost after you close this page.'; }

const data = () => state[state.mode];
const route = () => Object.hasOwn(destinations,location.hash.slice(1)) ? location.hash.slice(1) : 'home';
const demo = () => state.mode === 'demo';
const recordById = key => data().innings.find(row => row.id === key);
const currentReview = () => getReview(data(),reviewId);

function notify(message) {
  toast.textContent = message;
  toast.classList.add('shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('shown'),3700);
}

function persist(message = '') {
  if (!storedDataInvalid) {
    try {
      localStorage.setItem(STORAGE,encode(state));
      storageIssue = '';
    } catch { storageIssue = 'Browser storage is full or unavailable. Edits may be lost after you close this page.'; }
  }
  if (storageIssue) notify(storageIssue);
  else if (message) notify(message);
}

function activity(text) {
  data().logs = [{id:id(),date:today(),text},...data().logs].slice(0,24);
}

function go(next) {
  if (location.hash === `#${next}`) render();
  else location.hash = next;
}

function clearMedia(mode) {
  for (const {url} of videoFiles[mode].values()) URL.revokeObjectURL(url);
  videoFiles[mode].clear();
  videoMemory[mode].clear();
}

function resetNavigation() {
  filterLog = {};
  filterInsights = {};
  tab = 'patterns';
  planId = '';
  planDraft = null;
  reviewId = storyboardId;
  videoError = '';
}

function setWorkspace(mode) {
  dialog.close();
  if (mode === state.mode) return;
  state.mode = mode;
  tourIndex = -1;
  resetNavigation();
  persist(mode==='demo'?'Demo workspace opened.':'Personal workspace opened.');
  go('home');
}

function navigation(current, mobile = false) {
  return Object.entries(destinations).map(([path,[label,short,glyph]]) => `<a href="#${path}" class="nav-link" ${path===current?'aria-current="page"':''}>${icon(glyph,20)}<span>${mobile?short:label}</span></a>`).join('');
}

function walkthrough() {
  if (tourIndex < 0) return '';
  const [,title,description] = tour[tourIndex];
  return `<section class="tour-banner" aria-label="Guided demo"><div><strong>Demo step ${tourIndex+1} of ${tour.length} · ${title}</strong><p>${description}</p></div><div class="button-row compact">${button(tourIndex===tour.length-1?'Finish demo':'Next step',{action:'demo-next',glyph:'arrow',variant:'primary',trailing:true})}${iconButton('Close guided demo','close','demo-close')}</div></section>`;
}

function render() {
  const active = document.activeElement;
  const focusSelector = active?.dataset.filter ? `[data-filter="${active.dataset.filter}"][name="${active.name}"]`
    : active?.matches('[data-plan-focus]') ? '[data-plan-focus]'
    : active?.matches('#review-select') ? '#review-select'
    : active?.dataset.action === 'insights-tab' ? `[data-tab="${active.dataset.tab}"]` : '';
  playback?.dispose();
  playback = null;
  motionCleanup?.();
  motionCleanup = null;
  const current = route();
  const workspace = data();
  const name = workspace.profile.name;
  const pages = {
    home:() => home(workspace,demo()), log:() => log(workspace,filterLog), insights:() => insights(workspace,filterInsights,tab),
    video:() => videoView(workspace,reviewId,videoFiles[state.mode],videoPending), plan:() => plan(workspace,planId,planDraft),
  };
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#home" aria-label="CreaseCoach home"><img src="./icons/mark.svg" width="38" height="38" alt=""><span><strong>CreaseCoach</strong><small>BATTING WORKSPACE</small></span></a>
    <nav class="side-nav" aria-label="Main navigation"><div class="nav-label">WORKSPACE</div>${navigation(current)}</nav>
    <div class="sidebar-bottom"><button type="button" class="profile" data-action="workspace"><span class="avatar">${initials(name)}</span><span><strong>${e(name)}</strong><small>${demo()?'Fictional demo player':e(workspace.profile.hand || 'Personal workspace')}</small></span>${icon('chevron',16)}</button></div></aside>
    <div class="main-shell"><header class="topbar"><div class="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><strong>${destinations[current][0]}</strong></div>
    <a class="mobile-brand" href="#home" aria-label="CreaseCoach home"><img src="./icons/mark.svg" width="32" height="32" alt=""><strong>CreaseCoach</strong></a>
    <div class="top-actions">${button('Guided demo',{action:'start-demo',glyph:'play',variant:'subtle guide-button'})}
    ${button(demo()?'Demo workspace':'My workspace',{action:'workspace',glyph:'chevron',trailing:true,variant:`outline workspace-button${demo()?' is-demo':''}`,attrs:'aria-haspopup="dialog"'})}</div></header>
    <main id="content" tabindex="-1">${storageIssue?`<div class="callout" role="status">${icon('info',18)}<p>${e(storageIssue)}</p></div>`:''}${walkthrough()}${pages[current]()}</main></div>
    <nav class="mobile-nav" aria-label="Mobile navigation">${navigation(current,true)}</nav>
    <input type="file" accept=".json,application/json" id="backup-file" class="sr-only" aria-label="Choose backup file" tabindex="-1">`;
  document.title = `${destinations[current][0]} · CreaseCoach`;
  if (focusSelector && !dialog.open) app.querySelector(focusSelector)?.focus({preventScroll:true});
  if (current === 'video') {
    const memory = videoMemory[state.mode];
    if (!memory.has(reviewId)) memory.set(reviewId,{});
    playback = setupPlayback(currentReview(),memory.get(reviewId),showVideoError);
    if (videoError) showVideoError(videoError);
  }
  const motion = document.querySelector('#motion-root');
  if (motion) import('./motion.js').then(({mountMotion}) => {
    if (motion.isConnected) motionCleanup = mountMotion(motion,workspace.motion,selected => {
      workspace.motion = selected;
      persist(selected?'Simulated comparison added to your plan.':'Simulated comparison removed from your plan.');
    });
  }).catch(() => {
    if (motion.isConnected) motion.innerHTML = '<p class="muted" role="status">The motion explorer could not load. The other insights are still available.</p>';
  });
}

function showVideoError(message) {
  videoError = message;
  const feedback = document.querySelector('#video-load-message');
  if (feedback) feedback.textContent = message;
}

async function loadVideo(file) {
  const mode = state.mode;
  const workspace = data();
  videoPending = true;
  videoError = '';
  render();
  try {
    const media = await inspectVideo(file);
    if (state[mode] !== workspace) { URL.revokeObjectURL(media.url); return; }
    let review = workspace.videos.find(item => item.fileName === file.name && item.size === file.size && item.modified === file.lastModified);
    if (!review) {
      review = {id:id(),title:file.name.slice(0,160),fileName:file.name,size:file.size,modified:file.lastModified,duration:media.duration,source:'user_observed_video',notes:[]};
      workspace.videos.push(review);
      persist('Local clip ready for review.');
    }
    const files = videoFiles[mode];
    if (files.has(review.id)) URL.revokeObjectURL(files.get(review.id).url);
    files.set(review.id,media);
    if (mode === state.mode) reviewId = review.id;
  } catch (error) { if (mode === state.mode) showVideoError(error.message); }
  finally { videoPending = false; if (route()==='video') render(); }
}

function updateNote(noteId, update) {
  const review = currentReview();
  if (!review) return;
  const index = review.notes.findIndex(note => note.id === noteId);
  if (index >= 0) update(review.notes,index);
}

function download(href, fileName) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.click();
}

function readPlan(form) {
  const values = new FormData(form);
  const fields = Object.fromEntries(values);
  const trim = key => String(fields[key] || '').trim();
  const saved = data().plans.find(item=>item.id===fields.planId);
  if (!Object.hasOwn(focuses,fields.focus)) throw new Error('Choose a valid practice focus.');
  const activities = focuses[fields.focus].activities.map((_,i) => ({id:`${fields.focus}-${i+1}`,title:trim(`title-${i}`),dose:trim(`dose-${i}`),done:values.has(`done-${i}`)}));
  if (!trim('objective') || !trim('criterion') || activities.some(item=>!item.title || !item.dose)) throw new Error('Fill in an objective, check-in criterion and each activity’s name and duration.');
  if (fields.next && !validDate(fields.next)) throw new Error('Enter a valid check-in date.');
  return {id:saved?.id || id(),created:saved?.created || today(),focus:fields.focus,objective:trim('objective'),criterion:trim('criterion'),next:trim('next'),
    activities,reflection:trim('reflection'),complete:values.has('complete')};
}

const actions = {
  workspace:() => workspaceDialog(demo(),data().profile,!!installPrompt),
  'close-dialog':() => dialog.close(),
  'switch-demo':() => setWorkspace('demo'),
  'switch-personal':() => setWorkspace('personal'),
  'edit-profile':() => showDialog('Edit batting profile',dialogForm('profile',`${input('name','Display name',data().profile.name,'maxlength="70" required autofocus')}
    ${select('hand','Batting hand',['Right-hand batter','Left-hand batter'],data().profile.hand,'Not recorded')}${input('level','Experience or role',data().profile.level,'maxlength="90" placeholder="Club player, school player…"')}`, 'Save profile')),
  'reset-demo':() => confirmAction('Reset demo records?','Changes made in the demo workspace will be removed.','Reset demo','confirm-reset'),
  'confirm-reset':() => {
    clearMedia('demo'); state.demo = makeDemo(); resetNavigation(); dialog.close(); persist('Demo records restored.'); render();
  },
  export:() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({version:1,workspace:state.personal},null,2)],{type:'application/json'}));
    download(url,`creasecoach-records-${today()}.json`);
    setTimeout(() => URL.revokeObjectURL(url),1000);
  },
  'choose-backup':() => document.querySelector('#backup-file').click(),
  'confirm-backup':() => {
    if (!pendingBackup) return;
    clearMedia('personal'); state.personal = pendingBackup; pendingBackup = undefined;
    storedDataInvalid = false; state.mode = 'personal'; resetNavigation(); persist('Personal records imported.'); dialog.close(); go('home');
  },
  'start-demo':() => {
    if (!demo()) setWorkspace('demo');
    tourIndex = 0; go('home');
  },
  'demo-close':() => {tourIndex = -1; render();},
  'demo-next':() => {
    tourIndex++;
    if (tourIndex >= tour.length) {tourIndex = -1; render(); return;}
    go(tour[tourIndex][0]);
  },
  install:async () => {
    if (installPrompt) {const prompt = installPrompt; installPrompt = null; dialog.close(); await prompt.prompt(); return;}
    showDialog('Install CreaseCoach','<p>Open the production build in a supported browser. Use the browser menu’s Install app or Add to Home Screen option when it is available.</p><p class="muted">Installation is supported on HTTPS and on localhost. The development server serves the app without an offline cache.</p>');
  },
  'new-innings':() => inningsEditor(data()),
  'view-innings':({id:key}) => {const row = recordById(key); if (row) showInnings(data(),row);},
  'edit-innings':({id:key}) => {const row = recordById(key); if (row) inningsEditor(data(),row);},
  'delete-innings':({id:key}) => {if (recordById(key)) confirmAction('Delete this innings?','The record will be removed and related summaries will update.','Delete innings','confirm-innings',`data-id="${e(key)}"`);},
  'confirm-innings':({id:key}) => {
    if (!recordById(key)) return;
    data().innings = data().innings.filter(row=>row.id!==key);
    activity('Deleted an innings'); persist('Innings deleted.'); dialog.close(); render();
  },
  'clear-filters':({key}) => {if (key==='log') filterLog = {}; else filterInsights = {}; render();},
  'insights-tab':({tab:value}) => {tab = value; render();},
  inspect:({field,value}) => {filterLog = {...filterInsights,[field]:value}; go('log');},
  'new-plan':() => {planId = ''; planDraft = null; render(); document.querySelector('#plan-form select')?.focus();},
  'open-plan':({id:key}) => {planId = key; planDraft = null; render(); document.querySelector('#plan-form select')?.focus();},
  'delete-plan':({id:key}) => confirmAction('Delete this practice plan?','The saved activities and reflection will be removed from your history.','Delete plan','confirm-plan',`data-id="${e(key)}"`),
  'confirm-plan':({id:key}) => {
    data().plans = data().plans.filter(item=>item.id!==key); planId = ''; planDraft = null;
    activity('Deleted a practice plan'); persist('Practice plan deleted.'); dialog.close(); render();
  },
  'related-clip':({id:key}) => {reviewId = key; dialog.close(); go('video');},
  'open-video-file':() => document.querySelector('#video-file')?.click(),
  'jump-video':({time}) => {playback?.pause(); playback?.seek(+time);},
  'capture-frame':async () => {
    if (!playback) return;
    const player = playback;
    try {
      const frame = await player.capture();
      if (player !== playback) return;
      showDialog(`Captured frame · ${timeLabel(player.time())}`,`<img class="captured-frame" src="${e(frame.data)}" alt="Captured local playback frame"><div class="button-row dialog-actions"><a class="btn outline" download="creasecoach-frame.${frame.ext}" href="${e(frame.data)}">${icon('download',17)} Download frame</a>${button('Add observation',{action:'new-note',glyph:'plus',variant:'primary'})}</div>`);
    } catch (error) {notify(error.message);}
  },
  'new-note':() => {if (playback) {playback.pause(); noteEditor(currentReview(),null,playback.time());}},
  'edit-note':({id:key}) => {const review = currentReview(); const note = review?.notes.find(item=>item.id===key); if (note) noteEditor(review,note,note.time);},
  'delete-note':({id:key}) => confirmAction('Delete this observation?','The observation will also be removed from current practice evidence.','Delete observation','confirm-note',`data-id="${e(key)}"`),
  'confirm-note':({id:key}) => {updateNote(key,(notes,i)=>notes.splice(i,1)); persist('Observation deleted.'); dialog.close(); render();},
  'delete-review':() => confirmAction('Remove this clip and its notes?','Saved observation references to this clip will be removed from the workspace.','Remove clip','confirm-review'),
  'confirm-review':() => {
    if (reviewId===storyboardId) return;
    const files = videoFiles[state.mode];
    if (files.has(reviewId)) URL.revokeObjectURL(files.get(reviewId).url);
    files.delete(reviewId); videoMemory[state.mode].delete(reviewId);
    data().videos = data().videos.filter(item=>item.id!==reviewId);
    data().innings.forEach(row=>{if (row.videoId===reviewId) row.videoId='';});
    reviewId = storyboardId; videoError = ''; persist('Clip and its observations removed.'); dialog.close(); render();
  },
};

document.addEventListener('click',event => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger || trigger.disabled) return;
  const action = actions[trigger.dataset.action];
  if (!action) return;
  if (!dialog.open) lastTrigger = trigger;
  Promise.resolve(action(trigger.dataset)).catch(error=>notify(error.message));
});

document.addEventListener('change',async event => {
  const field = event.target;
  if (field.id==='innings-out') {
    const dismissal = document.querySelector('#dismissal-field');
    const required = field.value==='yes';
    dismissal.hidden = !required;
    dismissal.querySelector('select').required = required;
    dismissal.querySelector('select').disabled = !required;
  } else if (field.dataset.filter) {
    const filters = field.dataset.filter==='log' ? filterLog : filterInsights;
    filters[field.name] = field.value;
    render();
  } else if (field.dataset.feedback) {
    const key = field.dataset.feedback;
    if (field.value) data().feedback[key] = field.value;
    else delete data().feedback[key];
    persist('Assessment saved.');
    const message = field.closest('.feedback-row').querySelector('p');
    message.textContent = field.value==='Ask a coach' ? 'Show the supporting innings and ask which details would help interpret the outcome.'
      : field.value==='This observation needs correction' ? 'Inspect the underlying innings and correct any entries in the log.' : 'Your assessment is saved with this workspace.';
  } else if (field.matches('[data-plan-focus]')) {
    const selected = field.value;
    const saved = data().plans.find(item=>item.id===planId);
    if (saved) {
      const values = new FormData(field.form);
      planDraft = {...suggestPlan(data(),selected),next:values.get('next'),reflection:values.get('reflection'),complete:false};
    } else { data().focus = selected; persist('Practice focus selected.'); }
    render();
  } else if (field.id==='review-select') {
    reviewId = field.value; videoError = ''; render();
  } else if (field.id==='video-file' && field.files.length) {
    await loadVideo(field.files[0]);
  } else if (field.dataset.noteSelect) {
    updateNote(field.dataset.noteSelect,(notes,i)=>{notes[i].selected=field.checked;});
    persist(field.checked?'Observation added to practice evidence.':'Observation removed from practice evidence.');
  } else if (field.id==='backup-file' && field.files.length) {
    try {
      const file = field.files[0];
      if (file.size > 5_000_000) throw new Error('Choose a CreaseCoach export smaller than 5 MB.');
      const {version,workspace} = JSON.parse(await file.text());
      if (version!==1 || !validWorkspace(workspace)) throw new Error('This file is not a valid CreaseCoach personal backup.');
      pendingBackup = workspace;
      confirmAction('Replace your personal records?','Import will replace the personal workspace with the records in this backup.','Import backup','confirm-backup');
    } catch {notify('Choose a valid CreaseCoach personal backup under 5 MB.');}
    finally {field.value='';}
  }
});

document.addEventListener('submit',event => {
  const form = event.target;
  const isPlan = form.matches('#plan-form');
  if (!form.dataset.form && !isPlan) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  let message = '';
  try {
    switch (form.dataset.form || 'plan') {
      case 'innings': {
        const old = recordById(form.dataset.id);
        const record = {...validateInnings(values),id:old?.id || id(),source:old?.source || 'user_reported'};
        if (old) Object.assign(old,record); else data().innings.push(record);
        activity(`${old?'Updated':'Logged'} ${record.runs} runs from ${record.balls} balls`);
        message = old?'Innings updated.':'Innings logged.';
        break;
      }
      case 'profile': {
        const name = String(values.name || '').trim();
        if (!name) throw new Error('Enter a display name.');
        data().profile = {name,hand:values.hand,level:values.level.trim()};
        message = 'Profile updated.';
        break;
      }
      case 'note': {
        const base = currentReview();
        const time = Number(values.time);
        const text = String(values.text || '').trim();
        if (!base || !text || !Number.isFinite(time) || time<0 || time>base.duration || !events.includes(values.event) || !noteKinds.includes(values.kind)) throw new Error('Enter an observation with a valid timestamp and evidence type.');
        const review = data().videos.find(item=>item.id===base.id) || {...base,notes:[]};
        if (!data().videos.includes(review)) data().videos.push(review);
        const old = review.notes.find(note=>note.id===form.dataset.id);
        const note = {id:old?.id || id(),time,text,event:values.event,kind:values.kind,selected:values.selected==='on'};
        if (old) Object.assign(old,note); else review.notes.push(note);
        activity(old?'Updated a video observation':'Added a video observation'); message = 'Observation saved.';
        break;
      }
      case 'plan': {
        const entry = readPlan(form);
        const existing = data().plans.find(item=>item.id===entry.id);
        const justCompleted = entry.complete && !existing?.complete;
        if (existing) Object.assign(existing,entry); else data().plans.push(entry);
        data().focus = entry.focus; planId = entry.id; planDraft = null;
        activity(justCompleted?'Completed a practice plan':existing?'Updated a practice plan':'Saved a practice plan');
        message = justCompleted?'Practice session marked complete.':'Practice plan saved.';
        break;
      }
    }
    persist(message);
    if (dialog.open) dialog.close();
    render();
    if (isPlan) app.querySelector('#plan-form button[type="submit"]')?.focus({preventScroll:true});
  } catch (error) {form.querySelector('.form-error').textContent = error.message;}
});

dialog.addEventListener('close',() => {
  if (lastTrigger?.isConnected) lastTrigger.focus({preventScroll:true});
  else if (!dialog.open && !app.contains(document.activeElement)) app.querySelector('#content')?.focus({preventScroll:true});
});

window.addEventListener('hashchange',() => {
  if (location.hash==='#content') {app.querySelector('#content')?.focus(); return;}
  render();
  window.scrollTo(0,0);
  app.querySelector('#content').focus({preventScroll:true});
});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault(); app.querySelector('#content')?.focus();});
window.addEventListener('beforeinstallprompt',event => {event.preventDefault(); installPrompt=event;});
window.addEventListener('appinstalled',() => {installPrompt=null; notify('CreaseCoach installed.');});

render();

if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
  const worker = new URL('../sw.js',import.meta.url);
  fetch(worker,{method:'HEAD',cache:'no-store'}).then(response => {
    if (response.ok && /javascript/.test(response.headers.get('content-type') || '')) return navigator.serviceWorker.register(worker);
  }).catch(() => { /* The workspace remains usable if offline caching cannot start. */ });
}
