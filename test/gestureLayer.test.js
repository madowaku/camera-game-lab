import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGestureEngine, GestureState, TrackResolver, normalizeHandObservation,
  observationsFromMediaPipe, gestureDiagnostics,
} from '../src/gesture/index.js';

function hand(x = .4, y = .5, category = 'Open_Palm') {
  const landmarks = Array.from({ length: 21 }, (_, i) => ({ x, y: y + (i % 3) * .002, z: 0 }));
  landmarks[0] = { x, y: y + .15, z: 0 };
  landmarks[5] = { x: x - .04, y: y - .03, z: 0 };
  landmarks[9] = { x, y: y - .03, z: 0 };
  landmarks[13] = { x: x + .03, y: y - .03, z: 0 };
  landmarks[17] = { x: x + .05, y: y + .01, z: 0 };
  landmarks[8] = { x: x - .06, y: y - .1, z: 0 };
  return { landmarks, category, categoryScore: .85 };
}
const grip = obs => ({ GRIP: { signal: obs.category === 'Closed_Fist' ? 'active' :
  obs.category === 'Open_Palm' ? 'neutral' : 'unknown', metric: obs.categoryScore } });
function engine(options = {}) {
  return createGestureEngine({ gestures: { GRIP: { neutralMs: 80, enterMs: 60, leaveMs: 60 } },
    signalReader: grip, ...options });
}
const eventTypes = frame => frame.events.map(e => e.type);

test('observations: canonical unmirrored center, category and input preservation', () => {
  const input = hand(.2, .5), raw = structuredClone(input);
  const o = normalizeHandObservation(input, 100, { videoAspect: .5625 });
  assert.equal(o.space, 'video-normalized-unmirrored');
  assert.equal(o.tip.x, .14);
  assert.ok(o.palm.x < .3);
  assert.equal(o.categoryScore, .85);
  assert.equal(o.handedness, 'Unknown');
  assert.deepEqual(input, raw);
  const result = observationsFromMediaPipe({ landmarks: [input.landmarks],
    handednesses: [[{ categoryName: 'Right' }]], gestures: [[{ categoryName: 'Victory', score: .91 }]] }, 100);
  assert.equal(result[0].category, 'Victory');
  assert.equal(result[0].handedness, 'Right');
  assert.equal(result[0].categoryScore, .91);
});

test('observations: reject malformed, out of bounds, nonfinite, degenerate', () => {
  const values = [null, undefined, { landmarks: [] }, { landmarks: hand().landmarks.slice(0, 20) }];
  for (const value of values) assert.equal(normalizeHandObservation(value, 0), null);
  for (const value of [NaN, Infinity, -Infinity, 0, -1]) {
    assert.equal(normalizeHandObservation(hand(), 0, { videoAspect: value }), null);
  }
  for (const value of [NaN, Infinity, -0.2, 1.2]) {
    const candidate = hand(); candidate.landmarks[9].x = value;
    assert.equal(normalizeHandObservation(candidate, 0), null);
  }
  const flat = hand(); flat.landmarks = flat.landmarks.map(() => ({ x: .5, y: .5 }));
  assert.equal(normalizeHandObservation(flat, 0), null);
  assert.deepEqual(observationsFromMediaPipe({}, 0), []);
});

test('state: startup rearm, candidates, exact once start and end, unknown does not release', () => {
  const s = new GestureState({ neutralMs: 80, enterMs: 60, leaveMs: 60 });
  assert.equal(s.update('active', 0), null);
  assert.equal(s.armed, false);
  s.update('neutral', 20); s.update('neutral', 99);
  assert.equal(s.armed, false);
  s.update('neutral', 100); assert.equal(s.armed, true);
  s.update('active', 110); s.update('active', 169);
  assert.equal(s.active, false);
  assert.equal(s.update('active', 170), 'GESTURE_START');
  for (const at of [171, 200, 300]) assert.equal(s.update('active', at), null);
  s.update('neutral', 320); s.update('unknown', 340);
  assert.equal(s.active, true);
  s.update('neutral', 350);
  assert.equal(s.update('neutral', 410), 'GESTURE_END');
  s.update('active', 420);
  assert.equal(s.update('active', 480), 'GESTURE_START');
  s.interrupt(); assert.equal(s.active, false); assert.equal(s.armed, false);
});

