import test from 'node:test';
import assert from 'node:assert/strict';
import { GripInput } from '../src/input/gripInput.js';
import { PinchInput } from '../src/input/pinchInput.js';
import { GripState } from '../src/input/gripState.js';
import { PinchState, readPinch } from '../src/input/pinchState.js';
import { createGestureABProbe, gripSignal, pinchSignal } from '../src/gesture/index.js';

function result(category = 'Open_Palm', ratio = .65, score = .92, x = .4) {
  const p = Array.from({ length: 21 }, () => ({ x, y: .50, z: 0 }));
  p[0] = { x, y: .68, z: 0 };
  p[5] = { x: x - .04, y: .43, z: 0 };
  p[9] = { x, y: .48, z: 0 };
  p[13] = { x: x + .04, y: .43, z: 0 };
  p[17] = { x: x + .07, y: .49, z: 0 };
  p[8] = { x: x - .06, y: .35, z: 0 };
  // Wrist to middle MCP is .20; tip distance = ratio * .20 at aspect 1.
  p[4] = { x: p[8].x + ratio * .2, y: .35, z: 0 };
  return { landmarks: [p], gestures: [[{ categoryName: category, score }]],
    handednesses: [[{ categoryName: 'Right' }]] };
}
const eventNames = (o, category) => o.B.events.filter(e => e.gesture === category).map(e => e.type);

test('P1 grip adapter respects confidence and unknown poses', () => {
  const grip = (category, score) => gripSignal({ category, categoryScore: score });
  assert.equal(grip('Closed_Fist', .8).signal, 'active');
  assert.equal(grip('Open_Palm', .8).signal, 'neutral');
  assert.equal(grip('Closed_Fist', .59).signal, 'unknown');
  assert.equal(grip('Victory', .9).signal, 'unknown');
  assert.equal(grip('Open_Palm', null).signal, 'unknown');
  assert.equal(grip('Open_Palm', Number.NaN).metric, null);
});

test('P1 pinch adapter uses existing aspect-corrected wrist/MCP relative distance', () => {
  const source = result('Open_Palm', .2).landmarks[0];
  for (const aspect of [1, .6, 1.8]) {
    const obs = { landmarks: source, videoAspect: aspect };
    const a = readPinch({ landmarks: [source] }, aspect);
    const b = pinchSignal(obs);
    assert.equal(b.metric, a.pinchRatio);
    assert.equal(b.signal, a.pinchRatio <= .30 ? 'active' : a.pinchRatio >= .42 ? 'neutral' : 'unknown');
  }
  assert.equal(pinchSignal(null).signal, 'unknown');
});

test('P1 grip A/B receives the same input but B never controls legacy gameplay', () => {
  const probe = createGestureABProbe();
  let o = probe.update(result(), 0, 1);
  assert.equal(o.B.gestures.GRIP.armed, false);
  o = probe.update(result(), 80, 1);
  assert.equal(o.B.gestures.GRIP.armed, true);
  o = probe.update(result('Closed_Fist'), 100, 1);
  assert.equal(o.B.gestures.GRIP.active, false);
  o = probe.update(result('Closed_Fist'), 180, 1);
  assert.equal(o.A.GRIP.active, true);
  assert.equal(o.B.gestures.GRIP.active, true);
  assert.deepEqual(eventNames(o, 'GRIP'), ['GESTURE_START']);
  o = probe.update(result('Victory'), 200, 1);
  assert.equal(o.B.gestures.GRIP.active, true);
  assert.equal(o.A.GRIP.active, true);
  probe.update(result(), 220, 1);
  o = probe.update(result(), 300, 1);
  assert.deepEqual(eventNames(o, 'GRIP'), ['GESTURE_END']);
  assert.equal(o.A.GRIP.active, false);
  assert.equal(o.B.gestures.GRIP.active, false);
  assert.equal(o.sampleCount, 7);
});

