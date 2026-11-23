import { poseNoteSource, storyboardId } from './domain.js';
import { button, empty, escapeHtml as e, icon, iconButton, pageHead, panelHead, select, tag, timeLabel } from './ui.js';
import { poseReviewPanel } from './pose.js';
import { battingPhases, markerTime } from './batting-timeline.js';
import { comparisonView } from './video-compare.js';

const storyboard = {id:storyboardId,title:'Batting action storyboard',fileName:'',size:0,modified:0,duration:6,source:'demo_simulated',notes:[]};
const steps = ['Setup','Backlift','Downswing','Approximate contact','Follow-through'];
export const getReview = (data, reviewId) => data.videos.find(item => item.id === reviewId) || (reviewId === storyboardId ? storyboard : null);

function schematic() {
  return `<svg id="schematic" viewBox="0 0 650 350" role="img" aria-labelledby="scheme-title"><title id="scheme-title">Illustrative batting positions on a cricket pitch</title>
    <defs><pattern id="vid-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0v32" fill="none" stroke="#b4ccae" stroke-opacity=".1"/></pattern></defs>
    <rect width="650" height="350" fill="url(#vid-grid)"/><path d="M0 287h650M190 316h480M256 280l-34 43M500 280l34 43" fill="none" stroke="#a3ba9b" stroke-opacity=".45" stroke-width="2"/>
    <path d="M218 284v-54m8 54v-54m8 54v-54m-18 0h21" fill="none" stroke="#d1d4a8" stroke-width="3"/>
    <path d="M288 284c42 13 144 13 204 0" fill="none" stroke="#bed59e" stroke-opacity=".3"/>
    <g id="story-batter" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="328" cy="118" r="18" fill="#e3eacb"/><path d="M311 113q15-22 34-3l10 9h-42z" fill="#889886" stroke="#e3eacb" stroke-width="2"/>
      <path id="story-body" d="M326 141 318 206M318 204l-24 42-3 35m27-77 29 37 19 40" stroke="#e3eacb" stroke-width="12"/>
      <path id="story-arms" d="M324 150l14 29 19 1m-32-22-9 23 40 0" stroke="#a9c498" stroke-width="8"/>
      <g id="story-bat"><path d="M0 0v27" stroke="#dae5bf" stroke-width="4"/><path d="M-5 27h10l3 45-3 5H-6l-2-5z" fill="#d4f379"/></g>
      <circle id="story-ball" cx="0" cy="0" r="5" fill="#d4f379"/>
    </g>
    <text x="26" y="33" font-family="system-ui" font-size="12" letter-spacing="2" fill="#c4d5be">SCHEMATIC • SIDE VIEW</text><text id="story-step" x="26" y="323" font-family="system-ui" font-size="15" fill="#e3eacb">Setup</text>
    </svg>`;
}

function timelineView(review,available) {
  const marks=review.markers||{};
  const count=Object.keys(marks).length;
  return `<section class="panel batting-timeline" aria-labelledby="batting-timeline-title">
    <div class="timeline-heading"><div><h3 id="batting-timeline-title">Batting timeline</h3><p>Pause on a phase to mark it from the playhead.</p></div>${tag(`${count}/3 marked`,count?'lime':'gray')}</div>
    <div class="batting-track" aria-hidden="true"><span></span>${battingPhases.map(({key},index)=>marks[key]===undefined?'':`<i data-phase-dot="${index}" style="--at:${marks[key]/review.duration*100}%"></i>`).join('')}<b data-batting-playhead ${available?'':'hidden'}></b></div>
    <div class="batting-track-times" aria-hidden="true"><span>0:00.00</span><span>${markerTime(review.duration)}</span></div>
    <ol class="phase-list">${battingPhases.map(({key,label},index)=>{
      const time=marks[key];
      const set=time!==undefined;
      return `<li data-marker-phase="${key}"><div class="phase-name"><span class="phase-dot" data-phase-dot="${index}"></span><h4>${label}</h4></div>
        <div class="phase-actions">${set ? `<button type="button" class="time-chip" data-action="jump-video" data-time="${time}" aria-label="Jump to ${label.toLowerCase()}" ${available?'':'disabled'}>${markerTime(time)}</button>` : '<span class="phase-unset">Unmarked</span>'}
        ${set ? iconButton(`Edit ${label.toLowerCase()} marker`,'edit','edit-marker',`data-phase="${key}"`) + iconButton(`Remove ${label.toLowerCase()} marker`,'trash','remove-marker',`data-phase="${key}"`)
          : button(`Set ${label.toLowerCase()} marker`,{action:'edit-marker',glyph:'plus',variant:'subtle',attrs:`data-phase="${key}" ${available?'':'disabled'}`})}</div></li>`;
    }).join('')}</ol>
  </section>`;
}

