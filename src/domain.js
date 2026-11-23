import { validMarkers } from './batting-timeline.js';

export const STORAGE = 'creasecoach.workspace';
export const dismissals = ['Caught', 'Bowled', 'LBW', 'Run out', 'Stumped', 'Other', 'Unknown'];
export const phases = ['Powerplay', 'Middle', 'Death'];
export const categories = ['Ground', 'Aerial', 'Defensive', 'Other', 'Unknown'];
export const formats = ['T20', 'ODI', 'Test', 'Other'];
export const events = ['Setup', 'Backlift', 'Downswing', 'Approximate contact', 'Follow-through', 'Other'];
export const noteKinds = ['Direct observation', 'Player interpretation', 'Possible explanation', 'Needs expert review'];
export const poseNoteSource = 'ai_pose';
export const feedback = ['This observation is correct', 'This observation needs correction', 'I’m not sure', 'Ask a coach'];

export function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}

function numberField(value, label, max = 9999) {
  if (!/^\d+$/.test(String(value ?? '')) || !Number.isSafeInteger(+value) || +value > max) {
    throw new Error(`${label} must be a whole number from 0 to ${max}.`);
  }
  return +value;
}

function choice(value, choices) {
  return choices.includes(value) ? value : '';
}

function clipText(value, length = 600) {
  return typeof value === 'string' ? value.trim().slice(0, length) : '';
}

export function validateInnings(values) {
  if (!validDate(values.date)) throw new Error('Enter a valid innings date.');
  const runs = numberField(values.runs, 'Runs');
  const balls = numberField(values.balls, 'Balls');
  if (!['yes', 'no'].includes(values.out)) throw new Error('Choose out or not out.');
  const out = values.out === 'yes';
  const dismissal = out ? choice(values.dismissal, dismissals) : '';
  if (out && !dismissal) throw new Error('Choose a dismissal type. Use Unknown if you are unsure.');
  const position = values.position ? numberField(values.position, 'Batting position', 11) : null;
  if (position === 0) throw new Error('Batting position starts at 1.');
  return {
    date: values.date, runs, balls, out, dismissal, position,
    session: choice(values.session, ['Match', 'Practice']), format: choice(values.format, formats),
    phase: choice(values.phase, phases), shotCategory: choice(values.shotCategory, categories),
    shot: clipText(values.shot, 80), delivery: clipText(values.delivery, 120),
    notes: clipText(values.notes), reflection: clipText(values.reflection), videoId: clipText(values.videoId, 80),
  };
}

export function makePlayer() {
  return { profile:{name:'Player', hand:'', level:''}, innings:[], videos:[], plans:[], focus:'', motion:false, feedback:{}, logs:[] };
}

export const storyboardId = 'cricket-storyboard';

export function makeDemo() {
  const data = makePlayer();
  data.profile = {name:'Arjun Mehta', hand:'Right-hand batter', level:'Developing club player'};
  data.innings = [
    ['d1','2026-10-24',18,19,'Bowled','Powerplay','Defensive','Forward defence'],
    ['d2','2026-10-29',34,25,'Caught','Middle','Aerial','Lofted drive'],
    ['d3','2026-11-02',22,20,'','Middle','Ground','Cover drive'],
    ['d4','2026-11-07',15,13,'Caught','Powerplay','Aerial','Pull'],
    ['d5','2026-11-12',42,31,'LBW','Middle','',''],
    ['d6','2026-11-18',27,21,'Caught','Death','Aerial','Lofted drive'],
  ].map(([id,date,runs,balls,dismissal,phase,shotCategory,shot]) => ({
    ...validateInnings({date,runs,balls,out:dismissal?'yes':'no',dismissal,phase,shotCategory,shot,session:'Match',format:'T20',position:'3'}),
    id, source:'demo_simulated',
  }));
  data.innings.at(-1).notes = 'Tried to clear the infield. I want to review the field before choosing the aerial option.';
  data.videos = [{id:storyboardId, title:'Batting action storyboard', fileName:'', size:0, modified:0, duration:6, source:'demo_simulated', notes:[
    {id:'demo-note', time:3, event:'Approximate contact', text:'The illustration places the ball just ahead of the front pad.', kind:'Direct observation', selected:true},
  ]}];
  data.focus = 'selection';
  data.plans = [{id:'demo-history', created:'2026-11-05', focus:'review', objective:'Record my shot decision after each set.', criterion:'Write down one decision I’d repeat.', next:'2026-11-07',
    activities:[{id:'review-1', title:'Two-ball recall', dose:'5 min', done:true}], reflection:'Calling out the intended shot helped me remember what I chose.', complete:true}];
  return data;
}

