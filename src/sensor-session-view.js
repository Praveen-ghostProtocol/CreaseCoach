import { newSensorSession, sampleSwings } from './sensor-session.js';
import { icon } from './ui.js';

const metrics = [
  ['Swings','count'],
  ['Mean swing duration','duration','ms'],
  ['Peak angular speed','rotation','°/s'],
  ['Peak acceleration','acceleration','g'],
];

function swingRow(swing, index, selected) {
  const number = index+1;
  return `<tr>
    <td><strong>Swing ${number}</strong><small>+${(swing.atMs/1000).toFixed(1)} s</small></td>
    <td data-label="Duration">${swing.durationMs} ms</td>
    <td data-label="Peak angular speed">${swing.rotationDps} °/s</td>
    <td data-label="Peak acceleration">${swing.accelerationG.toFixed(1)} g</td>
    <td class="row-actions"><label class="sensor-choice"><input type="radio" name="sensor-evidence" value="${index}" aria-label="Use swing ${number} in plan"${selected===index?' checked':''}><span>Use swing</span></label></td>
  </tr>`;
}

export function mountSensorSession(root, saved, onUpdate, onPlan) {
  let session = saved ?? newSensorSession();
  let timer;
  let running = false;

  root.innerHTML = `<div class="sensor-toolbar">
      <div class="button-row">
        <button class="btn primary" type="button" data-sensor-start>${icon('play',17)}<span>Start simulated session</span></button>
        <button class="btn outline" type="button" data-sensor-end>End session</button>
      </div>
      <p class="muted sensor-status" role="status"></p>
    </div>
    <div class="stat-grid sensor-metrics" aria-label="Session summary">${metrics.map(([label,key,unit]) =>
      `<div class="stat"><div>${label}</div><strong><span data-sensor-metric="${key}">—</span>${unit?` <small>${unit}</small>`:''}</strong></div>`).join('')}
    </div>
    <div class="sensor-evidence-head">
      <div><h2>Swing readings</h2><p class="muted">Choose a swing to carry its readings into a practice plan.</p></div>
      <div class="button-row">
        <button class="btn subtle" type="button" data-sensor-clear>Clear selection</button>
        <button class="btn outline" type="button" data-sensor-plan>${icon('target',17)}<span>Build a practice plan</span></button>
      </div>
    </div>
    <p class="muted" data-sensor-empty>Sample swings will appear here when you start.</p>
    <table class="record-table" aria-label="Simulated swing readings">
      <thead><tr><th scope="col">Swing</th><th scope="col">Duration</th><th scope="col">Peak angular speed</th><th scope="col">Peak acceleration</th><th scope="col"><span class="sr-only">Use in plan</span></th></tr></thead>
      <tbody></tbody>
    </table>
    <details class="sensor-hardware"><summary>What would a physical sensor need?</summary>
      <p>A securely mounted accelerometer and gyroscope would record timestamped motion. Swing detection would estimate duration and summarise each swing’s peak angular speed and acceleration. A wireless link could feed those events into this view.</p>
      <p>We would calibrate the mounting orientation and check swing timing and readings against a reference before using them for coaching. Video and body measurements provide the context for interpreting any differences.</p>
    </details>`;

  const start = root.querySelector('[data-sensor-start]');
  const end = root.querySelector('[data-sensor-end]');
  const plan = root.querySelector('[data-sensor-plan]');
  const clear = root.querySelector('[data-sensor-clear]');
  const empty = root.querySelector('[data-sensor-empty]');
  const table = root.querySelector('table');
  const rows = table.tBodies[0];
  const status = root.querySelector('[role="status"]');
  const figures = Object.fromEntries([...root.querySelectorAll('[data-sensor-metric]')].map(node=>[node.dataset.sensorMetric,node]));

  function updateSelection() {
    plan.disabled = session.selected===null;
    clear.hidden = session.selected===null;
  }

  function updateSummary(label) {
    const {swings} = session;
    const count = swings.length;
    figures.count.textContent = count;
    figures.duration.textContent = count ? Math.round(swings.reduce((sum,swing)=>sum+swing.durationMs,0)/count) : '—';
    figures.rotation.textContent = count ? Math.max(...swings.map(swing=>swing.rotationDps)) : '—';
    figures.acceleration.textContent = count ? Math.max(...swings.map(swing=>swing.accelerationG)).toFixed(1) : '—';
    status.textContent = `${label} · ${count} of ${sampleSwings.length} swings`;
    start.disabled = running;
    end.disabled = !running;
    updateSelection();
    table.hidden = !count;
    empty.hidden = Boolean(count);
  }

  function finish(label) {
    clearTimeout(timer);
    running = false;
    const restoreFocus = document.activeElement===end;
    updateSummary(label);
    if (restoreFocus) start.focus();
  }

  function recordNext() {
    if (!root.isConnected) return;
    const index = session.swings.length;
    const swing = sampleSwings[index];
    session.swings.push({...swing});
    rows.insertAdjacentHTML('beforeend',swingRow(swing,index,session.selected));
    onUpdate(session);
    const next = sampleSwings[index+1];
    if (!next) {
      finish('Session complete');
      return;
    }
    updateSummary('Streaming sample swings');
    timer = setTimeout(recordNext,next.atMs-swing.atMs);
  }

  start.addEventListener('click',()=>{
    session = newSensorSession();
    rows.replaceChildren();
    running = true;
    recordNext();
    end.focus();
  });
  end.addEventListener('click',()=>finish('Session ended'));
  rows.addEventListener('change',event=>{
    session.selected = Number(event.target.value);
    updateSelection();
    onUpdate(session);
  });
  clear.addEventListener('click',()=>{
    const selected = rows.querySelector('input:checked');
    selected.checked = false;
    selected.focus();
    session.selected = null;
    updateSelection();
    onUpdate(session);
  });
  plan.addEventListener('click',onPlan);

  rows.innerHTML = session.swings.map((swing,index)=>swingRow(swing,index,session.selected)).join('');
  updateSummary(session.swings.length ? 'Last session' : 'Ready to simulate');

  return ()=>clearTimeout(timer);
}