export function videoView(data, reviewId, files, pending, comparison) {
  const review = getReview(data,reviewId);
  const isStory = reviewId === storyboardId;
  const file = files.get(reviewId);
  const available = isStory || file;
  const comparing = comparison.open;
  const choices = [[storyboardId,'Schematic demo'],...data.videos.filter(item => item.id !== storyboardId).map(item=>[item.id,item.title])];
  return `${pageHead('VIDEO LAB',comparing?'Compare batting clips':'Review a batting moment',comparing?'Match two shots at the same phase and move through them together.':'Mark batting phases, review a frame and record what you can see.',
    comparing?'':button('Open local video',{action:'open-video-file',glyph:'upload',variant:'primary',attrs:pending?'disabled':''}))}
    <div class="tab-strip" aria-label="Video Lab modes">${button('Review clip',{action:'video-review',glyph:'video',variant:comparing?'tab':'tab active',attrs:`aria-pressed="${!comparing}"`})}
      ${button('Compare clips',{action:'video-compare',glyph:'activity',variant:comparing?'tab active':'tab',attrs:`aria-pressed="${comparing}"`})}</div>
    <input class="sr-only" id="video-file" type="file" accept="video/mp4,video/webm,.mp4,.webm" tabindex="-1" aria-label="Open local video"><p id="video-load-message" class="upload-message" role="status">${pending?'Checking local video…':''}</p>
    ${comparing?comparisonView(data,files,comparison,pending):`<div class="video-grid"><section class="panel video-panel">${panelHead('Playback','Local media and schematic review',tag(isStory?'Schematic':file?'Local file':'Media needed',isStory?'violet':'lime'))}
      ${select('review','Clip or storyboard',choices,reviewId,'','id="review-select"')}
      <div class="player-stage" id="player-stage">${isStory ? schematic() : file ? `<video id="video-element" src="${e(file.url)}" controls playsinline preload="metadata" aria-label="Local batting video"></video>` :
        empty('film','Reselect the local file','Your notes are saved. Choose the original file to reopen this clip.',button('Reselect original',{action:'open-video-file',glyph:'upload',variant:'primary'}))}</div>
      ${available ? `<div class="playback"><label><span class="sr-only">Playback position in seconds</span><input id="video-position" type="range" min="0" max="${review.duration}" step="0.01" value="0"></label>
        <div class="playback-row"><div class="button-row compact"><button id="video-play" class="icon-btn" type="button" aria-label="Play">${icon('play',17)}</button><button id="video-back" type="button" class="btn outline" aria-label="Back 0.1 seconds">−0.1s</button><button id="video-forward" type="button" class="btn outline" aria-label="Forward 0.1 seconds">+0.1s</button><output id="video-time" class="timecode">0:00.0 / ${timeLabel(review.duration)}</output></div>
        <div class="button-row compact"><label class="speed"><span class="sr-only">Playback speed</span><select id="video-speed" aria-label="Playback speed"><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>${iconButton('Freeze and capture frame','camera','capture-frame')}</div></div>
      ${isStory ? `<div class="story-steps" aria-label="Storyboard moments">${steps.map((label,i)=>button(label,{action:'jump-video',variant:'subtle',attrs:`data-time="${i===4?5:i}"`})).join('')}</div>` : ''}</div>` : ''}
      <p class="video-privacy">${icon('shield',17)} ${isStory ? 'Illustrative sequence. You can practise making timestamped notes here.' : 'Your video stays local. Clip metadata and notes are saved in this browser.'}</p>
    </section><div class="video-review-sidebar">${!isStory && review ? timelineView(review,Boolean(file)) : ''}
    <section class="panel notes-panel">${panelHead('Timestamped observations',`${review?.notes.length || 0} saved · ${isStory ? 'schematic review' : 'manual review'}`)}
      ${button('Add observation',{action:'new-note',glyph:'plus',variant:'primary',attrs:!available?'disabled':''})}
      ${review?.notes.length ? `<ul class="notes-list">${[...review.notes].sort((a,b)=>a.time-b.time).map(note=>`<li><div class="note-head">
        <button type="button" class="time-chip" data-action="jump-video" data-time="${note.time}" ${!available?'disabled':''}>${timeLabel(note.time)}</button>${tag(note.event)}
        ${iconButton('Edit observation','edit','edit-note',`data-id="${e(note.id)}"`)}${iconButton('Delete observation','trash','delete-note',`data-id="${e(note.id)}"`)}</div>
        <strong>${e(note.kind)}</strong>${note.source===poseNoteSource ? tag('AI pose estimate','amber') : ''}<p>${e(note.text)}</p><label class="check"><input type="checkbox" data-note-select="${e(note.id)}" ${note.selected?'checked':''}> Use in practice plan</label></li>`).join('')}</ul>` : `<p class="muted notes-empty">Pause at a moment worth revisiting. A short description and timestamp are enough to start.</p>`}
      ${isStory || !file ? `<div class="callout">${icon('info',18)}<p>Open a real local video to use AI pose review.</p></div>` : ''}
      ${review && !isStory ? button('Remove clip and notes',{action:'delete-review',variant:'subtle',glyph:'trash'}) : ''}
    </section></div></div>${file && !isStory ? poseReviewPanel() : ''}`}`;
}

