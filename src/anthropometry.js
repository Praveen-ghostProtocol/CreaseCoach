export const bodyMeasures = [
  {key:'stature',label:'Standing height',guide:'Floor to top of head while standing upright.'},
  {key:'armSpan',label:'Arm span',guide:'Fingertip to fingertip with arms extended level.'},
  {key:'shoulderBreadth',label:'Shoulder breadth',guide:'Across the bony points of the shoulders.'},
  {key:'upperArm',label:'Upper-arm length',guide:'From the shoulder landmark to the elbow landmark.'},
  {key:'upperLeg',label:'Upper-leg length',guide:'Use the same hip and knee landmarks when comparing records.'},
];

export const dimensionSources = {measured:'Directly measured',reported:'Self-reported',illustrative:'Fictional example'};
export const measureByKey = key => bodyMeasures.find(measure=>measure.key===key);
const validCm = value => Number.isFinite(value) && value>=.1 && value<=300;

export function readDimensions(fields) {
  const dimensions={};
  for (const {key,label} of bodyMeasures) {
    const value=String(fields[key] ?? '').trim();
    if (!value) continue;
    const cm=Number(value);
    const source=fields[`${key}Source`];
    if (!validCm(cm)) throw new Error(`${label} needs a positive value up to 300 cm.`);
    if (source!=='measured' && source!=='reported') throw new Error(`Choose a source for ${label.toLowerCase()}.`);
    dimensions[key]={cm,source};
  }
  return dimensions;
}

export function validDimensions(value, allowIllustrative = false) {
  return Boolean(value && typeof value==='object' && !Array.isArray(value) && Object.entries(value).every(([key,row])=>
    measureByKey(key) && validCm(row?.cm) && (row.source==='measured' || row.source==='reported' || allowIllustrative && row.source==='illustrative')));
}

export function projectedLength(knownCm,referencePx,targetPx) {
  if (!Number.isFinite(knownCm) || knownCm<=0 || knownCm>10000 || !Number.isFinite(referencePx) || referencePx<8) {
    throw new Error('Use a known reference length and mark a span at least 8 pixels long.');
  }
  if (!Number.isFinite(targetPx) || targetPx<2) throw new Error('Mark two distinct points for the body dimension.');
  const cm=knownCm*targetPx/referencePx;
  if (!validCm(cm)) throw new Error('The projected dimension is outside the display range. Check the points and reference.');
  return Math.round(cm*10)/10;
}

export function validProjection(row,duration) {
  if (!row || typeof row.id!=='string' || !measureByKey(row.key) || !Number.isFinite(row.time) || row.time<0 || row.time>duration ||
      typeof row.reference!=='string' || !row.reference.trim() || row.reference.length>80) return false;
  try {projectedLength(row.knownCm,row.referencePx,row.targetPx); return true;}
  catch {return false;}
}
