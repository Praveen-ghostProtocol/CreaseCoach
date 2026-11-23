import { compareSessions, sensorSessions } from './domain.js';
import { escapeHtml as e, icon, panelHead, select, tag } from './ui.js';
import { createRenderer, views } from './motion-scene.js';

export function mountMotion(root, included, onInclude) {
  const [a,b] = sensorSessions;
  root.innerHTML = `${panelHead('Bat Motion Explorer','Compare two illustrative swings from synthetic samples.',tag('Simulated','violet'))}
    <div class="motion-layout"><div><div class="motion-stage" tabindex="0" aria-label="Swing viewer. Use arrow keys to rotate and plus or minus to zoom."><div class="motion-surface"></div><span class="motion-indicator"></span></div>
    <div class="motion-controls"><div class="motion-tools" aria-label="Camera controls">${Object.keys(views).map(view=>`<button type="button" class="btn outline" data-camera="${view}">${view==='reset'?'Reset view':view[0].toUpperCase()+view.slice(1)}</button>`).join('')}
    <button type="button" class="icon-btn" data-zoom="-.12" aria-label="Zoom out">−</button><button type="button" class="icon-btn" data-zoom=".12" aria-label="Zoom in">+</button></div>
    <label><span class="sr-only">Swing progress in seconds</span><input id="motion-progress" type="range" min="0" max="${a.duration}" step="0.005" value="0"></label>
    <div class="playback-row"><div class="button-row compact"><button type="button" class="btn primary" id="motion-play">${icon('play',17)} <span>Play swing</span></button><output id="motion-time" class="timecode"></output></div>
    <label class="speed"><span class="sr-only">Swing playback speed</span><select id="motion-speed" aria-label="Swing playback speed"><option value=".25">0.25×</option><option value=".5" selected>0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label></div></div></div>
    <aside class="motion-data">${select('motion-session','Motion sample',sensorSessions.map(item=>[item.id,item.label]),a.id,'','id="motion-session"')}
    <p class="motion-comparison" id="motion-shot"></p><dl class="metric-list" id="motion-metrics" aria-live="polite"></dl>
    <label class="check"><input id="motion-ghost" type="checkbox"> Overlay the other session</label>
    <p class="motion-comparison" id="motion-comparison"></p>
    <label class="check"><input id="motion-include" type="checkbox" ${included?'checked':''}> Include simulated comparison in plan</label></aside></div>
    <div class="callout">${icon('info',18)}<p><strong>Simulated sensor measurements — no physical sensor connected.</strong> The bat follows a predefined synthetic sequence. The model is independent of uploaded footage and represents illustrative bat motion only.</p></div>
    <details><summary>How a future bat sensor would work</summary><p class="muted">An accelerometer and gyroscope mounted on the bat would sample motion. Calibration and processing could estimate orientation and derive descriptive metrics. Compare the same shot and similar feeds, then bring uncertain observations to a coach.</p></details>`;

  const stage = root.querySelector('.motion-stage');
  const surface = root.querySelector('.motion-surface');
  const indicator = root.querySelector('.motion-indicator');
  const slider = root.querySelector('#motion-progress');
  const currentTime = root.querySelector('#motion-time');
  const play = root.querySelector('#motion-play');
  const speed = root.querySelector('#motion-speed');
  const sessionInput = root.querySelector('#motion-session');
  const ghostInput = root.querySelector('#motion-ghost');
  const camera = {azimuth:views.reset[0],elevation:views.reset[1],zoom:1};
  let session = a;
  let time = 0;
  let running = false;
  let last = 0;
  let animation;
  let pointer;
  let renderer = createRenderer(surface,next => {
    renderer.dispose(); renderer = next; indicator.textContent = renderer.mode; paint();
  });
  indicator.textContent = renderer.mode;

  function paint() {
    renderer.draw(camera,session,time,ghostInput.checked?(session===a?b:a):null);
    currentTime.value = `${time.toFixed(2)} / ${session.duration.toFixed(2)} s`;
    slider.value = time;
  }

  function setMetrics() {
    const other = session===a?b:a;
    root.querySelector('#motion-shot').textContent = `${session.shot} · ${session.condition}`;
    root.querySelector('#motion-metrics').innerHTML = [
      ['Swing duration',`${session.duration.toFixed(2)} s`],['Peak swing-axis speed',`${session.peak} °/s`],['Swing-axis change',`${session.orientation}°`],
    ].map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('');
    const comparison = compareSessions(session,other);
    root.querySelector('#motion-comparison').textContent = comparison.comparable
      ? `${other.label} vs ${session.label}: ${comparison.duration>0?'+':''}${comparison.duration.toFixed(2)} s, ${comparison.peak>0?'+':''}${comparison.peak} °/s. Same simulated shot and feed.`
      : 'These sessions use different shots or conditions. Compare within similar practice conditions.';
  }

  function toggle(value) {
    running = value;
    play.innerHTML = `${icon(value?'pause':'play',17)} <span>${value?'Pause swing':'Play swing'}</span>`;
    if (!running) {cancelAnimationFrame(animation); return;}
    last = 0;
    animation = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (last) time = Math.min(session.duration,time+(now-last)*Number(speed.value)/1000);
    last = now;
    paint();
    if (time>=session.duration) toggle(false);
    else animation = requestAnimationFrame(tick);
  }

  function orbit(dx,dy) {
    camera.azimuth+=dx;
    camera.elevation=Math.max(-.18,Math.min(1.35,camera.elevation+dy));
    paint();
  }

  function zoom(delta) {
    camera.zoom=Math.max(.73,Math.min(1.5,camera.zoom+delta));
    paint();
  }

  stage.onpointerdown = event => {
    if (event.button!==0) return;
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY};
    stage.setPointerCapture(event.pointerId);
  };
  stage.onpointermove = event => {
    if (pointer?.id!==event.pointerId) return;
    orbit((pointer.x-event.clientX)*.011,(event.clientY-pointer.y)*.011);
    pointer.x=event.clientX; pointer.y=event.clientY;
  };
  stage.onlostpointercapture = () => {pointer=null;};
  stage.onkeydown = event => {
    const keys = {ArrowLeft:[.14,0],ArrowRight:[-.14,0],ArrowUp:[0,.14],ArrowDown:[0,-.14]};
    if (keys[event.key]) {event.preventDefault(); orbit(...keys[event.key]);}
    if (['+','=','-'].includes(event.key)) {event.preventDefault(); zoom(event.key==='-'?-.12:.12);}
  };
  root.querySelectorAll('[data-camera]').forEach(button=>button.onclick = () => {
    [camera.azimuth,camera.elevation] = views[button.dataset.camera];
    if (button.dataset.camera==='reset') camera.zoom=1;
    paint();
  });
  root.querySelectorAll('[data-zoom]').forEach(button=>button.onclick = () => zoom(Number(button.dataset.zoom)));
  play.onclick = () => {if (!running && time>=session.duration) time=0; toggle(!running);};
  slider.oninput = () => {time=Number(slider.value); paint();};
  sessionInput.onchange = () => {
    const progress = time/session.duration;
    session=sensorSessions.find(item=>item.id===sessionInput.value) || a;
    time=progress*session.duration;
    slider.max=session.duration;
    setMetrics(); paint();
  };
  ghostInput.onchange = paint;
  root.querySelector('#motion-include').onchange = event => onInclude(event.target.checked);
  const resize = new ResizeObserver(paint);
  resize.observe(surface);
  setMetrics(); paint();

  return () => {cancelAnimationFrame(animation); resize.disconnect(); renderer.dispose();};
}
