import { poseConnections, poseSampleTimes, summarizePose } from './pose-math.js';
import { button, escapeHtml as e, icon, panelHead, tag, timeLabel } from './ui.js';

const runtime = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32';
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const skeletonPoints = [...new Set(poseConnections.flat())];
let sharedModel;

async function getModel() {
  sharedModel ||= (async () => {
    const {FilesetResolver,PoseLandmarker} = await import(`${runtime}/vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${runtime}/wasm`);
    return PoseLandmarker.createFromOptions(files,{
      baseOptions:{modelAssetPath:modelUrl,delegate:'CPU'}, runningMode:'IMAGE', numPoses:1,
    });
  })().catch(error=>{
    sharedModel = null;
    throw error;
  });
  return sharedModel;
}

function waitForFrame(video,at,signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve,reject) => {
    const events = ['loadeddata','seeked','canplay'];
    const cleanup = () => {
      clearTimeout(timeout);
      events.forEach(name=>video.removeEventListener(name,check));
      video.removeEventListener('error',mediaError);
      signal.removeEventListener('abort',abort);
    };
    const check = () => {
      if (video.readyState>=2 && !video.seeking && Math.abs(video.currentTime-at)<.04) {cleanup();resolve();}
    };
    const fail = error => {cleanup();reject(error);};
    const mediaError = () => fail(new Error('The browser could not decode this video frame.'));
    const abort = () => fail(signal.reason);
    const timeout = setTimeout(()=>fail(new Error('A video frame could not be read in time. Try a shorter MP4 or WebM.')),8000);
    events.forEach(name=>video.addEventListener(name,check));
    video.addEventListener('error',mediaError,{once:true});
    signal.addEventListener('abort',abort,{once:true});
    if (video.readyState>=1 && Math.abs(video.currentTime-at)>.001) video.currentTime=at;
    check();
  });
}

