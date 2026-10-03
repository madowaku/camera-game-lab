import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameSmuggler, makeSchedule, ROUND_MS, WARNING_MS, INSPECTION_MS } from '../src/games/frameSmuggler.js';
import { CargoFrame, projectCargo } from '../src/smuggler/cargoFrame.js';
import { createRecords, GATE_KEYS, RECORD_KEY } from '../src/smuggler/records.js';

function begun() { const game = new FrameSmuggler({ random: () => .5 }); game.start(); game.step(2000, 'inside'); return game; }
function until(game, time, cargo) { game.step(Math.max(0, time - game.elapsed), cargo); }

test('four randomized complete inspections fit in 30 seconds with 2–5s gaps', () => {
  for (let seed = 0; seed < 100; seed++) {
    let value = seed;
    const schedule = makeSchedule(() => { value = (value * 1664525 + 1013904223) >>> 0; return value / 2 ** 32; });
    assert.equal(schedule.length, 4); let end = 0;
    for (const i of schedule) {
      assert.ok(i.warning - end >= 2000 && i.warning - end <= 5000);
      assert.equal(Math.round(i.hide - i.warning), WARNING_MS); assert.equal(Math.round(i.end - i.hide), INSPECTION_MS); end = i.end;
    }
    assert.ok(ROUND_MS - end >= 2000 && ROUND_MS - end <= 5000);
  }
  assert.notDeepEqual(makeSchedule((() => { let i = 0; return () => i++ / 5; })()), makeSchedule(() => .5));
});
test('countdown waits for a visible hand; ready and pauses do not spend round time', () => {
  const g = new FrameSmuggler(); g.step(1000, 'inside'); assert.equal(g.elapsed, 0);
  g.start(); g.step(5000, 'lost'); assert.equal(g.countdown, 2000);
  g.step(2000, 'inside'); g.paused = true; g.step(1000, 'inside'); assert.equal(g.elapsed, 0);
  g.paused = false; g.step(1000, 'stale'); assert.equal(g.elapsed, 0);
  g.step(1000, 'inside'); assert.equal(g.score, 10);
});
test('KEEP scores only safely in frame; ambiguous loss never hides cargo', () => {
  const g = begun(); g.step(1000, 'inside'); const score = g.score;
  g.step(400, 'edge'); g.step(400, 'outside'); g.step(400, 'lost'); assert.equal(g.score, score);
  until(g, g.schedule[0].end, 'lost'); assert.equal(g.caught, 1); assert.equal(g.cleared, 0); assert.equal(g.bestHideMs, null);
});
test('hide must persist through inspection, then return is required before another clear', () => {
  const g = begun(), first = g.schedule[0];
  until(g, first.hide + 300, 'inside'); until(g, first.end, 'outside');
  assert.equal(g.cleared, 1); assert.equal(g.bestHideMs, 300); assert.equal(g.phase, 'return');
  const score = g.score; g.step(100, 'outside'); assert.equal(g.score, score);
  until(g, g.schedule[1].end, 'outside'); assert.equal(g.cleared, 1); assert.equal(g.caught, 1);
  g.step(100, 'inside'); assert.equal(g.phase, 'keep'); assert.equal(g.awaitingReturn, false); assert.ok(g.score > score);
  assert.equal(g.notice, 'caught'); assert.ok(g.safeUntil > g.noticeUntil, 'CAUGHT stays readable before SAFE');
});
test('returning early or ducking out for less than the debounce is caught', () => {
  for (const strategy of ['early', 'late']) {
    const g = begun(), first = g.schedule[0]; until(g, first.hide, 'inside');
    if (strategy === 'early') { g.step(1200, 'outside'); until(g, first.end, 'inside'); }
    else { until(g, first.end - 100, 'inside'); until(g, first.end, 'outside'); }
    assert.equal(g.caught, 1); assert.equal(g.bestHideMs, null);
  }
});
test('full round has four outcomes, exact duration, honest best hide, immutable final totals', () => {
  const g = begun();
  for (const inspection of g.schedule) {
    until(g, inspection.hide + 400, 'inside'); until(g, inspection.end, 'outside');
  }
  until(g, ROUND_MS, 'inside');
  assert.equal(g.result.inspectionsCleared, 4); assert.equal(g.result.caught, 0); assert.equal(g.result.bestHideMs, 400); assert.equal(g.result.durationMs, 30000);
  assert.equal(g.result.inspections.length, 4); assert.ok(g.result.score > 400);
  const result = structuredClone(g.result); g.step(30000, 'inside'); assert.deepEqual(g.result, result);
});
test('frame-rate slicing preserves scores and outcomes', () => {
  const a = begun(), b = begun(); a.step(30000, 'inside');
  for (let i = 0; i < 3000; i++) b.step(10, 'inside');
  assert.deepEqual(a.result, b.result);
});
test('projection matches portrait cover crop, front mirror and uncropped center', () => {
  assert.deepEqual(projectCargo({ x: .5, y: .5 }, 1280, 720, 360, 480), { x: .5, y: .5 });
  const rear = projectCargo({ x: .2, y: .5 }, 1280, 720, 360, 480);
  const front = projectCargo({ x: .2, y: .5 }, 1280, 720, 360, 480, true);
  assert.ok(rear.x < 0); assert.equal(front.x, 1 - rear.x);
});
test('edge departure plus continued missing frames confirms hiding; center loss does not', () => {
  const frame = new CargoFrame(); frame.update({ x: .5, y: .5 }, 0); assert.equal(frame.snapshot(0).state, 'inside');
  frame.update(null, 50); frame.update(null, 250); assert.equal(frame.snapshot(250).state, 'lost');
  frame.update({ x: .15, y: .5 }, 300); frame.update({ x: .04, y: .5 }, 340); assert.equal(frame.snapshot(340).state, 'edge');
  frame.update(null, 370); assert.equal(frame.snapshot(370).state, 'lost');
  frame.update(null, 560); assert.equal(frame.snapshot(560).state, 'outside');
  frame.update(null, 850); assert.equal(frame.snapshot(850).state, 'outside');
  assert.equal(frame.snapshot(1400).state, 'stale'); frame.update(null, 1450); assert.equal(frame.snapshot(1450).state, 'lost');
});
test('tracked outside needs no tracking loss; border/re-entry cancels hidden state', () => {
  const frame = new CargoFrame(); frame.update({ x: 1.06, y: .5 }, 0); assert.equal(frame.snapshot(0).state, 'outside');
  frame.update({ x: .98, y: .5 }, 50); assert.equal(frame.snapshot(50).state, 'edge');
  frame.update({ x: .89, y: .5 }, 100); assert.equal(frame.snapshot(100).state, 'inside');
  frame.update({ x: NaN, y: .5 }, 150); assert.equal(frame.snapshot(150).state, 'lost');
});
test('local records separate practice from human observations and survive reload', () => {
  const map = new Map(), backend = { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) };
  const records = createRecords(() => backend), answers = Object.fromEntries(GATE_KEYS.map(k => [k, 'yes']));
  records.add({ id: 'demo', source: 'demo' }); records.add({ id: 'camera', source: 'camera' });
  assert.equal(records.observe('demo', answers).accepted, false); assert.equal(records.observe('camera', {}).accepted, false);
  assert.equal(records.observe('camera', answers).persisted, true); assert.equal(records.humanCount(), 1);
  const fresh = createRecords(() => backend); assert.equal(fresh.humanCount(), 1); assert.equal(fresh.all()[1].observations.swapAgain, 'yes');
  map.set(RECORD_KEY, '{broken'); assert.equal(createRecords(() => backend).all().length, 0);
});
test('blocked local storage retains exportable session records without claiming persistence', () => {
  const records = createRecords(() => { throw new Error('blocked'); });
  assert.equal(records.add({ id: 'one', source: 'camera' }), false);
  const saved = records.observe('one', Object.fromEntries(GATE_KEYS.map(k => [k, 'unobserved'])));
  assert.deepEqual(saved, { accepted: true, persisted: false }); assert.equal(records.all().length, 1);
});