export function filterInnings(innings, filters) {
  return innings.filter(record => (!filters.dismissal || record.dismissal === filters.dismissal) &&
    (!filters.phase || record.phase === filters.phase) && (!filters.shotCategory || record.shotCategory === filters.shotCategory) &&
    (!filters.session || record.session === filters.session));
}

function distribution(innings, key, order) {
  const counts = new Map();
  for (const record of innings) {
    const label = record[key];
    if (label) counts.set(label, (counts.get(label) || 0) + 1);
  }
  const total = innings.length;
  return [...counts].map(([label,count]) => ({label,count,percent:Math.round(count / total * 100)}))
    .sort((a,b) => b.count - a.count || order.indexOf(a.label) - order.indexOf(b.label));
}

export function summarize(innings) {
  const outs = innings.filter(row => row.out);
  const knownShots = innings.filter(row => row.shotCategory && row.shotCategory !== 'Unknown');
  const knownPhases = innings.filter(row => row.phase);
  const dismissalCounts = distribution(outs, 'dismissal', dismissals);
  const recurring = dismissalCounts.find(row => row.label !== 'Unknown' && row.count >= 2);
  const repeat = recurring ? {...recurring, ids:outs.filter(row => row.dismissal === recurring.label).map(row => row.id)} : null;
  const runs = innings.reduce((sum,row) => sum + row.runs, 0);
  const balls = innings.reduce((sum,row) => sum + row.balls, 0);
  const rateRecords = innings.filter(row => row.balls > 0);
  const rateRuns = rateRecords.reduce((sum,row) => sum + row.runs, 0);
  return {count:innings.length, outs:outs.length, runs, balls,
    strikeRate:balls ? rateRuns / balls * 100 : null, rateRecords:rateRecords.length,
    best:innings.length ? Math.max(...innings.map(row => row.runs)) : null, repeat,
    dismissals:dismissalCounts, shots:distribution(knownShots,'shotCategory',categories), phases:distribution(knownPhases,'phase',phases),
    knownShots:knownShots.length, knownPhases:knownPhases.length, notOut:innings.length-outs.length};
}

export const focuses = {
  selection:{title:'Shot selection', objective:'Make a deliberate shot choice before attempting a lofted option.', criterion:'In one set, record the intended option for each ball and explain one choice afterward.',
    activities:[['Call the option','Ten controlled feeds','Bat, tennis balls and a feeder','Before each feed, name a ground or aerial option that fits the field. Record what you actually tried.','Whether your decision changed after seeing the feed.'],['Map the gaps','5 minutes','Paper or cones','Sketch a field for a recent innings. Identify a ground option and an aerial option, then say when you would choose each.','One field placement that changes your decision.']]},
  contact:{title:'Contact consistency', objective:'Observe how contact varies across a short set of comparable feeds.', criterion:'Record contact impressions for six comparable feeds and flag one observation for review.',
    activities:[['Controlled contact check','Six gentle feeds','Bat, soft balls and a feeder or tee','Repeat one chosen stroke from similar feeds. Record your contact impression and where the ball goes.','Which impressions repeat across comparable feeds.'],['Review two moments','5 minutes','Phone or written notes','Compare two attempts at the same stroke using your notes or a clip you can review.','One visible or self-reported difference to discuss.']]},
  repeat:{title:'Stroke repeatability', objective:'Compare several attempts at one chosen stroke under similar conditions.', criterion:'Record five attempts with feed and shot labels and identify one observation that repeats.',
    activities:[['Same-stroke set','Five gentle feeds','Bat, soft balls and a feeder or tee','Pick a stroke and keep the feed and intended target as similar as practical. Record departures from the setup.','Whether differences coincide with changes in the feed.']]},
  field:{title:'Field awareness', objective:'Identify one available scoring option from the field before a delivery.', criterion:'Describe an option for three field arrangements and explain one trade-off.',
    activities:[['Read the field','Three field sketches','Paper or cones','Move two fielders in a simple layout and describe how that changes your scoring options.','Which field changes affect your choice.']]},
  review:{title:'General review', objective:'Capture one comparable set of batting observations to guide the next review.', criterion:'Record a shot choice and outcome for at least three comparable attempts.',
    activities:[['Two-ball recall','5 minutes','Phone or paper','After a short set, write down the shot decision and outcome for two deliveries. Repeat once if practical.','Which facts you can recall and which fields need a note next time.']]},
};

