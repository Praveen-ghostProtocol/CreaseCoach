import { STORAGE, decode, demoVideoSource, encode, events, focuses, isBattingClip, makeDemo, makePlayer, noteKinds, planEvidence, poseNoteSource, storyboardId, suggestPlan, today, validDate, validWorkspace, validateInnings } from './domain.js';
import { button, dateLabel, escapeHtml as e, icon, iconButton, id, initials, input, select, timeLabel } from './ui.js';
import { home, insights, log, plan } from './views.js';
import { getReview, inspectVideo, setupPlayback, videoView } from './video.js';
import { mountPoseReview } from './pose.js';
import { phaseByKey, updatedMarkers } from './batting-timeline.js';
import { comparisonDemoClips, demoClipById, demoClipPath } from './demo-clips.js';
import { forgetClip, keepClip, storedClip } from './clip-storage.js';
import { readDimensions } from './anthropometry.js';
import { frameMeasureDialog } from './measure-frame.js';
import { startAppUpdates } from './pwa.js';
import { mountComparison } from './video-compare.js';
import { clipDimensionEditor, confirmAction, dialog, dialogForm, dimensionFields, inningsEditor, markerEditor, noteEditor, showDialog, showInnings, workspaceDialog } from './dialogs.js';

const destinations = {
  home:['Home','Home','home'], log:['Performance Log','Log','log'], insights:['Performance Insights','Insights','chart'],
  video:['Video Lab','Video','video'], plan:['Next Session Plan','Plan','target'],
};
const tour = [
  ['home','Meet the demo player','Arjun’s fictional workspace starts with six recorded innings.'],
  ['log','Update the record','Edit an innings or add one to see how the evidence changes.'],
  ['insights','Read the evidence','Inspect the records behind a repeated outcome.'],
  ['video','Review a moment','Pause the practice footage or open your own clip and mark an observation.'],
  ['plan','Choose what to practise','Edit and save one objective, then record what happened after practice.'],
];
const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const videoFiles = {demo:new Map(),personal:new Map()};
const videoMemory = {demo:new Map(),personal:new Map()};
const restoredWorkspaces = new WeakSet();
const initialDemo=makeDemo();
let state = {mode:'demo',demo:initialDemo,personal:makePlayer()};
let storageIssue = '';
let storedDataInvalid = false;
let filterLog = {};
let filterInsights = {};
let tab = 'patterns';
let planId = '';
let planDraft = null;
let reviewId = '';
let reviewSeeking = null;
let comparison = {open:false,left:'',right:'',phase:'backlift',speed:1};
let comparisonCleanup = null;
let videoFileTarget;
let playback = null;
let poseCleanup = null;
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
    try {
      state = decode(raw);
      state.demo.profile.dimensions ??= initialDemo.profile.dimensions;
    }
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
  for (const clip of state[mode].videos.filter(item=>item.source==='user_observed_video')) {
    forgetClip(mode,clip.id).catch(()=>notify('Browser storage could not clear a local video copy.'));
  }
}

function resetNavigation() {
  filterLog = {};
  filterInsights = {};
  tab = 'patterns';
  planId = '';
  planDraft = null;
  reviewId = '';
  reviewSeeking = null;
  comparison = {open:false,left:'',right:'',phase:'backlift',speed:1};
  videoFileTarget = undefined;
  videoError = '';
}

function openComparison() {
  const files=videoFiles[state.mode];
  const real=data().videos.filter(isBattingClip);
  const preferred=[...real].reverse().sort((a,b)=>Number(files.has(b.id))-Number(files.has(a.id)) || Number(Boolean(demoClipById(a.id)))-Number(Boolean(demoClipById(b.id))));
  if (!real.some(clip=>clip.id===comparison.left)) {
    comparison.left=real.find(clip=>clip.id===reviewId && clip.id!==comparison.right)?.id || preferred.find(clip=>clip.id!==comparison.right)?.id || '';
  }
  if (!real.some(clip=>clip.id===comparison.right)) comparison.right=preferred.find(clip=>clip.id!==comparison.left)?.id || '';
  comparison.open=true;
  videoError='';
  render();
}

