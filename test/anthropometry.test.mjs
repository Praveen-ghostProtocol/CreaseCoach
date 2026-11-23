import test from 'node:test';
import assert from 'node:assert/strict';
import { readDimensions, projectedLength, validDimensions, validProjection } from '../src/anthropometry.js';
import { decode, encode, makeDemo, makePlayer } from '../src/domain.js';

test('entered dimensions keep units and per-measure provenance',()=>{
  const values=readDimensions({stature:'178.3',statureSource:'measured',armSpan:'181',armSpanSource:'reported'});
  assert.deepEqual(values,{stature:{cm:178.3,source:'measured'},armSpan:{cm:181,source:'reported'}});
  assert.equal(validDimensions(values),true);
  assert.equal(validDimensions({stature:{cm:175,source:'fictional'}}),false);
  assert.throws(()=>readDimensions({armSpan:'0',armSpanSource:'measured'}),/Arm span/);
  assert.throws(()=>readDimensions({armSpan:'180'}),/source/i);
});

test('one planar scale estimates a projected length and rejects an unusable reference',()=>{
  assert.equal(projectedLength(50,200,126),31.5);
  assert.throws(()=>projectedLength(50,1,126),/reference/i);
  assert.throws(()=>projectedLength(50,200,0),/dimension/i);
  assert.equal(validProjection({id:'one',key:'upperArm',time:2,reference:'Measured ruler',knownCm:50,referencePx:200,targetPx:126},3),true);
  assert.equal(validProjection({id:'one',key:'upperArm',time:4,reference:'Measured ruler',knownCm:50,referencePx:200,targetPx:126},3),false);
});

test('versioned storage preserves profile measurements and clip projections as distinct data',()=>{
  const personal=makePlayer();
  personal.profile.dimensions={stature:{cm:178,source:'measured'}};
  personal.videos.push({id:'example',title:'Example',fileName:'example.mp4',size:10,modified:1,duration:3,source:'user_observed_video',notes:[],
    dimensions:{armSpan:{cm:175,source:'reported'}},projections:[{id:'one',key:'upperArm',time:2,reference:'Measured ruler',knownCm:50,referencePx:200,targetPx:126}]});
  const state={mode:'personal',personal,demo:makeDemo()};
  assert.deepEqual(decode(encode(state)),state);
  personal.profile.dimensions.stature.cm=-2;
  assert.throws(()=>decode(encode(state)),/invalid records/);
});