function makeMotion(id, label, duration, amplitude, tilt) {
  const samples = Array.from({length:41}, (_,i) => {
    const u = i / 40;
    const travel = (1-Math.cos(Math.PI*u)) / 2;
    return {t:u*duration, angle:-1.3 + amplitude*travel, tilt:tilt*Math.sin(Math.PI*u), shift:0.2*Math.sin(Math.PI*u)};
  });
  const radians = 180 / Math.PI;
  const peak = Math.round(Math.max(...samples.slice(1).map((sample,i) =>
    Math.abs(sample.angle-samples[i].angle)/(sample.t-samples[i].t)*radians)));
  return {id,label,duration,shot:'Lofted drive', condition:'Gentle feed, same illustrative setup', samples, peak,
    orientation:Math.round((samples.at(-1).angle-samples[0].angle)*radians)};
}

export const sensorSessions = [makeMotion('motion-a','Session A',0.72,2.62,0.12), makeMotion('motion-b','Session B',0.88,2.23,-0.28)];
export function compareSessions(a,b) {
  return {comparable:a.shot === b.shot && a.condition === b.condition,
    duration:Math.round((b.duration-a.duration)*100)/100, peak:b.peak-a.peak, orientation:b.orientation-a.orientation};
}

export function patternText(stats) {
  return stats.repeat
    ? `${stats.repeat.count} of ${stats.outs} recorded dismissals were ${stats.repeat.label.toLowerCase()} (${stats.repeat.percent}%).`
    : 'Not enough comparable records to identify a recurring pattern.';
}

export function planEvidence(data, currentPlanId = '') {
  const stats = summarize(data.innings);
  const result = [];
  if (stats.repeat) {
    result.push({id:'innings', kind:'Calculated', source:data.innings.every(row => row.source === 'demo_simulated')?'Fictional innings log':'Innings log', text:patternText(stats)});
  }
  for (const review of data.videos) {
    for (const note of review.notes.filter(item => item.selected)) {
      const kind = note.source === poseNoteSource ? 'AI pose estimate' : note.kind !== 'Direct observation' ? 'Hypothesized' : review.source === 'demo_simulated' ? 'Simulated' : 'Observed / entered';
      result.push({id:note.id, kind, source:`${review.title} · ${note.kind}${review.source === 'demo_simulated' ? ' · schematic' : ''}`, text:note.text});
    }
  }
  if (data.motion) {
    const [a,b] = sensorSessions;
    const delta = compareSessions(a,b);
    result.push({id:'motion', kind:'Simulated', source:'Bat Motion Explorer · synthetic sequences',
      text:`Illustrative Session B takes ${delta.duration.toFixed(2)} s longer; peak angular velocity changes by ${delta.peak} °/s. Use this as an example of a comparison.`});
  }
  const previous = [...data.plans].reverse().find(plan => plan.id !== currentPlanId && plan.complete && plan.reflection.trim());
  if (previous) result.push({id:previous.id, kind:previous.id === 'demo-history' ? 'Simulated' : 'Observed / entered', source:'Previous practice reflection', text:previous.reflection});
  return result;
}

