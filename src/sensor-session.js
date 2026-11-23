const source = 'simulated_bat_sensor';

export const sampleSwings = [
  [0, 408, 720, 5.8],
  [1100, 392, 778, 6.2],
  [2200, 434, 692, 5.6],
  [3300, 378, 816, 6.5],
  [4400, 402, 755, 6.1],
  [5500, 386, 803, 6.4],
].map(([atMs,durationMs,rotationDps,accelerationG]) => ({atMs,durationMs,rotationDps,accelerationG}));

export function newSensorSession() {
  return {source,swings:[],selected:null};
}

export function validSensorSession(session) {
  if (session?.source!==source || !Array.isArray(session.swings) || session.swings.length>sampleSwings.length) return false;
  const {swings,selected} = session;
  return (selected===null || Number.isInteger(selected) && selected>=0 && selected<swings.length) &&
    swings.every((swing,index) => swing && Number.isSafeInteger(swing.atMs) && swing.atMs>=0 &&
      (index===0 || swing.atMs>swings[index-1].atMs) &&
      [swing.durationMs,swing.rotationDps,swing.accelerationG].every(value => Number.isFinite(value) && value>0));
}

export function sensorEvidence(session) {
  const swing = session?.swings[session.selected];
  if (!swing) return null;
  return {id:'sensor-session',kind:'Simulated',source:`Sensor Session demo · Swing ${session.selected+1}`,
    text:`${swing.durationMs} ms swing duration · ${swing.rotationDps} °/s peak angular speed · ${swing.accelerationG.toFixed(1)} g peak acceleration.`};
}
