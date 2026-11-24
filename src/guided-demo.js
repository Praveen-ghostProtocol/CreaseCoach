import { demoVideoSource, makeDemo, planEvidence, suggestPlan } from './domain.js';
import { comparisonDemoClips, demoClipPath } from './demo-clips.js';
import { mountSensorSession } from './sensor-session-view.js';
import { button, iconButton } from './ui.js';
import { mountComparison } from './video-compare.js';
import { videoView } from './video.js';
import { insights, log, plan } from './views.js';

const [left,right] = comparisonDemoClips;
const comparison = {open:true,left:left.id,right:right.id,phase:'downswing',speed:.5};
const objective = 'For ten similar feeds, mark the downswing and record whether the ball appears level with or below the blade.';
const savedId = 'guided-practice';
const steps = [
  {title:'Record the innings',screen:'Performance Log',target:'.record-table',
    cue:'Point to one innings. Arjun recorded the outcome and his attempted shot while he could still remember them.',view:data=>log(data,{})},
  {title:'Find a pattern',screen:'Performance Insights',target:'.evidence-panel',
    cue:'Point to three catches in five dismissals. The sixth innings was a not-out. The count gives Arjun a question to investigate.',view:data=>insights(data,{},'patterns')},
  {title:'Compare the same phase',screen:'Video Lab',target:'.compare-panel',compact:true,
    cue:'Two separate net attempts meet at Downswing. Point to the ball near the blade in A and below it in B.',view:(data,media)=>videoView(data,left.id,media.files,media.pending?'demo':false,comparison)},
  {title:'Keep the observation',screen:'Video Lab',target:'.notes-panel',
    cue:'Point to the Clip B observation and its timestamp. A timestamp lets the batter reopen the frame later.',view:(data,media)=>videoView(data,right.id,media.files,media.pending?'demo':false,{open:false})},
  {title:'Choose what to practise',screen:'Next Session Plan',target:'#plan-form .field:has([name="objective"]), .desktop-evidence, .mobile-evidence',
    cue:'Point to the objective and Evidence when saved. The batter can repeat ten similar feeds and reopen the original observation.',view:data=>plan(data,savedId)},
  {title:'Preview sensor feedback',screen:'Sensor Session',target:'#sensor-session',
    cue:'The readings are simulated. A future bat-mounted sensor would need calibration and comparison with reference recordings.',view:data=>insights(data,{},'sensor')},
];

export const guidedStepCount = steps.length;

export function prepareGuidedMedia(onUpdate) {
  const controller=new AbortController();
  const files=new Map();
  const media={files,pending:true,failed:false,dispose(){
    controller.abort();
    for (const {url} of files.values()) URL.revokeObjectURL(url);
    files.clear();
  }};
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);
  Promise.allSettled(comparisonDemoClips.map(async clip=>{
    const response=await fetch(demoClipPath(clip),{signal});
    if (!response.ok) throw new Error('Clip unavailable.');
    return {id:clip.id,blob:await response.blob()};
  })).then(results=>{
    if (controller.signal.aborted) return;
    media.pending=false;
    media.failed=results.some(result=>result.status==='rejected');
    for (const result of results) {
      if (result.status==='fulfilled') files.set(result.value.id,{url:URL.createObjectURL(result.value.blob)});
    }
    onUpdate();
  });
  return media;
}

function demoWorkspace() {
  const data = makeDemo();
  // Both bundled net excerpts have a two-second media duration.
  for (const clip of comparisonDemoClips) {
    data.videos.push({...clip,source:demoVideoSource,duration:2,notes:[]});
  }
  const review = data.videos.find(clip=>clip.id===right.id);
  review.notes.push({id:'guided-observation',time:right.markers.downswing,text:'At the marked downswing, the ball appears below the blade.',
    event:'Downswing',kind:'Direct observation',selected:true});
  const suggestion = suggestPlan(data,'repeat');
  data.plans.push({...suggestion,id:savedId,created:'2026-11-22',objective,
    criterion:'Record where the ball appears relative to the blade on each feed.',reflection:'',complete:false,
    evidence:planEvidence(data).filter(row=>row.id==='guided-observation')});
  return data;
}

