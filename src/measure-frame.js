import { bodyMeasures, measureByKey, projectedLength } from './anthropometry.js';
import { markerTime } from './batting-timeline.js';
import { dialog, showDialog } from './dialogs.js';
import { button, escapeHtml as e, input, select } from './ui.js';

const instructions = ['Mark the first reference point.','Mark the second reference point.','Mark the first body point.','Mark the second body point.'];

export function frameMeasureDialog(clip,frame,time,onSave) {
  showDialog(`Measure on frame · ${markerTime(time)}`,`<form id="frame-measure-form" class="frame-measure-form">
    <p class="muted">Mark two endpoints on a known length, then two on the body dimension. Use a reference in the same front-facing plane.</p>
    <div class="frame-measure-grid"><figure class="measurement-scene" tabindex="0" aria-label="Measurement frame. Click to mark a point or use arrow keys and Enter.">
      <img src="${e(frame.data)}" alt="Selected local video frame"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></figure>
    <div>${select('dimension','Body dimension',bodyMeasures.map(({key,label})=>[key,label]),'upperArm','','aria-label="Body dimension"')}
      <p class="dimension-empty" data-measure-guide></p>
      ${input('reference','Reference object','',`maxlength="80" required placeholder="Measured ruler"`)}
      ${input('referenceCm','Known length (cm)','',`type="number" min="0.1" max="10000" step="any" inputmode="decimal" required`)}
      <p class="measure-progress" role="status"></p><output class="measure-estimate" aria-live="polite"></output>
      <button type="button" class="btn outline" data-undo-point disabled>Undo point</button></div></div>
    <p class="dimension-empty">The result is a 2D projection. Perspective and out-of-plane movement affect the estimate.</p>
    <p class="form-error" role="alert"></p><div class="button-row dialog-actions">${button('Cancel',{action:'close-dialog',variant:'outline'})}<button type="submit" class="btn primary" disabled>Save frame estimate</button></div></form>`);

  const form=dialog.querySelector('#frame-measure-form');
  const stage=form.querySelector('.measurement-scene');
  const surface=stage.querySelector('img');
  const overlay=stage.querySelector('svg');
  const progress=form.querySelector('.measure-progress');
  const output=form.querySelector('.measure-estimate');
  const submit=form.querySelector('[type=submit]');
  const undo=form.querySelector('[data-undo-point]');
  const guide=form.querySelector('[data-measure-guide]');
  const known=form.elements.referenceCm;
  const points=[];
  let cursor=null;

  const distance=(a,b)=>Math.hypot((b.x-a.x)*surface.naturalWidth,(b.y-a.y)*surface.naturalHeight);
  const xy=point=>`${(point.x*100).toFixed(2)} ${(point.y*100).toFixed(2)}`;
  const clamp=value=>Math.max(0,Math.min(1,value));
  const line=(index,kind)=>points[index+1]?`<path class="measure-line ${kind}" d="M${xy(points[index])} L${xy(points[index+1])}" vector-effect="non-scaling-stroke"/>`:'';

  function redraw() {
    overlay.innerHTML=`${line(0,'reference')}${line(2,'body')}${points.map((point,index)=>`<path class="measure-point ${index<2?'reference':'body'}" d="M${xy(point)}h.01" vector-effect="non-scaling-stroke"/>`).join('')}${cursor&&points.length<4?`<path class="measure-cursor" d="M${xy(cursor)}h.01" vector-effect="non-scaling-stroke"/>`:''}`;
    progress.textContent=instructions[points.length] || 'Four points marked.';
    guide.textContent=measureByKey(form.elements.dimension.value).guide;
    undo.disabled=points.length===0;
    output.value='';
    submit.disabled=true;
    if (points.length!==4 || !known.value || !surface.naturalWidth) return;
    try {
      const cm=projectedLength(Number(known.value),distance(points[0],points[1]),distance(points[2],points[3]));
      output.value=`≈ ${cm} cm projected`;
      submit.disabled=false;
    } catch (error) {output.value=error.message;}
  }

  function addPoint(point) {
    if (points.length===4 || !surface.naturalWidth) return;
    points.push(point);
    redraw();
  }

  stage.onclick=event=>{
    const rect=surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cursor=null;
    addPoint({x:clamp((event.clientX-rect.left)/rect.width),y:clamp((event.clientY-rect.top)/rect.height)});
  };
  stage.onkeydown=event=>{
    const movement={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (!movement && event.key!=='Enter' && event.key!==' ') return;
    event.preventDefault();
    cursor ||= {x:.5,y:.5};
    if (movement) {
      const step=event.shiftKey ? .05 : .01;
      cursor={x:clamp(cursor.x+movement[0]*step),y:clamp(cursor.y+movement[1]*step)};
      redraw();
    } else addPoint({...cursor});
  };
  undo.onclick=()=>{points.pop();redraw();};
  known.oninput=redraw;
  form.elements.dimension.onchange=redraw;
  surface.onload=redraw;
  form.onsubmit=event=>{
    event.preventDefault();
    if (points.length!==4) return;
    try {
      const key=form.elements.dimension.value;
      const reference=form.elements.reference.value.trim();
      if (!measureByKey(key) || !reference) throw new Error('Choose a body dimension and name the reference object.');
      const knownCm=Number(known.value);
      const referencePx=distance(points[0],points[1]);
      const targetPx=distance(points[2],points[3]);
      projectedLength(knownCm,referencePx,targetPx);
      onSave({key,reference,knownCm,referencePx,targetPx,time:Math.max(0,Math.min(time,clip.duration))});
    } catch (error) {form.querySelector('.form-error').textContent=error.message;}
  };
  redraw();
}
