const pivot = [0,1.64,0];
const gripColor = [0.26,0.37,0.26];
const bladeColor = [0.87,0.72,0.46];
const lime = [0.84,0.97,0.48];
const ghostColor = [0.44,0.65,0.65];
const front = [0,0.12];
export const views = {reset:[0.53,0.29], front, side:[Math.PI/2,0.12], elevated:[0.56,0.68]};

const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const subtract = (a,b) => a.map((v,i)=>v-b[i]);
const cross = ([a,b,c],[x,y,z]) => [b*z-c*y,c*x-a*z,a*y-b*x];
const normalize = vector => {const length = Math.hypot(...vector); return vector.map(v=>v/length);};
const shade = normalize([-.45,.7,.85]);
const mix = (a,b,t) => a+(b-a)*t;

function prism(out, outline, depth, color) {
  const a = outline.map(([x,y])=>[x,y,depth/2]);
  const b = outline.map(([x,y])=>[x,y,-depth/2]);
  for (let i=1;i<a.length-1;i++) {
    out.push({vertices:[a[0],a[i],a[i+1]],color},{vertices:[b[0],b[i+1],b[i]],color});
  }
  for (let i=0;i<a.length;i++) {
    const j = (i+1)%a.length;
    out.push({vertices:[a[i],b[i],b[j]],color},{vertices:[a[i],b[j],a[j]],color});
  }
}

const bat = [];
prism(bat,[[-.045,-.47],[-.14,-.63],[-.165,-1.45],[-.14,-1.51],[.14,-1.51],[.165,-1.45],[.14,-.63],[.045,-.47]],.088,bladeColor);
prism(bat,[[-.042,-.03],[-.042,-.52],[.042,-.52],[.042,-.03]],.075,[.63,.46,.27]);
prism(bat,[[-.066,.02],[-.058,-.43],[.058,-.43],[.066,.02]],.106,gripColor);
prism(bat,[[-.069,.044],[-.069,.017],[.069,.017],[.069,.044]],.111,[.70,.82,.52]);
for (let i=0;i<8;i++) {
  const y = -.05-i*.047;
  prism(bat,[[-.062,y],[-.062,y-.009],[.062,y-.009],[.062,y]],.11,[.33,.45,.30]);
}

const stumps = [];
for (const x of [-.085,0,.085]) {
  prism(stumps,[[x-.013,.44],[x-.013,0],[x+.013,0],[x+.013,.44]],.03,[.72,.68,.47]);
}
prism(stumps,[[-.106,.46],[-.106,.438],[.106,.438],[.106,.46]],.031,[.78,.72,.52]);

export function sampleAt(session,time) {
  const index = Math.max(0,Math.min(session.samples.length-1,time/session.duration*(session.samples.length-1)));
  const a = session.samples[Math.floor(index)];
  const b = session.samples[Math.ceil(index)];
  const fraction = index-Math.floor(index);
  return {angle:mix(a.angle,b.angle,fraction),tilt:mix(a.tilt,b.tilt,fraction),shift:mix(a.shift,b.shift,fraction)};
}

function batWorld([x,y,z], motion) {
  const cosine = Math.cos(motion.angle);
  const sine = Math.sin(motion.angle);
  const tiltCos = Math.cos(motion.tilt);
  const tiltSin = Math.sin(motion.tilt);
  const xx = x*cosine-y*sine;
  const yy = x*sine+y*cosine;
  return [pivot[0]+xx, pivot[1]+yy*tiltCos-z*tiltSin+motion.shift, pivot[2]+yy*tiltSin+z*tiltCos];
}

function worldProjection(camera,aspect) {
  const elevation = camera.elevation;
  const azimuth = camera.azimuth;
  const eye = [Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)];
  const right = normalize(cross([0,1,0],eye));
  const up = cross(eye,right);
  const distance = 4.3 / camera.zoom;
  const scale = Math.min(2.6,2.14*aspect);
  return point => {
    const centered = subtract(point,[0,1.13,0]);
    const depth = distance-dot(centered,eye);
    return [dot(centered,right)*scale/(depth*aspect),dot(centered,up)*scale/depth,depth];
  };
}

function cloth() {
  const grid = [];
  for (let i=-6;i<=6;i++) {
    const v = i*.44;
    grid.push({pair:[[v,0,-2.64],[v,0,2.64]],color:[.23,.33,.26]},{pair:[[-2.64,0,v],[2.64,0,v]],color:[.23,.33,.26]});
  }
  for (const z of [-1.22,.95]) grid.push({pair:[[-1.8,.006,z],[1.8,.006,z]],color:[.57,.67,.51]});
  grid.push({pair:[[-.83,.006,-1.22],[-.83,.006,.95]],color:[.39,.48,.37]},
    {pair:[[.83,.006,-1.22],[.83,.006,.95]],color:[.39,.48,.37]});
  return grid;
}

