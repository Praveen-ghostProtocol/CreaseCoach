export const battingPhases = [
  {key:'backlift',label:'Backlift'},
  {key:'downswing',label:'Downswing'},
  {key:'followThrough',label:'Follow-through'},
];

export const phaseByKey = key => battingPhases.find(phase=>phase.key===key);

export function validMarkers(markers,duration) {
  if (!markers || typeof markers !== 'object' || Array.isArray(markers)) return false;
  if (!Object.entries(markers).every(([key,time])=>phaseByKey(key) && Number.isFinite(time) && time>=0 && time<=duration)) return false;
  const times=battingPhases.filter(({key})=>Object.hasOwn(markers,key)).map(({key})=>markers[key]);
  return times.every((time,index)=>index===0 || times[index-1]<time);
}

export function updatedMarkers(review,key,rawTime) {
  const time=Number(rawTime);
  if (!phaseByKey(key) || rawTime==null || !String(rawTime).trim() || !Number.isFinite(time) || time<0 || time>review.duration) {
    throw new Error('Enter a time within this clip.');
  }
  const markers={...review.markers,[key]:time};
  if (!validMarkers(markers,review.duration)) throw new Error('Keep the markers in order: backlift, downswing, then follow-through.');
  return markers;
}

export function alignment(leftClip,rightClip,phase) {
  const left=leftClip?.markers?.[phase];
  const right=rightClip?.markers?.[phase];
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return {left,right,start:-Math.min(left,right)||0,end:Math.min(leftClip.duration-left,rightClip.duration-right)};
}

export const clampOffset = (range,offset) => Math.max(range.start,Math.min(offset,range.end));

export function alignedTimes(range,offset) {
  const elapsed=clampOffset(range,offset);
  return [range.left+elapsed,range.right+elapsed];
}

export function markerTime(seconds) {
  const ticks=Math.round(seconds*100);
  return `${Math.floor(ticks/6000)}:${((ticks%6000)/100).toFixed(2).padStart(5,'0')}`;
}
