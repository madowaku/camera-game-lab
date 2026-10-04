import test from "node:test";
import assert from "node:assert/strict";
import { HeadNodTracker, extractHeadPitch } from "../src/input/headNod.js";
import { FaceZoneInput } from "../src/input/faceZoneInput.js";
import { DaitaiHeroGame } from "../src/games/daitaiHero.js";

function result(pitch = 0, { x = 0.5, yaw = 0, roll = 0, scale = 1, translation = [0, 0, -40] } = {}) {
  const [p, y, r] = [pitch, yaw, roll].map(deg => deg * Math.PI / 180);
  const [cp, sp, cy, sy, cr, sr] = [Math.cos(p), Math.sin(p), Math.cos(y), Math.sin(y), Math.cos(r), Math.sin(r)];
  // Rz * Ry * Rx, stored by columns as MediaPipe returns it.
  const data = [cr * cy, sr * cy, -sy, 0,
    cr * sy * sp - sr * cp, sr * sy * sp + cr * cp, cy * sp, 0,
    cr * sy * cp + sr * sp, sr * sy * cp - cr * sp, cy * cp, 0,
    ...translation, 1];
  for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) data[i] *= scale;
  const points = [];
  points[234] = { x: 1 - x - 0.1, y: 0.5 };
  points[454] = { x: 1 - x + 0.1, y: 0.5 };
  return { faceLandmarks: [points], facialTransformationMatrixes: [{ rows: 4, columns: 4, data }] };
}

function calibrated(config = {}) {
  const tracker = new HeadNodTracker({ calibrationMs: 200, smoothingMs: 0.001, ...config });
  for (let t = 0; t <= 400; t += 20) tracker.update(7, t);
  assert.equal(tracker.sample(400).ready, true);
  assert.equal(tracker.armed, true);
  return tracker;
}

function move(tracker, duration, delta = 0, centered = true) {
  const end = tracker.lastFrameAt + duration;
  while (tracker.lastFrameAt < end) tracker.update(tracker.basePitch + delta, Math.min(end, tracker.lastFrameAt + 20), centered);
  return tracker.sample(end);
}

test("matrix pitch detects downward rotation independently of translation, scale, yaw and roll alone", () => {
  for (const angle of [-20, 0, 20]) assert.ok(Math.abs(extractHeadPitch(result(angle)) - angle) < 1e-8);
  assert.ok(Math.abs(extractHeadPitch(result(20, { scale: 3, translation: [8, -15, -80] })) - 20) < 1e-8);
  for (const options of [{ yaw: 40 }, { yaw: -40 }, { roll: 25 }, { roll: -25 }]) {
    assert.ok(Math.abs(extractHeadPitch(result(0, options))) < 1e-8);
  }
  const moved = result();
  for (const point of moved.faceLandmarks[0].filter(Boolean)) point.y += 0.2;
  assert.ok(Math.abs(extractHeadPitch(moved)) < 1e-8);
  for (const bad of [{}, { ...result(), faceLandmarks: [] }, { ...result(), facialTransformationMatrixes: [] },
    { ...result(), faceLandmarks: [[], []] }]) assert.equal(extractHeadPitch(bad), null);
  const invalid = result(); invalid.facialTransformationMatrixes[0].data[9] = NaN;
  assert.equal(extractHeadPitch(invalid), null);
  invalid.facialTransformationMatrixes[0].data.fill(0);
  assert.equal(extractHeadPitch(invalid), null);
});

test("pitch calibrates a stable initial posture and restarts after motion, loss or off-center samples", () => {
  const tracker = new HeadNodTracker({ calibrationMs: 200 });
  for (let t = 0; t <= 160; t += 20) tracker.update(7, t);
  assert.equal(tracker.update(15, 180).calibrationProgress, 0);
  assert.equal(tracker.update(null, 200).ready, false);
  for (let t = 220; t <= 460; t += 20) tracker.update(7, t, false);
  assert.equal(tracker.sample(460).calibrationProgress, 0);
  for (let t = 480; t <= 680; t += 20) tracker.update(7, t);
  assert.equal(tracker.basePitch, 7);
  assert.equal(tracker.sample(680).ready, true);
});

test("ten deliberate nods select once each, including repeated rendering samples", () => {
  const tracker = calibrated();
  for (let i = 1; i <= 10; i++) {
    move(tracker, 180, 18);
    assert.equal(tracker.sample(tracker.lastFrameAt).nodPhase, "RETURN");
    assert.equal(tracker.nodId, i - 1);
    const sample = move(tracker, 180);
    assert.equal(sample.nodId, i);
    assert.ok(sample.nodStartedAt < tracker.lastFrameAt);
    assert.deepEqual(tracker.sample(tracker.lastFrameAt), sample);
    move(tracker, 300);
    assert.equal(tracker.nodId, i);
  }
});