const floor = cloth();

function track(session,color) {
  const points = session.samples.map(sample=>batWorld([0,-1.52,0],sample));
  return points.slice(1).map((point,i)=>({pair:[points[i],point],color}));
}

function faces(model,world,project,tint) {
  return model.map(face=>{
    const vertices = face.vertices.map(world);
    const normal = normalize(cross(subtract(vertices[1],vertices[0]),subtract(vertices[2],vertices[0])));
    const lit = .54+.46*Math.max(0,dot(normal,shade));
    return {points:vertices.map(project),color:(tint||face.color).map(value=>value*lit)};
  });
}

function frame(camera,aspect,session,time,ghost) {
  const project = worldProjection(camera,aspect);
  const lines = [...floor,...track(session,lime),...(ghost?track(ghost,ghostColor):[])].map(line=>({points:line.pair.map(project),color:line.color}));
  const progress = time/session.duration;
  const triangles = [
    ...faces(stumps,([x,y,z])=>[x,y,z-1.22],project),
    ...faces(bat,point=>batWorld(point,sampleAt(session,time)),project),
    ...(ghost?faces(bat,point=>batWorld(point,sampleAt(ghost,progress*ghost.duration)),project,ghostColor):[]),
  ].sort((a,b)=>b.points.reduce((sum,v)=>sum+v[2],0)-a.points.reduce((sum,v)=>sum+v[2],0));
  return {lines,triangles};
}

const vertexSource = `attribute vec2 point;
attribute vec3 color;
varying vec3 lit;
void main(){gl_Position=vec4(point,0.,1.);lit=color;}`;
const fragmentSource = `precision mediump float;
varying vec3 lit;
void main(){gl_FragColor=vec4(lit,1.);}`;

function makeShader(gl,kind,source) {
  const shader = gl.createShader(kind);
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error('Motion shader unavailable.');
  return shader;
}

const ns = 'http://www.w3.org/2000/svg';
const svgPoint = ([x,y]) => `${(400+x*400).toFixed(1)},${(225-y*225).toFixed(1)}`;
const rgb = values => `rgb(${values.map(value=>Math.round(value*255)).join(' ')})`;

function fallback(stage) {
  const svg = document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 800 450');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Two-dimensional rendering of the simulated bat and swing path');
  stage.replaceChildren(svg);
  return {
    mode:'2D fallback', element:svg,
    draw(camera,session,time,ghost) {
      const {lines,triangles} = frame(camera,800/450,session,time,ghost);
      svg.innerHTML = lines.map(({points,color})=>`<polyline points="${points.map(svgPoint).join(' ')}" fill="none" stroke="${rgb(color)}" stroke-width="1.2"/>`).join('') +
        triangles.map(({points,color})=>`<polygon points="${points.map(svgPoint).join(' ')}" fill="${rgb(color)}"/>`).join('');
    },
    dispose() {},
  };
}

export function createRenderer(stage, onContextLost) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Interactive rendering of the simulated bat and swing path');
  let gl;
  try { gl = canvas.getContext('webgl',{alpha:false,antialias:true}); }
  catch { return fallback(stage); }
  if (!gl) return fallback(stage);
  let program,buffer,point,color;
  try {
    const vertex = makeShader(gl,gl.VERTEX_SHADER,vertexSource);
    const fragment = makeShader(gl,gl.FRAGMENT_SHADER,fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program,vertex);
    gl.attachShader(program,fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Motion renderer unavailable.');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    point = gl.getAttribLocation(program,'point');
    color = gl.getAttribLocation(program,'color');
    gl.enableVertexAttribArray(point);
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(point,2,gl.FLOAT,false,20,0);
    gl.vertexAttribPointer(color,3,gl.FLOAT,false,20,8);
  } catch { return fallback(stage); }
  stage.replaceChildren(canvas);
  const loss = event => {event.preventDefault(); onContextLost(fallback(stage));};
  canvas.addEventListener('webglcontextlost',loss,{once:true});
  return {
    mode:'3D · WebGL',element:canvas,
    draw(camera,session,time,ghost) {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1,2);
      const w = Math.round(Math.max(1,rect.width)*pixelRatio);
      const h = Math.round(Math.max(1,rect.height)*pixelRatio);
      if (canvas.width!==w || canvas.height!==h) {canvas.width=w; canvas.height=h;}
      const {lines,triangles} = frame(camera,w/h,session,time,ghost);
      const vertices = [...lines,...triangles].flatMap(part=>part.points.flatMap(([x,y])=>[x,y,...part.color]));
      gl.viewport(0,0,w,h);
      gl.clearColor(.10,.16,.12,1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.LINES,0,lines.length*2);
      gl.drawArrays(gl.TRIANGLES,lines.length*2,triangles.length*3);
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost',loss);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
