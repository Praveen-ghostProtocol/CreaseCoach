import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDemo, makePlayer, summarize, validateInnings, suggestPlan, planEvidence, decode, encode, compareSessions, sensorSessions, draftReflectionObjective } from '../src/domain.js';
import { newSensorSession, sampleSwings } from '../src/sensor-session.js';

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

test('guided reflection turns the player’s observation and trial into an editable objective', () => {
  assert.equal(draftReflectionObjective('  I got caught trying a lofted drive. ', 'call a ground or aerial option before each of ten feeds'),
    'I got caught trying a lofted drive. In my next practice, I’ll call a ground or aerial option before each of ten feeds.');
  assert.equal(draftReflectionObjective('The bat felt late', 'I will record where the ball meets the bat.'),
    'The bat felt late. In my next practice, I’ll record where the ball meets the bat.');
  assert.throws(()=>draftReflectionObjective('   ','make a note'),/Describe what happened/);
  assert.throws(()=>draftReflectionObjective('I felt late','   '),/what you will try/);
  assert.ok(draftReflectionObjective('x'.repeat(140),'x'.repeat(220)).length<=400);
  assert.throws(()=>draftReflectionObjective('x'.repeat(141),'make a note'),/140/);
  assert.throws(()=>draftReflectionObjective('I felt late','x'.repeat(221)),/220/);
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

test('sensor readings keep their simulated source in a backup and plan evidence', () => {
  const state = {mode:'personal', personal:makePlayer(), demo:makeDemo()};
  const session = newSensorSession();
  session.swings.push(...sampleSwings.slice(0,3).map(swing=>({...swing})));
  session.selected = 2;
  state.personal.sensorSession = session;

  const restored = decode(encode(state));
  assert.deepEqual(restored.personal.sensorSession,session);
  assert.equal(restored.demo.sensorSession,undefined);
  const [evidence] = planEvidence(restored.personal);
  assert.equal(evidence.kind,'Simulated');
  assert.match(evidence.source,/Swing 3$/);
  assert.match(evidence.text,/434 ms.*692 °\/s.*5\.6 g/);
  session.selected = null;
  assert.deepEqual(planEvidence(state.personal),[]);
  session.selected = 3;
  assert.throws(()=>decode(encode(state)),/invalid records/);
});