test("standing still, upward tilts, small shakes and a one-frame downward spike never complete a nod", () => {
  const tracker = calibrated();
  move(tracker, 2000);
  move(tracker, 180, 4); move(tracker, 180);
  move(tracker, 180, 9); move(tracker, 180);
  move(tracker, 180, -20); move(tracker, 300);
  move(tracker, 20, 25); move(tracker, 300);
  assert.equal(tracker.nodId, 0);
  move(tracker, 180, 18); move(tracker, 180);
  assert.equal(tracker.nodId, 1);
});

test("holding the head down expires and requires an upright reset before a fresh nod", () => {
  const tracker = calibrated();
  move(tracker, 2000, 18); move(tracker, 400);
  assert.equal(tracker.nodId, 0);
  move(tracker, 180, 18); move(tracker, 180);
  assert.equal(tracker.nodId, 1);
});

test("sideways motion cancels a pending nod; returning from the side cannot select center", () => {
  const tracker = calibrated();
  move(tracker, 180, 18); move(tracker, 100, 18, false); move(tracker, 400);
  assert.equal(tracker.nodId, 0);
  move(tracker, 180, 18); move(tracker, 180);
  assert.equal(tracker.nodId, 1);
});

test("face loss and stale-frame gaps discard pending nods while preserving calibration", () => {
  for (const lose of [tracker => tracker.update(null, tracker.lastFrameAt + 20),
    tracker => tracker.update(7, tracker.lastFrameAt + 400),
    tracker => tracker.sample(tracker.lastFrameAt + 400)]) {
    const tracker = calibrated(); move(tracker, 180, 18);
    lose(tracker); move(tracker, 400);
    assert.equal(tracker.basePitch, 7);
    assert.equal(tracker.nodId, 0);
    move(tracker, 180, 18); move(tracker, 180);
    assert.equal(tracker.nodId, 1);
  }
});

test("combined input needs one face and pitch, cancels side/lost-face nods and resets on recalibration", () => {
  const input = new FaceZoneInput(null, { config: { calibrationMs: 200, smoothingMs: 0.001 } });
  let t = 0;
  const send = (duration, pitch = 0, options = {}) => {
    for (const end = t + duration; t < end;) { t += 20; input.processResult(result(pitch, options), t); }
    return input.sample(t);
  };
  send(500);
  assert.equal(input.sample(t).ready, true);
  send(180, 18); assert.equal(input.sample(t).neutral, false);
  send(180); assert.equal(input.sample(t).nodId, 1);
  send(400); send(180, 18); send(100, 18, { x: 0.35 }); send(400);
  assert.equal(input.sample(t).nodId, 1);
  send(180, 18);
  const two = result(); two.faceLandmarks.push(two.faceLandmarks[0]);
  input.processResult(two, t += 20);
  assert.equal(input.sample(t).ready, false);
  send(400); assert.equal(input.sample(t).nodId, 1);
  const missingMatrix = result(); missingMatrix.facialTransformationMatrixes = [];
  input.processResult(missingMatrix, t += 20); assert.equal(input.sample(t).ready, false);
  send(400); send(180, 18); send(180); assert.equal(input.sample(t).nodId, 2);
  input.recalibrate(); assert.equal(input.sample(t).ready, false); assert.equal(input.sample(t).nodId, 0);
});

test("nod events from countdown, feedback or tracking recovery cannot answer a new question", () => {
  const neutral = { ready: true, neutral: true, zone: "NEUTRAL", nodId: 0 };
  const game = new DaitaiHeroGame({ rules: { countdownMs: 200 } });
  game.start("FACE", 0); game.tick(0, neutral);
  game.tick(200, { ...neutral, nodId: 1, nodStartedAt: 20 });
  game.tick(220, { ...neutral, nodId: 1, nodStartedAt: 20 });
  assert.equal(game.logs.length, 0);
  game.tick(400, { ...neutral, nodId: 2, nodStartedAt: 240 });
  assert.equal(game.logs.length, 1);
  game.tick(500, { ...neutral, nodId: 3, nodStartedAt: 440 });
  game.tick(1000, { ...neutral, nodId: 3, nodStartedAt: 440 });
  game.tick(1020, { ...neutral, nodId: 3, nodStartedAt: 440 });
  assert.equal(game.logs.length, 1);
  // A gesture begun during feedback but completed after the new question.
  game.tick(1040, { ...neutral, nodId: 4, nodStartedAt: 900 });
  assert.equal(game.logs.length, 1);
  game.tick(1060, { ready: false, nodId: 4 });
  game.tick(1260, { ...neutral, nodId: 5, nodStartedAt: 1080 });
  game.tick(1280, { ...neutral, nodId: 5, nodStartedAt: 1080 });
  assert.equal(game.logs.length, 1);
  game.tick(1460, { ...neutral, nodId: 6, nodStartedAt: 1300 });
  assert.equal(game.logs.length, 2);
});