test('P1 pinch B uses elapsed time, A retains two-frame hysteresis', () => {
  const probe = createGestureABProbe();
  probe.update(result('Open_Palm', .6), 0, 1);
  let o = probe.update(result('Open_Palm', .6), 10, 1);
  assert.equal(o.B.gestures.PINCH.armed, true);
  assert.equal(o.A.PINCH.armed, true);
  o = probe.update(result('Open_Palm', .2), 30, 1);
  assert.equal(o.B.gestures.PINCH.active, false);
  o = probe.update(result('Open_Palm', .2), 70, 1);
  assert.deepEqual(o.A.PINCH.events, ['PINCH_START']);
  assert.deepEqual(eventNames(o, 'PINCH'), ['GESTURE_START']);
  o = probe.update(result('Open_Palm', .36), 80, 1);
  assert.equal(o.B.gestures.PINCH.active, true);
  assert.equal(o.A.PINCH.active, true);
  probe.update(result('Open_Palm', .6), 100, 1);
  o = probe.update(result('Open_Palm', .6), 145, 1);
  assert.deepEqual(eventNames(o, 'PINCH'), ['GESTURE_END']);
  assert.deepEqual(o.A.PINCH.events, ['PINCH_END']);
});

test('P1 B never emits START on fist/pinch first frame without neutral rearm', () => {
  const probe = createGestureABProbe();
  probe.update(result('Closed_Fist', .15), 0, 1);
  const o = probe.update(result('Closed_Fist', .15), 100, 1);
  assert.equal(o.B.gestures.GRIP.active, false);
  assert.equal(o.B.gestures.PINCH.active, false);
  assert.equal(o.B.gestures.GRIP.armed, false);
  assert.equal(o.B.gestures.PINCH.armed, false);
  assert.deepEqual(o.B.events.filter(e => e.type === 'GESTURE_START'), []);
});

test('P1 missing frames stop B immediately and returning held fingers never auto fire', () => {
  const probe = createGestureABProbe();
  probe.update(result(), 0, 1); probe.update(result(), 80, 1);
  probe.update(result('Closed_Fist'), 100, 1);
  let o = probe.update(result('Closed_Fist'), 180, 1);
  assert.equal(o.B.gestures.GRIP.active, true);
  o = probe.update(null, 200, 1);
  assert.equal(o.B.status, 'GRACE');
  assert.equal(o.B.gestures.GRIP.active, false);
  o = probe.advance(481);
  assert.equal(o.B.status, 'LOST');
  assert.equal(o.B.fresh, false);
  assert.equal(o.A.GRIP.fresh, false);
  o = probe.update(result('Closed_Fist'), 500, 1);
  assert.equal(o.B.gestures.GRIP.armed, false);
  assert.deepEqual(o.B.events.filter(e => e.type === 'GESTURE_START'), []);
  probe.update(result(), 600, 1); probe.update(result(), 680, 1);
  probe.update(result('Closed_Fist'), 700, 1);
  o = probe.update(result('Closed_Fist'), 780, 1);
  assert.deepEqual(eventNames(o, 'GRIP'), ['GESTURE_START']);
});

test('P1 duplicate and regressed timestamps do not rerun A state or B', () => {
  const probe = createGestureABProbe();
  probe.update(result(), 100, 1);
  let o = probe.update(result(), 180, 1);
  assert.equal(o.sampleCount, 2);
  const before = structuredClone(o);
  assert.deepEqual(probe.update(result('Closed_Fist'), 180, 1), before);
  assert.deepEqual(probe.update(result('Closed_Fist'), 160, 1), before);
});

test('P1 20/25/30/60/120Hz gesture qualification is elapsed-time based', () => {
  for (const hz of [20, 25, 30, 60, 120]) {
    const probe = createGestureABProbe(), dt = 1000 / hz;
    const events = [];
    for (let i = 0; i < hz * .55; i++) {
      const at = Number((i * dt).toFixed(5));
      const pose = at < 200 ? 'Open_Palm' : 'Closed_Fist';
      const o = probe.update(result(pose, .65), at, 1);
      events.push(...eventNames(o, 'GRIP'));
    }
    assert.deepEqual(events, ['GESTURE_START'], 'fps ' + hz);
  }
});

