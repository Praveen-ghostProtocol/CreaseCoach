import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDemo, makePlayer, summarize, validateInnings, suggestPlan, planEvidence, decode, encode, compareSessions, sensorSessions } from '../src/domain.js';

test('deterministic example separates six innings and five dismissals', () => {
  assert.deepEqual(makeDemo(), makeDemo());
  const stats = summarize(makeDemo().innings);
  assert.equal(stats.count, 6);
  assert.equal(stats.outs, 5);
  assert.equal(stats.dismissals[0].label, 'Caught');
  assert.equal(stats.dismissals[0].count, 3);
  assert.equal(stats.dismissals[0].percent, 60);
  assert.equal(stats.knownShots, 5);
  assert.equal(stats.repeat.count, 3);
});

test('empty and zero-ball records retain missingness and avoid division by zero', () => {
  assert.equal(summarize([]).strikeRate, null);
  const record = validateInnings({date:'2026-11-22', runs:'0', balls:'0', out:'no', dismissal:'Caught'});
  assert.equal(record.dismissal, '');
  assert.equal(record.shotCategory, '');
  assert.equal(summarize([record]).repeat, null);
  assert.throws(() => validateInnings({date:'2026-11-22', runs:'-1', balls:'0', out:'no'}));
  assert.throws(() => validateInnings({date:'2026-11-31', runs:'1', balls:'1', out:'yes', dismissal:'Caught'}));
  assert.throws(() => validateInnings({date:'2026-11-22', runs:'1', balls:'1', out:'yes'}));
});

test('rules honor a chosen focus and classify simulated and tentative sources', () => {
  const demo = makeDemo();
  demo.motion = true;
  const plan = suggestPlan(demo, 'contact');
  assert.equal(plan.focus, 'contact');
  assert.ok(plan.activities.length <= 2);
  assert.ok(plan.evidence.some(row => row.kind === 'Simulated'));
  assert.ok(plan.evidence.some(row => row.kind === 'Calculated' && row.text.includes('3 of 5')));
  assert.equal(suggestPlan(makePlayer()).focus, 'review');
  demo.videos[0].notes[0].kind = 'Possible explanation';
  assert.equal(planEvidence(demo).find(row => row.id === 'demo-note').kind, 'Hypothesized');
  demo.videos[0].notes[0].selected = false;
  assert.ok(!planEvidence(demo).some(row => row.id === 'demo-note'));
});

test('a changed record immediately changes current evidence', () => {
  const demo = makeDemo();
  demo.innings = demo.innings.filter(record => record.id !== 'd6');
  assert.ok(planEvidence(demo).some(row => row.text.includes('2 of 4')));
});

test('versioned storage rejects invalid structure and preserves workspace separation', () => {
  const user = makePlayer();
  const state = {mode:'personal', personal:user, demo:makeDemo()};
  assert.deepEqual(decode(encode(state)), state);
  assert.equal(state.personal.innings.length, 0);
  assert.throws(() => decode('{"version":99}'));
  assert.throws(() => decode(encode({...state, personal:state.demo})));
});

test('motion metrics reflect deterministic sequences and flag unlike sessions', () => {
  const [a,b] = sensorSessions;
  assert.notEqual(a.duration, b.duration);
  assert.notEqual(a.peak, b.peak);
  assert.equal(compareSessions(a,b).comparable, true);
  assert.equal(compareSessions(a,{...b, shot:'Pull'}).comparable, false);
  assert.equal(a.samples.at(-1).t, a.duration);
});