async function analyze(source,center,duration,signal,progress) {
  progress('Loading the pose model…');
  let model;
  try {model = await getModel();}
  catch {throw new Error('The pose model could not load. Check your connection and browser, then try again.');}
  signal.throwIfAborted();
  const video = document.createElement('video');
  video.preload='auto';
  video.muted=true;
  video.playsInline=true;
  video.hidden=true;
  document.body.append(video);
  video.src=source;
  try {
    await waitForFrame(video,0,signal);
    const scale = Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
    canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    const context=canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot prepare images for pose analysis.');
    const times=poseSampleTimes(center,duration);
    const frames=[];
    for (const [index,time] of times.entries()) {
      progress(`Analyzing frame ${index+1} of ${times.length}…`);
      await new Promise(resolve=>setTimeout(resolve,0));
      signal.throwIfAborted();
      await waitForFrame(video,Math.min(time,Math.max(0,duration-.001)),signal);
      context.drawImage(video,0,0,canvas.width,canvas.height);
      const output=model.detect(canvas);
      const summary=summarizePose(output.landmarks[0] || [],canvas.width,canvas.height);
      frames.push({...summary,time,width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/jpeg',.82)});
    }
    return frames;
  } finally {
    video.removeAttribute('src');
    video.load();
    video.remove();
  }
}

const hasPose = frame => poseConnections.some(([a,b])=>frame.points[a] && frame.points[b]);

function overlay(frame) {
  const {width,height,points} = frame;
  const x = key => (points[key].x*width).toFixed(1);
  const y = key => (points[key].y*height).toFixed(1);
  const links = poseConnections.filter(([a,b])=>points[a] && points[b]);
  return `<svg class="pose-overlay" viewBox="0 0 ${width} ${height}" aria-hidden="true"><g stroke="#d6f779" stroke-width="2" stroke-linecap="round">
    ${links.map(([a,b])=>`<path vector-effect="non-scaling-stroke" d="M${x(a)} ${y(a)} L${x(b)} ${y(b)}"/>`).join('')}
    </g><g fill="#f6ffda" stroke="#19231a" stroke-width="1">${skeletonPoints.filter(key=>points[key]).map(key=>`<circle cx="${x(key)}" cy="${y(key)}" r="3.2"/>`).join('')}</g></svg>`;
}

function estimateText(frame) {
  const estimates=frame.angles.map(item=>`${item.label.toLowerCase()} ${item.degrees}°`).join(', ');
  return estimates ? `Pose model estimates in this camera view: ${estimates}. Check the overlay against the frame.`
    : 'The pose model marked some body landmarks in this frame. Check their placement against the footage.';
}

export function mountPoseReview(root, sourceVideo, playback, review, memory, onNote) {
  const message = root.querySelector('[data-pose-status]');
  const results = root.querySelector('[data-pose-results]');
  const start = root.querySelector('[data-run-pose]');
  let abort;
  let selection = memory.poseReview?.selection ?? 0;

  function draw(focusFrame = false) {
    const frames=memory.poseReview?.frames;
    if (!frames?.length) return;
    const frame=frames[selection];
    const found=hasPose(frame);
    const measurements=frame.angles.length ? `<dl class="metric-list">${frame.angles.map(item=>`<div><dt>${e(item.label)} in image</dt><dd>${item.degrees}°</dd></div>`).join('')}</dl>` : '';
    results.innerHTML=`<div class="pose-frames" aria-label="Analyzed frames">${frames.map((item,index)=>`<button type="button" class="btn outline" data-pose-index="${index}" aria-pressed="${index===selection}" aria-label="Review frame at ${item.time.toFixed(2)} seconds">${timeLabel(item.time)}</button>`).join('')}</div>
      <div class="pose-result"><figure class="pose-frame"><img src="${e(frame.image)}" width="${frame.width}" height="${frame.height}" alt="Video still at ${frame.time.toFixed(2)} seconds">${found?overlay(frame):''}</figure>
      <div>${panelHead(`Frame at ${frame.time.toFixed(2)} s`,'',tag(found?'Model estimate':'Limited visibility',found?'lime':'amber'))}
      ${found ? `<p class="muted">Check the marked joints against the footage before using the estimate.</p>${measurements}` : '<p class="muted">Too few body landmarks were visible. Try a frame with one batter clearly in view.</p>'}
      <div class="button-row">${button('Go to frame',{action:'jump-video',glyph:'arrow',variant:'outline',attrs:`data-time="${frame.time}"`})}${found?'<button type="button" class="btn primary" data-save-pose>Add pose note</button>':''}</div></div></div>`;
    if (focusFrame) results.querySelector(`[data-pose-index="${selection}"]`)?.focus({preventScroll:true});
  }

  results.onclick = event => {
    const tick=event.target.closest('[data-pose-index]');
    if (tick) {
      selection=Number(tick.dataset.poseIndex);
      memory.poseReview.selection=selection;
      draw(true);
    }
    if (event.target.closest('[data-save-pose]')) {
      const frame=memory.poseReview.frames[selection];
      onNote(frame.time,estimateText(frame));
    }
  };

  const cancel = root.querySelector('[data-cancel-pose]');
  cancel.onclick = () => abort?.abort();
  start.onclick = async () => {
    playback.pause();
    const center=playback.time();
    abort=new AbortController();
    const {signal}=abort;
    start.disabled=true;
    cancel.hidden=false;
    try {
      const frames=await analyze(sourceVideo.currentSrc||sourceVideo.src,center,review.duration,signal,text=>{message.textContent=text;});
      if (!root.isConnected || signal.aborted) return;
      const scored=frames.map((frame,index)=>({index,distance:Math.abs(frame.time-center),found:hasPose(frame)}));
      selection=scored.sort((a,b)=>Number(b.found)-Number(a.found)||a.distance-b.distance)[0].index;
      memory.poseReview={frames,selection};
      const count=frames.filter(hasPose).length;
      message.textContent=`Visible pose links in ${count} of ${frames.length} sampled frames.`;
      draw();
    } catch (error) {
      if (root.isConnected) message.textContent=signal.aborted?'Analysis cancelled.':error.message || 'This browser could not analyze the clip. Try a short local video.';
    } finally {
      start.disabled=false;
      cancel.hidden=true;
      abort=undefined;
    }
  };
  draw();
  return () => abort?.abort();
}

export function poseReviewPanel() {
  return `<section class="panel pose-panel" id="pose-review">${panelHead('AI pose review','Inspect the batter’s movement directly on the uploaded footage.',tag('On-device','lime'))}
    <div class="button-row"><button type="button" class="btn primary" data-run-pose>${icon('target',17)} Analyze around playhead</button>
    <button type="button" class="btn outline" data-cancel-pose hidden>Cancel analysis</button></div>
    <p class="muted pose-help">Pause near one batting moment. Up to seven nearby frames are sampled. The browser downloads the pose model on first use and keeps footage on this device.</p>
    <p class="pose-status" role="status" data-pose-status></p><div data-pose-results></div>
    <p class="pose-limits">Angles are rough 2D estimates affected by camera perspective and hidden joints.</p></section>`;
}
