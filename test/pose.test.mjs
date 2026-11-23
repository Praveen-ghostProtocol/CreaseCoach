import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePose, poseSampleTimes } from '../src/pose-math.js';
import { decode, encode, makeDemo, makePlayer, planEvidence, poseNoteSource } from '../src/domain.js';

test('pose measurements use image dimensions and require three visible points', () => {
  const points = Array.from({length:33},()=>({}));
  points[23] = {x:.5,y:.4,visibility:.9};
  points[25] = {x:.5,y:.5,visibility:.9};
  points[27] = {x:.6,y:.6,visibility:.9};
  const portrait = summarizePose(points,720,1280);
  assert.deepEqual(portrait.angles,[{label:'Left knee',degrees:151}]);
  assert.deepEqual(summarizePose(points,1280,720).angles,[{label:'Left knee',degrees:119}]);
  points[27].visibility = .2;
  assert.deepEqual(summarizePose(points,720,1280).angles,[]);
  points[27] = {x:1.01,y:.6,visibility:.95};
  assert.equal(summarizePose(points,720,1280).points[27],null);
});

test('the sampling interval stays inside the uploaded clip', () => {
  assert.deepEqual(poseSampleTimes(4,10),[3.25,3.5,3.75,4,4.25,4.5,4.75]);
  assert.equal(poseSampleTimes(0,10)[0],0);
  assert.equal(poseSampleTimes(10,10).at(-1),10);
  assert.equal(poseSampleTimes(0,.001).length,1);
});

test('selected pose notes retain their source through storage and practice planning', () => {
  const personal=makePlayer();
  const note={id:'pose-note',time:2,event:'Backlift',kind:'Direct observation',text:'Review this image-plane estimate.',selected:false,source:poseNoteSource};
  personal.videos.push({id:'video',title:'Side-on clip',fileName:'side.mp4',duration:8,size:100,modified:0,source:'user_observed_video',notes:[note]});
  assert.equal(planEvidence(personal).length,0);
  note.selected=true;
  const restored=decode(encode({mode:'personal',personal,demo:makeDemo()})).personal;
  assert.equal(planEvidence(restored)[0].kind,'AI pose estimate');
  assert.equal(restored.videos[0].notes[0].source,poseNoteSource);
});