test('state: zero-duration thresholds and invalid timestamps', () => {
  const s = new GestureState({ neutralMs: 0, enterMs: 0, leaveMs: 0 });
  s.update('neutral', 10); assert.equal(s.armed, true);
  assert.equal(s.update('active', 10), null);
  assert.equal(s.update('active', 9), null);
  assert.equal(s.update('active', NaN), null);
  assert.equal(s.update('active', 11), 'GESTURE_START');
  assert.equal(s.update('neutral', 12), 'GESTURE_END');
  for (const value of [-1, Infinity, NaN]) assert.throws(() => new GestureState({ neutralMs: value }), RangeError);
});

test('engine: continuous actions remain edge-triggered across rendering frames', () => {
  const g = engine();
  g.update([hand()], 0);
  g.advance(20); g.advance(75);
  assert.equal(g.getSnapshot().tracks[0].status, 'TRACKING');
  assert.equal(g.getSnapshot().tracks[0].gestures.GRIP.armed, false);
  g.update([hand()], 80);
  assert.equal(g.getSnapshot().tracks[0].gestures.GRIP.armed, true);
  let out = g.update([hand(.4, .5, 'Closed_Fist')], 100);
  assert.deepEqual(eventTypes(out), []);
  out = g.update([hand(.4, .5, 'Closed_Fist')], 160);
  assert.deepEqual(eventTypes(out), ['GESTURE_START']);
  assert.equal(out.events[0].trackId, 'hand-1');
  assert.equal(out.events[0].gesture, 'GRIP');
  assert.deepEqual(eventTypes(g.advance(165)), []);
  assert.deepEqual(eventTypes(g.update([hand(.4, .5, 'Closed_Fist')], 200)), []);
  g.update([hand()], 220);
  assert.deepEqual(eventTypes(g.update([hand()], 280)), ['GESTURE_END']);
});

test('engine: missing hand, grace, exactly one loss event, neutral rearm on return', () => {
  const g = engine();
  g.update([hand()], 0); g.update([hand()], 80);
  g.update([hand(.4, .5, 'Closed_Fist')], 90);
  g.update([hand(.4, .5, 'Closed_Fist')], 150);
  let out = g.update([], 160);
  assert.equal(out.tracks[0].status, 'GRACE');
  assert.equal(out.tracks[0].gestures.GRIP.active, false);
  out = g.advance(450);
  assert.deepEqual(eventTypes(out), ['TRACK_LOST']);
  assert.equal(out.tracks[0].fresh, false);
  assert.equal(out.tracks[0].palm, null);
  assert.deepEqual(eventTypes(g.advance(500)), []);
  out = g.update([hand(.4, .5, 'Closed_Fist')], 501);
  assert.deepEqual(eventTypes(out), ['TRACK_RETURNED']);
  assert.equal(out.tracks[0].gestures.GRIP.armed, false);
  g.update([hand(.4, .5, 'Closed_Fist')], 570);
  assert.deepEqual(eventTypes(g.update([hand(.4, .5, 'Closed_Fist')], 640)), []);
  g.update([hand()], 710); g.update([hand()], 790);
  g.update([hand(.4, .5, 'Closed_Fist')], 810);
  assert.deepEqual(eventTypes(g.update([hand(.4, .5, 'Closed_Fist')], 870)), ['GESTURE_START']);
  assert.equal(g.getSnapshot().metrics.lossCount, 1);
});

test('engine: inference gaps never advance a candidate without fresh measurements', () => {
  const g = engine();
  g.update([hand()], 0); g.update([hand()], 80);
  g.update([hand(.4, .5, 'Closed_Fist')], 90);
  assert.equal(g.advance(120).tracks[0].gestures.GRIP.candidateMs, 0);
  let out = g.advance(241);
  assert.equal(out.tracks[0].status, 'GRACE');
  assert.equal(out.tracks[0].gestures.GRIP.phase, 'UNARMED');
  out = g.update([hand(.4, .5, 'Closed_Fist')], 245);
  assert.deepEqual(eventTypes(out), []);
  assert.equal(out.tracks[0].gestures.GRIP.armed, false);
});

