import { alignedTimes, alignment, battingPhases, clampOffset, markerTime, phaseByKey } from './batting-timeline.js';
import { button, empty, escapeHtml as e, icon, select } from './ui.js';
import { isBattingClip } from './domain.js';
import { compareDimensions } from './anthropometry-view.js';
import { demoClipById } from './demo-clips.js';

function compareClip(side,clip,file,choices,pending) {
  const label=side==='left'?'Clip A':'Clip B';
  const demo=demoClipById(clip?.id);
  const attrs=`data-side="${side}" ${pending?'disabled':''}`;
  return `<article class="compare-clip" data-clip="${side}">
    <div class="compare-clip-head">${select(side,label,choices,clip?.id,'Choose a clip',`id="compare-${side}" data-compare-clip`)}
    ${button(file?'Open another file':clip?'Reselect original':'Open local file',{action:'open-video-file',glyph:'upload',variant:'outline',attrs})}</div>
    <div class="compare-screen">${file ? `<video data-compare-player muted playsinline preload="auto" src="${e(file.url)}" aria-label="${label} playback"></video>`
    : empty('film',clip?'Video file needed':'Choose a clip',demo?'Load the comparison demo to reopen the sample clips.':clip?'Reselect the original file to view its saved markers.':'Open a local batting clip to fill this panel.')}</div>
    <div class="compare-clip-foot"><output class="timecode" data-clip-time aria-label="${label} video time">${clip?`Duration ${markerTime(clip.duration)}`:'—'}</output>
    ${clip?button('Edit markers',{action:'compare-edit-markers',glyph:'edit',variant:'subtle',attrs:`data-id="${e(clip.id)}" aria-label="Edit markers for ${label}"`}):''}</div>
    ${demo?`<p class="sample-credit">Practice footage by <a href="${e(demo.sourceUrl)}" target="_blank" rel="noopener noreferrer">${e(demo.author)}</a> on Pexels.</p>`:''}
    ${clip?compareDimensions(clip,label):''}
  </article>`;
}

export function comparisonView(data,files,choice,pending) {
  const clips=data.videos.filter(isBattingClip);
  const left=clips.find(clip=>clip.id===choice.left);
  const right=clips.find(clip=>clip.id===choice.right);
  const leftFile=files.get(left?.id);
  const rightFile=files.get(right?.id);
  const phases=battingPhases.map(phase=>({...phase,range:alignment(left,right,phase.key)}));
  const selected=phases.find(phase=>phase.key===choice.phase && phase.range) || phases.find(phase=>phase.range);
  const range=selected?.range;
  const ready=leftFile && rightFile && range;
  const clipOptions=other=>clips.filter(clip=>clip.id!==other?.id).map(clip=>[clip.id,clip.title]);
  return `<section class="panel compare-panel" aria-label="Side-by-side playback"${ready?` data-aligned data-left-time="${range.left}" data-right-time="${range.right}" data-start="${range.start}" data-end="${range.end}"`:''}>
    <div class="compare-toolbar">
    <div class="compare-phase-row"><label class="field"><span>Align at marker</span><select id="compare-phase" data-compare-phase ${!selected?'disabled':''}>
      ${!selected?'<option value="">Choose a marker on both clips</option>':''}
      ${phases.map(phase=>`<option value="${phase.key}" ${selected?.key===phase.key?'selected':''} ${!phase.range?'disabled':''}>${phase.label}${phase.range?'':' · missing on one or both clips'}</option>`).join('')}</select></label>
      ${range?`<p><strong>${phaseByKey(selected.key).label}</strong> · A ${markerTime(range.left)} · B ${markerTime(range.right)}</p>`:'<p>Set the same phase on both clips to align them.</p>'}</div>
    ${ready?`<div class="compare-transport"><div class="compare-axis"><span>${range.start<0?`${Math.abs(range.start).toFixed(2)} s before marker`:'At marker'}</span><span>${range.end>0?`${range.end.toFixed(2)} s after marker`:'At marker'}</span></div>
      <label class="compare-scrubber" style="--zero:${range.end>range.start?-range.start/(range.end-range.start)*100:0}%"><span class="sr-only">Time relative to the shared marker</span><input data-compare-slider type="range" min="${range.start}" max="${range.end}" step="any" value="0" disabled><i aria-hidden="true"></i></label>
      <div class="compare-controls"><div class="button-row compact"><button type="button" class="btn primary" data-compare-play disabled>${icon('play',17)} Play both</button>
        <button type="button" class="btn outline" data-compare-step="-.1" aria-label="Step both back 0.1 seconds" disabled>−0.1s</button>
        <button type="button" class="btn outline" data-compare-step=".1" aria-label="Step both forward 0.1 seconds" disabled>+0.1s</button>
        <button type="button" class="btn outline" data-compare-reset disabled>Go to marker</button></div>
        <div class="button-row compact"><output class="timecode" data-compare-offset>At marker</output><label class="speed"><span class="sr-only">Comparison playback speed</span><select data-compare-speed aria-label="Comparison playback speed">${[.25,.5,1].map(rate=>`<option value="${String(rate).replace(/^0\./,'.')}" ${choice.speed===rate?'selected':''}>${rate}×</option>`).join('')}</select></label></div></div>
      <p class="muted compare-status" role="status" data-compare-status>Loading both clips…</p></div>`:''}</div>
    <div class="compare-grid">${compareClip('left',left,leftFile,clipOptions(right),pending)}${compareClip('right',right,rightFile,clipOptions(left),pending)}</div>
  </section>`;
}