export function setupPlayback(review, memory, onError) {
  const video = document.querySelector('#video-element');
  const svg = document.querySelector('#schematic');
  if (!video && !svg) return null;
  const slider = document.querySelector('#video-position');
  const timeOutput = document.querySelector('#video-time');
  const playButton = document.querySelector('#video-play');
  const speedInput = document.querySelector('#video-speed');
  const battingPlayhead = document.querySelector('[data-batting-playhead]');
  const body = svg?.querySelector('#story-body');
  const arms = svg?.querySelector('#story-arms');
  const bat = svg?.querySelector('#story-bat');
  const ball = svg?.querySelector('#story-ball');
  const label = svg?.querySelector('#story-step');
  const duration = review.duration;
  let current = Math.max(0,Math.min(duration,memory.time || 0));
  let speed = memory.speed || 1;
  let playing = false;
  let animation = 0;
  let tick = 0;
  speedInput.value = String(speed).replace(/^0\./,'.');

  function showPose(time) {
    const positions = [[353,179,-20],[343,168,-149],[354,171,-72],[370,180,-48],[370,145,154]];
    const u = Math.min(4,time <= 3 ? time : 3+(time-3)/2);
    const index = Math.floor(u);
    const mix = (a,b) => a + (b-a)*(u-index);
    const [x,y,angle] = positions[index].map((v,i)=>mix(v,positions[Math.min(4,index+1)][i]));
    const ms = Math.min(1,time/3);
    body.setAttribute('d',`M326 141 318 206M318 204l-24 42-3 35m27-77 29 37 ${19+time*2} 40`);
    arms.setAttribute('d',`M324 150l14 29 ${x-338} ${y-179}m${325-x} ${158-y}-9 23 ${x-316} ${y-181}`);
    bat.setAttribute('transform',`translate(${x} ${y}) rotate(${angle})`);
    ball.setAttribute('transform',`translate(${time<=3?602-155*ms:447+(time-3)*59} ${time<=3?245+27*Math.sin(ms*Math.PI):245-(time-3)*49})`);
    const phase = steps[Math.min(4,Math.round(u))];
    if (label.textContent !== phase) label.textContent = phase;
  }

  function display() {
    slider.value = current;
    timeOutput.value = `${timeLabel(current)} / ${timeLabel(duration)}`;
    if (battingPlayhead) battingPlayhead.style.setProperty('--at',`${current/duration*100}%`);
    if (svg) showPose(current);
    memory.time = current;
  }

  function setPlaying(value) {
    playing = value;
    playButton.setAttribute('aria-label',value?'Pause':'Play');
    playButton.innerHTML = icon(value?'pause':'play',17);
  }

  function seek(value) {
    current = Math.min(duration,Math.max(0,value));
    if (video && video.readyState >= 1) video.currentTime = current;
    display();
  }

  function frame(now) {
    if (!playing) return;
    if (tick) current = Math.min(duration,current+(now-tick)/1000*speed);
    tick = now;
    display();
    if (current < duration) animation = requestAnimationFrame(frame);
    else setPlaying(false);
  }

  function pause() {
    if (video) video.pause();
    else { cancelAnimationFrame(animation); setPlaying(false); }
  }

  playButton.addEventListener('click',() => {
    if (playing) return pause();
    if (current >= duration) seek(0);
    if (video) video.play().catch(() => onError('The browser could not play this clip. Try another MP4 or WebM.'));
    else { tick = 0; setPlaying(true); animation = requestAnimationFrame(frame); }
  });
  slider.addEventListener('input',() => seek(+slider.value));
  document.querySelector('#video-back').onclick = () => {pause(); seek(current-.1);};
  document.querySelector('#video-forward').onclick = () => {pause(); seek(current+.1);};
  speedInput.onchange = () => {speed = +speedInput.value; memory.speed = speed; if (video) video.playbackRate = speed;};
  if (video) {
    const initialize = () => {video.playbackRate = speed; if (current) seek(current);};
    if (video.readyState >= 1) initialize();
    else video.addEventListener('loadedmetadata',initialize,{once:true});
    video.onplay = () => setPlaying(true);
    video.onpause = () => setPlaying(false);
    video.ontimeupdate = () => {current = video.currentTime; display();};
    video.onerror = () => onError('The browser could not open this clip. Try a different encoding.');
  }
  display();
  return {seek, pause, time:() => video?.currentTime ?? current, dispose:pause, async capture() {
    pause();
    if (svg) return {data:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`, ext:'svg'};
    if (!video || video.readyState < 2 || !video.videoWidth) throw new Error('Wait for the video frame to finish loading.');
    if (video.seeking) {
      await new Promise((resolve,reject) => {
        const timeout = setTimeout(() => reject(new Error('The frame is still loading. Try capturing it again.')),2500);
        video.addEventListener('seeked',() => {clearTimeout(timeout); resolve();},{once:true});
      });
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1280,video.videoWidth);
    canvas.height = Math.round(canvas.width*video.videoHeight/video.videoWidth);
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    return {data:canvas.toDataURL('image/png'),ext:'png'};
  }};
}

export async function inspectVideo(file) {
  if (!/\.(mp4|webm)$/i.test(file.name)) throw new Error('Choose an MP4 or WebM video.');
  const url = URL.createObjectURL(file);
  const probe = document.createElement('video');
  probe.preload = 'metadata';
  try {
    const duration = await new Promise((resolve,reject) => {
      const timeout = setTimeout(() => reject(new Error('The clip took too long to open. Try a smaller local file.')),12000);
      probe.onloadedmetadata = () => {clearTimeout(timeout); resolve(probe.duration);};
      probe.onerror = () => {clearTimeout(timeout); reject(new Error('This browser could not decode the file. Try a different MP4 or WebM.'));};
      probe.src = url;
    });
    if (!Number.isFinite(duration) || duration <= 0 || !probe.videoWidth) throw new Error('Choose a video with a finite duration and a picture.');
    return {url,duration};
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    probe.removeAttribute('src');
    probe.load();
  }
}
