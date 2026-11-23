import test from 'node:test';
import assert from 'node:assert/strict';
import { alignment, alignedTimes, validMarkers, updatedMarkers } from '../src/batting-timeline.js';
import { decode, encode, makeDemo, makePlayer } from '../src/domain.js';

test('marker edits preserve separate manually selected times and require phase order', () => {
  const review = {duration:8,markers:{backlift:1,followThrough:5}};
  assert.deepEqual(updatedMarkers(review,'downswing','2.35'),{backlift:1,followThrough:5,downswing:2.35});
  assert.deepEqual(review.markers,{backlift:1,followThrough:5});
  assert.throws(()=>updatedMarkers(review,'downswing',' '),/time/i);
  assert.throws(()=>updatedMarkers(review,'downswing','0.5'),/order/i);
  assert.throws(()=>updatedMarkers(review,'followThrough','10'),/time/i);
  assert.equal(validMarkers({downswing:2,followThrough:2},8),false);
  assert.equal(validMarkers({contact:3},8),false);
});

test('a common phase is zero, with playback bounded by both clips', () => {
  const a={duration:9,markers:{backlift:2,downswing:4}};
  const b={duration:6,markers:{backlift:1,downswing:5}};
  const range=alignment(a,b,'downswing');
  assert.deepEqual(range,{left:4,right:5,start:-4,end:1});
  assert.deepEqual(alignedTimes(range,0),[4,5]);
  assert.deepEqual(alignedTimes(range,-.65),[3.35,4.35]);
  assert.deepEqual(alignedTimes(range,5),[5,6]);
  assert.deepEqual(alignedTimes(range,-9),[0,1]);
  assert.equal(alignment(a,b,'followThrough'),null);
  assert.deepEqual(alignment({duration:3,markers:{backlift:0}},{duration:3,markers:{backlift:3}},'backlift'),
    {left:0,right:3,start:0,end:0});
});

test('existing workspaces and new marker edits survive versioned storage', () => {
  const personal=makePlayer();
  const clip={id:'clip-a',fileName:'side-on.mp4',title:'Side-on',size:100,modified:0,duration:5,source:'user_observed_video',notes:[]};
  personal.videos.push(clip);
  const state={mode:'personal',personal,demo:makeDemo()};
  assert.deepEqual(decode(encode(state)),state);
  clip.markers={backlift:0,downswing:1.2,followThrough:2.1};
  assert.deepEqual(decode(encode(state)),state);
  clip.markers={backlift:-1};
  assert.throws(()=>decode(encode(state)),/invalid records/);
});