export function mountComparison(root,onSpeed) {
  const range={left:+root.dataset.leftTime,right:+root.dataset.rightTime,start:+root.dataset.start,end:+root.dataset.end};
  const videos=[...root.querySelectorAll('[data-compare-player]')];
  const clocks=[...root.querySelectorAll('[data-clip-time]')];
  const slider=root.querySelector('[data-compare-slider]');
  const offsetDisplay=root.querySelector('[data-compare-offset]');
  const play=root.querySelector('[data-compare-play]');
  const speed=root.querySelector('[data-compare-speed]');
  const status=root.querySelector('[data-compare-status]');
  let offset=0;
  let animation=0;
  let ready=false;
  let running=false;
  let generation=0;
  let failed=false;
  const hasRange=range.end-range.start>=.01;

  function paint() {
    slider.value=offset;
    offsetDisplay.value=Math.abs(offset)<.005?'At marker':`${offset<0?'−':'+'}${Math.abs(offset).toFixed(2)} s`;
    alignedTimes(range,offset).forEach((time,index)=>{clocks[index].value=markerTime(time);});
  }

  function seek(value) {
    offset=clampOffset(range,value);
    alignedTimes(range,offset).forEach((time,index)=>{videos[index].currentTime=time;});
    paint();
  }

  function setRunning(value) {
    running=value;
    play.innerHTML=`${icon(value?'pause':'play',17)} ${value?'Pause both':'Play both'}`;
  }

  function pause() {
    generation++;
    videos.forEach(video=>video.pause());
    cancelAnimationFrame(animation);
    setRunning(false);
  }

  function tick() {
    if (!running) return;
    offset=clampOffset(range,videos[0].currentTime-range.left);
    if (offset>=range.end-.005 || videos.some(video=>video.ended)) {
      pause(); seek(range.end); return;
    }
    const target=range.right+offset;
    if (!videos[1].seeking && Math.abs(videos[1].currentTime-target)>.12) videos[1].currentTime=target;
    paint();
    animation=requestAnimationFrame(tick);
  }

  function enable() {
    if (ready || failed || !videos.every(video=>video.readyState>=1)) return;
    ready=true;
    seek(0);
    slider.disabled=!hasRange;
    play.disabled=!hasRange;
    for (const control of root.querySelectorAll('[data-compare-step], [data-compare-reset]')) control.disabled=!hasRange;
    status.textContent=hasRange?'Both clips are aligned at the selected marker.':'The selected markers share this frame pair only.';
  }

  for (const video of videos) {
    video.addEventListener('loadedmetadata',enable,{once:true});
    video.addEventListener('error',()=>{
      failed=true;
      pause();
      for (const control of root.querySelectorAll('[data-compare-slider], [data-compare-step], [data-compare-reset], [data-compare-play]')) control.disabled=true;
      status.textContent='A clip could not be decoded. Open another MP4 or WebM.';
    });
  }

  slider.addEventListener('input',()=>{pause();seek(Number(slider.value));});
  root.querySelectorAll('[data-compare-step]').forEach(control=>control.onclick=()=>{pause();seek(offset+Number(control.dataset.compareStep));});
  root.querySelector('[data-compare-reset]').onclick=()=>{pause();seek(0);};
  const applySpeed=()=>{videos.forEach(video=>{video.playbackRate=Number(speed.value);});};
  speed.onchange=()=>{applySpeed();onSpeed(Number(speed.value));};
  applySpeed();
  play.onclick=async () => {
    if (running) {pause();return;}
    if (offset>=range.end-.005) seek(range.start);
    const request=++generation;
    setRunning(true);
    try {
      await Promise.all(videos.map(video=>video.play()));
      if (generation===request) animation=requestAnimationFrame(tick);
    } catch {
      if (generation!==request) return;
      pause();
      status.textContent='Playback could not start. Try stepping through the clips.';
    }
  };
  enable();
  return pause;
}