async function loadComparisonDemo({compare=true} = {}) {
  if (videoPending) return;
  const originalMode=state.mode;
  const demoWorkspace=state.demo;
  const files=videoFiles.demo;
  videoPending='demo';
  videoError='';
  render();
  const loaded=await Promise.allSettled(comparisonDemoClips.map(async clip=>{
    const existing=files.get(clip.id);
    if (existing) return {clip,media:existing,reused:true};
    const result=await fetch(demoClipPath(clip),{signal:AbortSignal.timeout(20000)});
    if (!result.ok) throw new Error('Sample clip unavailable.');
    const blob=await result.blob();
    const file=new File([blob],clip.fileName,{type:'video/mp4',lastModified:0});
    return {clip,media:{...await inspectVideo(file),size:file.size},reused:false};
  }));
  const prepared=loaded.filter(result=>result.status==='fulfilled').map(result=>result.value);
  videoPending=false;
  const active=route()==='video' && state.mode===originalMode && state.demo===demoWorkspace;
  if (!active || prepared.length!==comparisonDemoClips.length) {
    prepared.filter(item=>!item.reused).forEach(item=>URL.revokeObjectURL(item.media.url));
    if (active) videoError='The comparison demo could not load. Open it once with a connection, then try again.';
    if (route()==='video') render();
    return;
  }
  if (!demo()) {state.mode='demo';resetNavigation();tourIndex=-1;}
  for (const {clip,media} of prepared) {
    const record={id:clip.id,title:clip.title,fileName:clip.fileName,size:media.size,modified:0,duration:media.duration,
      source:demoVideoSource,markers:{...clip.markers}};
    const existing=demoWorkspace.videos.find(item=>item.id===clip.id);
    if (existing) {
      const prior=comparisonDemoClips[0].id===clip.id && existing.markers;
      if (prior?.backlift===1.07 && prior.downswing===1.60 && prior.followThrough===1.90) existing.markers={...clip.markers};
      Object.assign(existing,{fileName:record.fileName,size:record.size,modified:record.modified,duration:record.duration});
    }
    else demoWorkspace.videos.push({...record,notes:[]});
    files.set(clip.id,media);
  }
  const [left,right]=comparisonDemoClips;
  if (compare) reviewId=left.id;
  if (compare) comparison={open:true,left:left.id,right:right.id,phase:'downswing',speed:.5};
  persist(compare?'Comparison demo ready.':'');
  render();
}

async function restoreLocalClips(mode,workspace) {
  if (restoredWorkspaces.has(workspace)) return;
  restoredWorkspaces.add(workspace);
  const files = videoFiles[mode];
  const local = workspace.videos.filter(clip=>clip.source==='user_observed_video' && !files.has(clip.id));
  const restored = await Promise.all(local.map(async clip => {
    const file = await storedClip(mode,clip.id).catch(()=>null);
    if (!file || state[mode]!==workspace || !workspace.videos.includes(clip) || files.has(clip.id)) return false;
    files.set(clip.id,{url:URL.createObjectURL(file),duration:clip.duration});
    return true;
  }));
  if (restored.includes(true) && state.mode===mode && route()==='video' && !dialog.open) render();
}