function mountSpotlight(root, selector) {
  const outline = root.querySelector('.guided-spotlight');
  const bar = root.querySelector('.guided-controls');
  const targets = [...root.querySelectorAll(selector)];
  let frame;

  function position() {
    const rects = targets.map(el=>el.getBoundingClientRect()).filter(rect=>rect.width && rect.height);
    if (!rects.length) { outline.hidden=true; return; }
    const bounds = {
      top:Math.max(3,Math.min(...rects.map(rect=>rect.top))-5),
      left:Math.max(3,Math.min(...rects.map(rect=>rect.left))-5),
      right:Math.min(document.documentElement.clientWidth-3,Math.max(...rects.map(rect=>rect.right))+5),
      bottom:Math.min(bar.getBoundingClientRect().top-6,Math.max(...rects.map(rect=>rect.bottom))+5),
    };
    outline.hidden = bounds.bottom<=bounds.top || bounds.right<=bounds.left;
    Object.assign(outline.style,{top:`${bounds.top}px`,left:`${bounds.left}px`,
      width:`${bounds.right-bounds.left}px`,height:`${bounds.bottom-bounds.top}px`});
  }

  function schedule() {
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(position);
  }

  const observer=new ResizeObserver(schedule);
  targets.forEach(target=>observer.observe(target));
  observer.observe(bar);
  window.addEventListener('resize',schedule);
  window.addEventListener('scroll',schedule,{passive:true});
  const first=targets.find(target=>target.getClientRects().length);
  if (first && first.getBoundingClientRect().bottom>bar.getBoundingClientRect().top-10) {
    window.scrollTo(0,window.scrollY+first.getBoundingClientRect().top-24);
  }
  position();
  return ()=>{
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('resize',schedule);
    window.removeEventListener('scroll',schedule);
  };
}

export function mountGuidedDemo(root,index,media) {
  const step=steps[index];
  const data=demoWorkspace();
  root.innerHTML = `<main id="content" class="guided-content${step.compact?' guided-compare':''}" tabindex="-1" inert>${step.view(data,media)}</main>
    <div class="guided-spotlight" aria-hidden="true" hidden></div>
    <section class="guided-controls" aria-label="Guided demo">
      <div><p class="guided-step">Step ${index+1} of ${steps.length} · ${step.screen}</p><h2>${step.title}</h2><p>${step.compact && media.failed?'The clips could not load. Continue to the saved observation.':step.cue}</p></div>
      <div class="button-row compact">${step.compact?'<button type="button" class="btn outline" data-guided-play disabled>Play / reset clips</button>':''}
      ${button('Back',{action:'demo-prev',variant:'outline',attrs:index===0?'disabled':''})}
      ${button(index===steps.length-1?'Finish demo':'Next step',{action:'demo-next',glyph:'arrow',variant:'primary',trailing:true})}
      ${iconButton('Close guided demo','close','demo-close')}</div>
    </section>`;

  root.querySelector('.mobile-evidence')?.setAttribute('open','');
  let disposeScreen;
  const aligned=root.querySelector('[data-aligned]');
  if (aligned) {
    disposeScreen=mountComparison(aligned,()=>{});
    const play=root.querySelector('[data-guided-play]');
    const inner=aligned.querySelector('[data-compare-play]');
    const available=new MutationObserver(()=>{play.disabled=inner.disabled;});
    available.observe(inner,{attributes:true,attributeFilter:['disabled']});
    play.disabled=inner.disabled;
    play.addEventListener('click',()=>{
      const reset=aligned.querySelector('[data-compare-reset]');
      if (inner.textContent.trim()==='Pause both' || Number(aligned.querySelector('[data-compare-slider]').value)!==0) reset.click();
      else inner.click();
    });
    const teardown=disposeScreen;
    disposeScreen=()=>{available.disconnect();teardown();};
  }

  const video=root.querySelector('#video-element');
  if (video) {
    const seek=()=>{video.currentTime=right.markers.downswing;};
    if (video.readyState) seek();
    else video.addEventListener('loadedmetadata',seek,{once:true});
  }
  const sensor=root.querySelector('#sensor-session');
  if (sensor) {
    disposeScreen=mountSensorSession(sensor,undefined,()=>{},()=>{});
    sensor.querySelector('[data-sensor-start]').click();
  }
  window.scrollTo(0,0);
  const disposeSpotlight=mountSpotlight(root,step.target);
  root.querySelector('[data-action="demo-next"]').focus({preventScroll:true});
  return ()=>{disposeScreen?.();disposeSpotlight();};
}