test('engine: reject duplicate/backwards frames and malformed hands', () => {
  const g = engine();
  g.update([hand()], 100);
  assert.equal(g.update([hand()], 100).metrics.rejectedFrames, 1);
  assert.equal(g.update([hand()], 99).metrics.rejectedFrames, 2);
  assert.equal(g.advance(NaN).metrics.rejectedFrames, 2);
  assert.equal(g.update([{}], 200).metrics.rejectedHands, 1);
  assert.equal(g.getSnapshot().tracks[0].status, 'GRACE');
});

test('resolver: identity is independent of detection array order', () => {
  const r = new TrackResolver({ maxHands: 2, maxDistance: .45 });
  const a = x => normalizeHandObservation(hand(x), 0);
  let out = r.resolve([a(.2), a(.8)], 0);
  assert.ok(out.matches.get('hand-1').palm.x < out.matches.get('hand-2').palm.x);
  out = r.resolve([a(.75), a(.25)], 100);
  assert.ok(out.matches.get('hand-1').palm.x < out.matches.get('hand-2').palm.x);
  out = r.resolve([a(.7), a(.3)], 200);
  assert.ok(out.matches.get('hand-1').palm.x < out.matches.get('hand-2').palm.x);
});

test('resolver: colliding detections refuse ambiguous assignments', () => {
  const r = new TrackResolver({ maxHands: 2, maxDistance: .5, ambiguityMargin: .1 });
  const a = x => normalizeHandObservation(hand(x), 0);
  r.resolve([a(.42), a(.58)], 0);
  const out = r.resolve([a(.5), a(.5)], 100);
  assert.deepEqual([...out.ambiguousIds].sort(), ['hand-1', 'hand-2']);
  assert.equal(out.matches.size, 0);
  assert.ok(r.tracks[0].palm.x < r.tracks[1].palm.x);
});

test('engine: independent two-hand inputs; ambiguous crossings cannot fire actions', () => {
  const g = engine({ maxHands: 2, maxMatchDistance: .45, ambiguityMargin: .08 });
  g.update([hand(.2), hand(.8)], 0);
  g.update([hand(.8), hand(.2)], 80);
  let out = g.update([hand(.2, .5, 'Closed_Fist'), hand(.8)], 100);
  assert.equal(out.tracks[0].gestures.GRIP.phase, 'CANDIDATE');
  assert.equal(out.tracks[1].gestures.GRIP.phase, 'READY');
  out = g.update([hand(.8), hand(.2, .5, 'Closed_Fist')], 160);
  assert.deepEqual(out.events.map(e => [e.trackId, e.type]), [['hand-1', 'GESTURE_START']]);
  out = g.update([hand(.5), hand(.5)], 200);
  assert.ok(out.tracks.some(t => t.status === 'AMBIGUOUS'));
  assert.equal(out.events.some(e => e.type === 'GESTURE_START'), false);
});

test('diagnostics: stale hands cannot appear as live input', () => {
  const g = engine();
  g.update([hand()], 0); g.update([hand()], 80);
  const live = gestureDiagnostics(g.getSnapshot());
  assert.equal(live.tracks[0].coordinateSpace, 'video-normalized-unmirrored');
  assert.ok(live.tracks[0].rawPalm);
  const out = gestureDiagnostics(g.advance(400));
  assert.equal(out.tracks[0].rawPalm, null);
  assert.equal(out.tracks[0].fresh, false);
  assert.deepEqual(Object.keys(out.tracks[0].gestures.GRIP).sort(), ['active', 'armed', 'candidateMs', 'phase']);
});

test('reset and dispose clear states and preclude phantom input', () => {
  const g = engine();
  g.update([hand()], 0);
  assert.equal(g.getSnapshot().tracks.length, 1);
  g.reset(); assert.deepEqual(g.getSnapshot().tracks, []);
  g.update([hand()], 0);
  g.dispose(); assert.deepEqual(g.getSnapshot().tracks, []);
  assert.deepEqual(g.update([hand()], 100).tracks, []);
  assert.deepEqual(g.advance(110).events, []);
});