function enterVideo() {
  const workspace = data();
  if (!reviewId) reviewId = workspace.videos.findLast(clip=>clip.source==='user_observed_video')?.id ||
    (demo()?comparisonDemoClips[0].id:'');
  restoreLocalClips(state.mode,workspace);
  if (demoClipById(reviewId) && !videoFiles[state.mode].has(reviewId) && !videoPending) {
    loadComparisonDemo({compare:false});
    return;
  }
  render();
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
    : active?.matches('#review-select, #compare-left, #compare-right, #compare-phase') ? `#${active.id}`
    : ['video-review','video-compare'].includes(active?.dataset.action) ? `[data-action="${active.dataset.action}"]`
    : active?.dataset.action === 'insights-tab' ? `[data-tab="${active.dataset.tab}"]` : '';
  playback?.dispose();
  playback = null;
  poseCleanup?.();
  poseCleanup = null;
  comparisonCleanup?.();
  comparisonCleanup = null;
  motionCleanup?.();
  motionCleanup = null;
  const current = route();
  const workspace = data();
  const name = workspace.profile.name;
  const pages = {
    home:() => home(workspace,demo()), log:() => log(workspace,filterLog), insights:() => insights(workspace,filterInsights,tab),
    video:() => videoView(workspace,reviewId,videoFiles[state.mode],videoPending,comparison), plan:() => plan(workspace,planId,planDraft),
  };
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#home" aria-label="CreaseCoach home"><img src="./icons/mark.svg" width="38" height="38" alt=""><span><strong>CreaseCoach</strong><small>BATTING WORKSPACE</small></span></a>
    <nav class="side-nav" aria-label="Main navigation"><div class="nav-label">WORKSPACE</div>${navigation(current)}</nav>
    <div class="sidebar-bottom"><button type="button" class="profile" data-action="workspace"><span class="avatar">${initials(name)}</span><span><strong>${e(name)}</strong><small>${demo()?'Fictional demo player':e(workspace.profile.hand || 'Personal workspace')}</small></span>${icon('chevron',16)}</button></div></aside>
    <div class="main-shell"><header class="topbar"><div class="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><strong>${destinations[current][0]}</strong></div>
    <a class="mobile-brand" href="#home" aria-label="CreaseCoach home"><img src="./icons/mark.svg" width="32" height="32" alt=""><strong>CreaseCoach</strong></a>
    <div class="top-actions">${button('Guided demo',{action:'start-demo',glyph:'play',variant:'subtle guide-button'})}
    ${button(demo()?'Demo workspace':'My workspace',{action:'workspace',glyph:'chevron',trailing:true,variant:`outline workspace-button${demo()?' is-demo':''}`,attrs:'aria-haspopup="dialog"'})}</div></header>
    <main id="content" tabindex="-1"${current==='video' && comparison.open?' class="compare-page"':''}>${storageIssue?`<div class="callout" role="status">${icon('info',18)}<p>${e(storageIssue)}</p></div>`:''}${walkthrough()}${pages[current]()}</main></div>
    <nav class="mobile-nav" aria-label="Mobile navigation">${navigation(current,true)}</nav>
    <input type="file" accept=".json,application/json" id="backup-file" class="sr-only" aria-label="Choose backup file" tabindex="-1">`;
  document.title = `${destinations[current][0]} · CreaseCoach`;
  if (focusSelector && !dialog.open) app.querySelector(focusSelector)?.focus({preventScroll:true});
  if (current === 'video') {
    if (comparison.open) {
      const aligned=app.querySelector('[data-aligned]');
      if (aligned) comparisonCleanup=mountComparison(aligned,speed=>{comparison.speed=speed;});
    } else {
      const memory = videoMemory[state.mode];
      if (!memory.has(reviewId)) memory.set(reviewId,{});
      const review = currentReview();
      const clipMemory = memory.get(reviewId);
      const seek = reviewSeeking?.id===reviewId && (videoFiles[state.mode].has(reviewId) || reviewId===storyboardId);
      if (seek) { clipMemory.time = reviewSeeking.time; reviewSeeking = null; }
      playback = setupPlayback(review,clipMemory,showVideoError);
      const poseRoot = document.querySelector('#pose-review');
      if (poseRoot && playback) poseCleanup=mountPoseReview(poseRoot,document.querySelector('#video-element'),playback,review,clipMemory,(time,text)=>{
        noteEditor(review,null,time,{text,kind:'Needs expert review',source:poseNoteSource});
      });
    }
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

async function loadVideo(file,{side,clipId} = {}) {
  const mode = state.mode;
  const workspace = data();
  videoPending = true;
  videoError = '';
  render();
  try {
    const target = clipId && workspace.videos.find(item=>item.id===clipId);
    if (clipId && (!target || target.fileName!==file.name || target.size!==file.size)) {
      throw new Error(target?`Choose the original file, ${target.fileName}, to restore its saved observations.`:'The saved clip is unavailable. Open the file as a new clip.');
    }
    const media = await inspectVideo(file);
    if (state[mode] !== workspace || target && !workspace.videos.includes(target)) { URL.revokeObjectURL(media.url); return; }
    if (target && Math.abs(target.duration-media.duration)>.05) {
      URL.revokeObjectURL(media.url);
      throw new Error('The duration differs from the saved clip. Choose the original file.');
    }
    let review = target || workspace.videos.find(item => item.fileName === file.name && item.size === file.size && item.modified === file.lastModified);
    if (!review) {
      review = {id:id(),title:file.name.slice(0,160),fileName:file.name,size:file.size,modified:file.lastModified,duration:media.duration,source:'user_observed_video',notes:[]};
      workspace.videos.push(review);
      persist();
    } else if (target && target.modified!==file.lastModified) {
      target.modified=file.lastModified;
      persist();
    }
    const files = videoFiles[mode];
    if (files.has(review.id)) URL.revokeObjectURL(files.get(review.id).url);
    files.set(review.id,media);
    if (mode === state.mode) {
      if (side==='left' || side==='right') {
        const other=side==='left'?'right':'left';
        if (comparison[other]===review.id) showVideoError('That clip is already on the other side. Choose a different file.');
        else comparison[side]=review.id;
      } else reviewId=review.id;
    }
    if (review.source==='user_observed_video') {
      await keepClip(mode,review.id,file).catch(()=>{
        if (state[mode]!==workspace || !workspace.videos.includes(review)) return;
        notify('Clip open for this session. Reselect the original file after refreshing.');
        if (state.mode===mode && route()==='video') showVideoError('Browser storage could not keep this video. Markers and observations are saved separately.');
      });
    }
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
    activities,reflection:trim('reflection'),complete:values.has('complete'),evidence:saved?.evidence ?? planEvidence(data(),saved?.id)};
}

const actions = {
  workspace:() => workspaceDialog(demo(),data().profile,!!installPrompt),
  'close-dialog':() => dialog.close(),
  'switch-demo':() => setWorkspace('demo'),
  'switch-personal':() => setWorkspace('personal'),
  'edit-profile':() => showDialog('Edit batting profile',dialogForm('profile',`${input('name','Display name',data().profile.name,'maxlength="70" required autofocus')}
    ${select('hand','Batting hand',['Right-hand batter','Left-hand batter'],data().profile.hand,'Not recorded')}${input('level','Experience or role',data().profile.level,'maxlength="90" placeholder="Club player, school player…"')}
    <details class="form-details" ${Object.keys(data().profile.dimensions||{}).length?'open':''}><summary>Player anthropometry <span>Optional</span></summary>${dimensionFields(data().profile.dimensions)}</details>`, 'Save profile')),
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
    comparison.open=false;
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
  'plan-from-video':() => {planId = ''; planDraft = null; go('plan');},
  'open-plan':({id:key}) => {planId = key; planDraft = null; render(); document.querySelector('#plan-form select')?.focus();},
  'delete-plan':({id:key}) => confirmAction('Delete this practice plan?','The saved activities and reflection will be removed from your history.','Delete plan','confirm-plan',`data-id="${e(key)}"`),
  'confirm-plan':({id:key}) => {
    data().plans = data().plans.filter(item=>item.id!==key); planId = ''; planDraft = null;
    activity('Deleted a practice plan'); persist('Practice plan deleted.'); dialog.close(); render();
  },
  'related-clip':({id:key,time}) => {
    if (!getReview(data(),key)) return;
    reviewId = key;
    reviewSeeking = time===undefined ? null : {id:key,time:Number(time)};
    comparison.open = false;
    dialog.close();
    if (route()==='video') enterVideo();
    else go('video');
  },
  'video-compare':openComparison,
  'load-comparison-demo':loadComparisonDemo,
  'reload-sample-review':() => loadComparisonDemo({compare:false}),
  'video-review':() => {comparison.open=false; videoError=''; render();},
  'compare-review-frame':({id:key,side}) => {
    const player=app.querySelector(side==='left'?'[data-clip="left"] video':'[data-clip="right"] video');
    if (!player || player.readyState<1) return;
    actions['related-clip']({id:key,time:player.currentTime});
  },
  'compare-edit-markers':({id:key}) => {
    if (!getReview(data(),key)) return;
    reviewId=key; comparison.open=false; videoError=''; render();
    app.querySelector('[data-action="edit-marker"]')?.focus();
  },
  'open-video-file':({side,clipId}) => {videoFileTarget={side,clipId}; document.querySelector('#video-file')?.click();},
  'edit-marker':({phase:key}) => {
    const review=currentReview();
    const phase=phaseByKey(key);
    if (!isBattingClip(review) || !phase) return;
    playback?.pause();
    markerEditor(review,phase,playback?.time()||0);
  },
  'remove-marker':({phase:key}) => {
    const phase=phaseByKey(key);
    const review=currentReview();
    if (phase && review?.markers?.[key]!==undefined) confirmAction(`Remove ${phase.label.toLowerCase()} marker?`,
      'This phase will need a new marker before it can align a comparison.','Remove marker','confirm-marker',`data-phase="${key}" data-id="${e(review.id)}"`);
  },
  'confirm-marker':({phase:key,id:clipId}) => {
    const review=getReview(data(),clipId);
    if (!phaseByKey(key) || review?.markers?.[key]===undefined) return;
    delete review.markers[key];
    persist('Batting marker removed.'); dialog.close(); render();
  },
  'jump-video':({time}) => {playback?.pause(); playback?.seek(+time);},
  'edit-clip-dimensions':({id:key}) => {
    const clip=getReview(data(),key);
    if (isBattingClip(clip)) clipDimensionEditor(clip);
  },
  'measure-frame':async () => {
    const player=playback;
    const review=currentReview();
    if (!player || !isBattingClip(review)) return;
    if (review.projections?.length>=20) {notify('Remove a saved frame estimate before adding another.');return;}
    try {
      const frame=await player.capture();
      if (player!==playback) return;
      frameMeasureDialog(review,frame,player.time(),result=>{
        if (currentReview()!==review) return;
        review.projections ||= [];
        review.projections.push({id:id(),...result});
        persist('Projected frame estimate saved.'); dialog.close(); render();
      });
    } catch (error) {notify(error.message);}
  },
  'remove-projection':({id:key}) => {
    if (currentReview()?.projections?.some(row=>row.id===key)) confirmAction('Remove this frame estimate?',
      'This estimate will be removed from the clip.','Remove estimate','confirm-projection',`data-id="${e(key)}"`);
  },
  'confirm-projection':({id:key}) => {
    const review=currentReview();
    if (!review?.projections?.some(row=>row.id===key)) return;
    review.projections=review.projections.filter(row=>row.id!==key);
    persist('Frame estimate removed.'); dialog.close(); render();
  },
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
  'delete-review':() => confirmAction('Remove this clip and its notes?','The video and current observations will be removed. Saved plans keep their written evidence.','Remove clip','confirm-review'),
  'confirm-review':() => {
    const review=currentReview();
    if (!isBattingClip(review)) return;
    if (review.source==='user_observed_video') forgetClip(state.mode,reviewId).catch(()=>notify('Browser storage could not clear the local video copy.'));
    const files = videoFiles[state.mode];
    if (files.has(reviewId)) URL.revokeObjectURL(files.get(reviewId).url);
    files.delete(reviewId); videoMemory[state.mode].delete(reviewId);
    data().videos = data().videos.filter(item=>item.id!==reviewId);
    if (comparison.left===reviewId) comparison.left='';
    if (comparison.right===reviewId) comparison.right='';
    data().innings.forEach(row=>{if (row.videoId===reviewId) row.videoId='';});
    reviewId = ''; reviewSeeking = null; videoError = ''; persist('Clip and its observations removed.'); dialog.close(); enterVideo();
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
    reviewId = field.value; reviewSeeking = null; videoError = ''; enterVideo();
  } else if (field.id==='video-file' && field.files.length) {
    const target=videoFileTarget;
    videoFileTarget=undefined;
    await loadVideo(field.files[0],target);
  } else if (field.matches('[data-compare-clip]')) {
    comparison[field.name]=field.value; videoError=''; render();
  } else if (field.matches('[data-compare-phase]')) {
    comparison.phase=field.value; render();
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
      case 'marker': {
        const review=getReview(data(),form.dataset.clipId);
        if (!isBattingClip(review)) throw new Error('Open a batting clip before setting markers.');
        review.markers=updatedMarkers(review,form.dataset.phase,values.time);
        message=`${phaseByKey(form.dataset.phase).label} marker saved.`;
        break;
      }
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
        data().profile = {name,hand:values.hand,level:values.level.trim(),dimensions:readDimensions(values)};
        message = 'Profile updated.';
        break;
      }
      case 'clip-dimensions': {
        const review=getReview(data(),form.dataset.clipId);
        if (!isBattingClip(review)) throw new Error('Choose a batting clip first.');
        review.dimensions=readDimensions(values);
        message='Clip dimensions saved.';
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
        if (isBattingClip(review) && (old?.source || form.dataset.noteSource) === poseNoteSource) note.source=poseNoteSource;
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

function launchDemoLink() {
  const url=new URL(location.href);
  if (url.hash!=='#video-demo' && url.searchParams.get('demo')!=='1') return false;
  url.searchParams.delete('demo');
  url.hash='video';
  history.replaceState(null,'',url);
  loadComparisonDemo();
  return true;
}

window.addEventListener('hashchange',() => {
  if (launchDemoLink()) return;
  if (location.hash==='#content') {app.querySelector('#content')?.focus(); return;}
  if (route()==='video') enterVideo();
  else render();
  window.scrollTo(0,0);
  app.querySelector('#content').focus({preventScroll:true});
});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault(); app.querySelector('#content')?.focus();});
window.addEventListener('beforeinstallprompt',event => {event.preventDefault(); installPrompt=event;});
window.addEventListener('appinstalled',() => {installPrompt=null; notify('CreaseCoach installed.');});

if (!launchDemoLink()) {
  if (route()==='video') enterVideo();
  else render();
}
startAppUpdates();