test('P1 optional GripInput comparison leaves the original onFrame unchanged', () => {
  const a = [], b = [], video = { videoWidth: 640, videoHeight: 640 };
  const legacy = new GripInput(video, { onFrame: f => a.push(f) });
  const experimental = new GripInput(video, { compareGestures: true, onFrame: f => b.push(f) });
  for (const [at, source] of [[0, result()], [80, result()],
    [100, result('Closed_Fist')], [180, result('Closed_Fist')], [260, result()]]) {
    legacy.processResult(source, at); experimental.processResult(source, at);
  }
  assert.deepEqual(b, a);
  assert.equal(legacy.lastComparison, null);
  assert.ok(experimental.lastComparison.B.gestures.GRIP.active);
  legacy.stop(); experimental.stop();
  assert.equal(experimental.lastComparison, null);
  assert.equal(experimental.comparison.getSnapshot().sampleCount, 0);
});

test('P1 optional PinchInput comparison retains all A events and reset', () => {
  const a = [], b = [], video = { videoWidth: 640, videoHeight: 640 };
  const legacy = new PinchInput(video, { onFrame: f => a.push(f) });
  const experimental = new PinchInput(video, { compareGestures: true, onFrame: f => b.push(f) });
  for (const [at, ratio] of [[0, .6], [30, .6], [70, .2], [120, .2], [170, .65], [220, .65]]) {
    const source = result('Open_Palm', ratio);
    legacy.processResult(source, at); experimental.processResult(source, at);
  }
  assert.deepEqual(b, a);
  assert.ok(experimental.lastComparison.B);
  experimental.stop(); legacy.stop();
  assert.equal(experimental.lastComparison, null);
});

test('P1 A/B mismatch counts are labeled disagreement, never false positives', () => {
  const probe = createGestureABProbe();
  probe.update(result('Closed_Fist', .18), 0, 1);
  const o = probe.update(result('Closed_Fist', .18), 20, 1);
  assert.equal(o.B.gestures.GRIP.armed, false);
  assert.equal(o.B.gestures.PINCH.armed, false);
  assert.ok(o.disagreements.GRIP >= 0);
  assert.ok(o.disagreements.PINCH >= 0);
  assert.equal('falsePositive' in o, false);
  probe.reset();
  assert.deepEqual(probe.getSnapshot().disagreements, { GRIP: 0, PINCH: 0 });
});

test('P1 optional probe failures cannot suppress legacy input callback', () => {
  const frames = [];
  const video = { videoWidth: 640, videoHeight: 640 };
  const input = new GripInput(video, { compareGestures: true, onFrame: value => frames.push(value) });
  const originalWarn = console.warn;
  try {
    console.warn = () => {};
    input.comparison.update = () => { throw new Error('simulated B-only detector error'); };
    assert.doesNotThrow(() => input.processResult(result(), 0));
    assert.equal(frames.length, 1);
    assert.equal(frames[0].present, true);
    assert.equal(input.comparison, null);
    input.processResult(result(), 80);
    assert.equal(frames.length, 2);
  } finally {
    console.warn = originalWarn;
    input.stop();
  }
});

test('P1 camera absence does not resurrect stale A coordinates or invent B events', () => {
  const probe = createGestureABProbe();
  probe.update(result(), 0, 1);
  probe.update(result(), 80, 1);
  const before = probe.getSnapshot();
  assert.ok(before.A.GRIP.position);
  const after = probe.advance(400);
  assert.equal(after.A.GRIP.position, null);
  assert.equal(after.A.GRIP.active, false);
  assert.equal(after.B.status, 'LOST');
  assert.equal(after.B.events.some(e => e.type === 'GESTURE_START'), false);
  assert.equal(after.B.recentEvents.at(-1).type, 'TRACK_LOST');
});
