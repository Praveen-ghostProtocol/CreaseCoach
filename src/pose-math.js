const joints = [
  ['Left elbow',11,13,15], ['Right elbow',12,14,16],
  ['Left knee',23,25,27], ['Right knee',24,26,28],
];

export const poseConnections = [
  [11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
  [23,25],[25,27],[24,26],[26,28],[27,29],[29,31],[28,30],[30,32],
];

export function poseSampleTimes(center,duration) {
  return [...new Set(Array.from({length:7},(_,index)=>{
    const sampled = Math.max(0,Math.min(center+(index-3)*.25,duration));
    return Math.min(Math.round(sampled*100)/100,duration);
  }))];
}

function angleInImage(a,b,c,width,height) {
  const left = [(a.x-b.x)*width,(a.y-b.y)*height];
  const right = [(c.x-b.x)*width,(c.y-b.y)*height];
  const denominator = Math.hypot(...left)*Math.hypot(...right);
  if (denominator<1) return null;
  const cosine = (left[0]*right[0]+left[1]*right[1])/denominator;
  return Math.round(Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI);
}

export function summarizePose(landmarks,width,height) {
  const points = landmarks.map(({x,y,visibility,presence})=>{
    const inFrame = Number.isFinite(x) && Number.isFinite(y) && x>=0 && x<=1 && y>=0 && y<=1;
    return inFrame && visibility>=.55 && (presence ?? 1)>=.55 ? {x,y} : null;
  });
  const angles = joints.flatMap(([label,start,middle,end])=>{
    if (!points[start] || !points[middle] || !points[end]) return [];
    const degrees = angleInImage(points[start],points[middle],points[end],width,height);
    return degrees===null ? [] : [{label,degrees}];
  });
  return {points,angles};
}