export function suggestPlan(data, preferred = data.focus, currentPlanId = '') {
  const stats = summarize(data.innings);
  const aerialCatches = data.innings.filter(row => row.out && row.dismissal === 'Caught' && row.shotCategory === 'Aerial');
  const focus = Object.hasOwn(focuses, preferred) ? preferred : aerialCatches.length >= 2 ? 'selection' : 'review';
  const selected = focuses[focus];
  return {focus, objective:selected.objective, criterion:selected.criterion, next:'',
    activities:selected.activities.map(([title,dose],i) => ({id:`${focus}-${i+1}`,title,dose,done:false})),
    evidence:planEvidence(data,currentPlanId), uncertainty:stats.repeat
      ? 'A repeated outcome can guide what to review. Its cause remains uncertain across differing deliveries and situations.'
      : 'Comparable evidence is limited. Record what you notice under similar conditions before attributing a cause.',
    reason:Object.hasOwn(focuses,preferred) ? 'You selected this focus.' : focus === 'selection' ? `${aerialCatches.length} recorded catches also have an aerial shot recorded.` : 'A short review set gives you more comparable observations.',
  };
}

const isText = value => typeof value === 'string';
const isBool = value => typeof value === 'boolean';
const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const isNonnegative = value => isNumber(value) && value >= 0;
const isInteger = value => Number.isSafeInteger(value) && value >= 0;
const strings = (value, keys) => value && keys.every(key => isText(value[key]));
const unique = items => new Set(items.map(item => item.id)).size === items.length;

export function validWorkspace(data, allowDemo = false) {
  if (!data || !strings(data.profile,['name','hand','level']) || !isText(data.focus) || !isBool(data.motion) ||
      !data.feedback || typeof data.feedback !== 'object' || Array.isArray(data.feedback)) return false;
  if (data.focus && !Object.hasOwn(focuses,data.focus)) return false;
  if (!Object.values(data.feedback).every(item => feedback.includes(item))) return false;
  if (!['innings','videos','plans','logs'].every(key => Array.isArray(data[key]))) return false;
  if (!data.innings.every(item => strings(item,['id','dismissal','session','format','phase','shotCategory','shot','delivery','notes','reflection','videoId','source']) &&
      validDate(item.date) && isInteger(item.runs) && item.runs <= 9999 && isInteger(item.balls) && item.balls <= 9999 && isBool(item.out) &&
      (item.out ? dismissals.includes(item.dismissal) : !item.dismissal) &&
      (item.source === 'user_reported' || allowDemo && item.source === 'demo_simulated'))) return false;
  if (!data.videos.every(item => strings(item,['id','title','fileName','source']) && isNonnegative(item.duration) && isInteger(item.size) &&
      isNonnegative(item.modified) && (item.source === 'user_observed_video' || item.source === 'demo_simulated' && (allowDemo || item.id === storyboardId)) &&
      (item.markers === undefined || item.source === 'user_observed_video' && validMarkers(item.markers,item.duration)) &&
      Array.isArray(item.notes) && item.notes.every(note => strings(note,['id','text','event','kind']) && noteKinds.includes(note.kind) && events.includes(note.event) &&
        isNonnegative(note.time) && note.time <= item.duration && isBool(note.selected) &&
        (note.source === undefined || item.source === 'user_observed_video' && note.source === poseNoteSource)) && unique(item.notes))) return false;
  if (!data.plans.every(item => strings(item,['id','focus','objective','criterion','next','reflection']) && validDate(item.created) &&
      Object.hasOwn(focuses,item.focus) && (!item.next || validDate(item.next)) && isBool(item.complete) &&
      Array.isArray(item.activities) && item.activities.length > 0 && item.activities.length <= 2 &&
      item.activities.every(activity => strings(activity,['id','title','dose']) && isBool(activity.done)) && unique(item.activities))) return false;
  return data.logs.every(item => strings(item,['id','text']) && validDate(item.date)) &&
    unique(data.innings) && unique(data.videos) && unique(data.plans);
}

export const encode = state => JSON.stringify({version:1,...state});
export function decode(raw) {
  const {version,mode,personal,demo} = JSON.parse(raw);
  if (version !== 1 || !['demo','personal'].includes(mode) || !validWorkspace(personal) || !validWorkspace(demo,true)) {
    throw new Error('This workspace file has an unsupported version or invalid records.');
  }
  return {mode,personal,demo};
}
