import test from "node:test";
import assert from "node:assert/strict";
import { DuoTracker } from "../src/input/duoTracker.js";
import { DUO_CONFIG } from "../src/input/duoConfig.js";
import { DuoEmulator } from "../src/input/duoEmulator.js";
import { extractDuoFaces, DuoFaceInput } from "../src/input/duoFaceInput.js";

const face = (x, changes = {}) => ({ x, y: 0.5, scale: 0.25, tilt: 0, mouth: 0.04, ...changes });
function calibrated(left = face(0.3), right = face(0.7)) {
  const tracker = new DuoTracker();
  for (let time = 0; time <= 1000; time += 50) tracker.update([left, right], time);
  assert.equal(tracker.ready, true);
  return tracker;
}

test("a lone face cannot claim a player; initial assignment uses mirrored screen order", () => {
  const tracker = new DuoTracker();
  assert.equal(tracker.update([face(0.7)], 0).players[0].present, false);
  const state = tracker.update([face(0.7), face(0.3)], 50);
  assert.equal(state.players[0].center.x, 0.3);
  assert.equal(state.players[1].center.x, 0.7);
});

test("detector array permutations and small jitter do not exchange player IDs for 30 seconds", () => {
  const tracker = calibrated();
  for (let time = 1050; time <= 31_000; time += 50) {
    const left = face(0.3 + Math.sin(time / 300) * 0.01);
    const right = face(0.7 + Math.cos(time / 300) * 0.01);
    const players = tracker.update(time % 100 ? [right, left] : [left, right], time).players;
    assert.ok(players[0].center.x < 0.4);
    assert.ok(players[1].center.x > 0.6);
  }
  assert.equal(tracker.snapshot().metrics.identitySwapSuspicionCount, 0);
});

test("velocity and scale keep IDs when faces cross sides", () => {
  const tracker = calibrated(face(0.3, { scale: 0.23 }), face(0.7, { scale: 0.3 }));
  for (let frame = 1; frame <= 30; frame += 1) {
    const one = face(0.3 + frame * 0.015, { scale: 0.23 });
    const two = face(0.7 - frame * 0.015, { scale: 0.3 });
    const state = tracker.update(frame % 2 ? [two, one] : [one, two], 1000 + frame * 50);
    if (state.players.every((p) => p.present)) {
      assert.equal(state.players[0].center.x, one.x);
      assert.equal(state.players[1].center.x, two.x);
    }
  }
  assert.ok(tracker.snapshot().players[0].center.x > tracker.snapshot().players[1].center.x);
});

test("brief occlusion reserves the missing slot and ignores detection ordering", () => {
  const tracker = calibrated();
  const missing = tracker.update([face(0.7)], 1100);
  assert.equal(missing.players[0].present, false);
  assert.equal(missing.players[0].lost, false);
  assert.equal(missing.players[1].present, true);
  assert.equal(tracker.consumeEvents().length, 0);
  const returned = tracker.update([face(0.7), face(0.31)], 1500);
  assert.equal(returned.players[0].center.x, 0.31);
  assert.equal(returned.players[1].center.x, 0.7);
});

test("same-size faces retain motion identity through a crossing and an ambiguous frame", () => {
  const tracker = calibrated();
  for (let frame = 1; frame <= 30; frame += 1) {
    const one = face(0.3 + frame * 0.015), two = face(0.7 - frame * 0.015);
    const state = tracker.update(frame % 2 ? [two, one] : [one, two], 1000 + frame * 50);
    if (state.players.every((p) => p.present)) {
      assert.equal(state.players[0].center.x, one.x);
      assert.equal(state.players[1].center.x, two.x);
    }
  }
  const state = tracker.snapshot();
  assert.ok(state.players[0].center.x > 0.7);
  assert.ok(state.players[1].center.x < 0.3);
});

test("loss is explicit after 800ms, fires once, and return is independent", () => {
  const tracker = calibrated();
  tracker.update([face(0.7)], 1800);
  assert.deepEqual(tracker.consumeEvents().map((event) => [event.type, event.playerId]), [["PLAYER_LOST", 1]]);
  tracker.update([face(0.7)], 2500);
  assert.equal(tracker.consumeEvents().length, 0);
  tracker.update([face(0.7), face(0.3)], 2550);
  assert.deepEqual(tracker.consumeEvents().map((event) => [event.type, event.playerId]), [["PLAYER_RETURNED", 1]]);
  assert.equal(tracker.snapshot().metrics.playerLossCount, 1);
  assert.equal(tracker.snapshot().metrics.successfulRecoveryCount, 1);
  tracker.update([face(0.7), face(0.3)], 2600);
  assert.equal(tracker.snapshot().metrics.successfulRecoveryCount, 1);
});

test("inference FPS uses a warm rolling second and drops to zero when video stalls", () => {
  const tracker = new DuoTracker();
  tracker.update([], 0);
  assert.equal(tracker.snapshot().metrics.currentInferenceFps, null);
  for (let time = 50; time <= 1000; time += 50) tracker.update([], time);
  assert.equal(tracker.snapshot().metrics.currentInferenceFps, 20);
  assert.equal(tracker.snapshot().metrics.averageInferenceFps, 20);
  tracker.advance(1500);
  assert.equal(tracker.snapshot().metrics.currentInferenceFps, 10);
  tracker.advance(2100);
  assert.equal(tracker.snapshot().metrics.currentInferenceFps, 0);
  tracker.reset();
  assert.equal(tracker.snapshot().metrics.currentInferenceFps, null);
});

test("a stalled video also becomes missing and lost without an inference callback", () => {
  const tracker = calibrated();
  assert.equal(tracker.advance(1400).players[0].present, false);
  assert.equal(tracker.advance(1800).players[0].lost, true);
  assert.equal(tracker.snapshot().metrics.playerLossCount, 2);
});

test("an ambiguous overlapping face freezes both controls instead of stealing a slot", () => {
  const tracker = calibrated(face(0.45), face(0.55));
  const state = tracker.update([face(0.5)], 1050);
  assert.ok(state.players.every((p) => !p.present));
  assert.equal(state.metrics.identitySwapSuspicionCount, 1);
  tracker.update([face(0.5)], 1100);
  assert.equal(tracker.snapshot().metrics.identitySwapSuspicionCount, 1);
});

test("both players must stay stable with closed mouths for calibration", () => {
  const tracker = new DuoTracker();
  for (let time = 0; time <= 1500; time += 50) tracker.update([face(0.3), face(0.7, { mouth: 0.3 })], time);
  assert.equal(tracker.ready, false);
  for (let time = 1550; time <= 2200; time += 50) tracker.update([face(0.3), face(0.7)], time);
  assert.equal(tracker.ready, false);
  tracker.update([face(0.4), face(0.7)], 2250);
  assert.equal(tracker.calibrationProgress, 0);
  for (let time = 2300; time <= 3250; time += 50) tracker.update([face(0.4), face(0.7)], time);
  assert.equal(tracker.ready, true);
});

test("long calibration gaps reset the stable window", () => {
  const tracker = new DuoTracker();
  for (let time = 0; time <= 800; time += 50) tracker.update([face(0.3), face(0.7)], time);
  tracker.update([face(0.3), face(0.7)], 1300);
  assert.equal(tracker.ready, false);
  assert.equal(tracker.calibrationProgress, 0);
});

test("neutral positions, distance and tilt are calibrated separately for each player", () => {
  const tracker = calibrated(face(0.3, { scale: 0.2, tilt: 0.1 }), face(0.7, { scale: 0.35, tilt: -0.1 }));
  const state = tracker.update([face(0.32, { y: 0.52, scale: 0.22, tilt: 0.19 }), face(0.67, { scale: 0.315, tilt: -0.19 })], 1050);
  assert.ok(state.players[0].faceX > 0 && state.players[1].faceX < 0);
  assert.ok(state.players[0].faceY > 0);
  assert.ok(Math.abs(state.players[0].faceScale - 1.1) < 0.001);
  assert.ok(Math.abs(state.players[1].faceScale - 0.9) < 0.001);
  assert.ok(state.players[0].tilt > 0 && state.players[1].tilt < 0);
});

test("mouth input has per-player hysteresis, debounce and one open edge per held mouth", () => {
  const tracker = calibrated();
  for (let time = 1050; time <= 1600; time += 50) tracker.update([face(0.3, { mouth: 0.36 }), face(0.7)], time);
  assert.deepEqual(tracker.consumeEvents().map((e) => [e.type, e.playerId]), [["MOUTH_OPEN_START", 1]]);
  tracker.update([face(0.3, { mouth: 0.18 }), face(0.7)], 1650);
  assert.equal(tracker.snapshot().players[0].mouthOpen, true);
  for (let time = 1700; time <= 1850; time += 50) tracker.update([face(0.3), face(0.7, { mouth: 0.36 })], time);
  assert.deepEqual(tracker.consumeEvents().map((e) => [e.type, e.playerId]), [["MOUTH_OPEN_END", 1], ["MOUTH_OPEN_START", 2]]);
});

test("reacquiring an already-open mouth cannot fire until it closes and opens again", () => {
  const tracker = calibrated();
  tracker.update([face(0.7)], 1050);
  for (let time = 1100; time <= 1450; time += 50) tracker.update([face(0.3, { mouth: 0.4 }), face(0.7)], time);
  assert.equal(tracker.consumeEvents().length, 0);
  tracker.update([face(0.3), face(0.7)], 1500);
  for (let time = 1550; time <= 1700; time += 50) tracker.update([face(0.3, { mouth: 0.4 }), face(0.7)], time);
  assert.equal(tracker.consumeEvents()[0].type, "MOUTH_OPEN_START");
});

test("recalibration preserves identity and captures new neutral positions", () => {
  const tracker = calibrated();
  tracker.recalibrate();
  for (let time = 1050; time <= 2050; time += 50) tracker.update([face(0.35), face(0.65)], time);
  assert.equal(tracker.ready, true);
  assert.ok(Math.abs(tracker.snapshot().players[0].neutral.x - 0.35) < 0.001);
});

test("invalid detections and stale timestamps cannot corrupt normalized state", () => {
  const tracker = calibrated();
  tracker.update([face(NaN), face(0.7)], 1100);
  assert.equal(tracker.snapshot().players[0].present, false);
  tracker.update([face(0.2), face(0.8)], 900);
  assert.equal(tracker.snapshot().players[1].center.x, 0.7);
});

test("keyboard repeat cannot auto-fire; both players have independent edges", () => {
  const emulator = new DuoEmulator();
  emulator.key("KeyD", true); emulator.key("ArrowLeft", true);
  emulator.key("KeyW", true); emulator.key("KeyW", true); emulator.key("ArrowUp", true);
  const state = emulator.sample();
  assert.deepEqual(state.players.map((p) => p.faceX), [1, -1]);
  assert.deepEqual(state.events.map((e) => [e.type, e.playerId]), [["MOUTH_OPEN_START", 1], ["MOUTH_OPEN_START", 2]]);
  assert.equal(emulator.sample().events.length, 0);
  emulator.key("KeyW", false); emulator.key("KeyW", true);
  assert.equal(emulator.sample().events.filter((e) => e.type === "MOUTH_OPEN_START").length, 1);
});

test("multiple simultaneous touch pointers stay independent and release safely", () => {
  const emulator = new DuoEmulator();
  emulator.pointer(1, 1, "left", true); emulator.pointer(2, 2, "right", true); emulator.pointer(3, 2, "fire", true);
  assert.deepEqual(emulator.sample().players.map((p) => p.faceX), [-1, 1]);
  emulator.pointer(1, 1, "left", false);
  assert.deepEqual(emulator.sample().players.map((p) => p.faceX), [0, 1]);
  emulator.clear();
  assert.deepEqual(emulator.sample().players.map((p) => p.faceX), [0, 0]);
  assert.equal(emulator.sample().events.length, 0);
});

test("MediaPipe extraction mirrors screen X and corrects distances for landscape aspect", () => {
  const points = Array.from({ length: 468 }, () => ({ x: 0.2, y: 0.5 }));
  points[10] = { x: 0.2, y: 0.35 }; points[152] = { x: 0.2, y: 0.65 };
  points[61] = { x: 0.15, y: 0.55 }; points[291] = { x: 0.25, y: 0.55 };
  points[13] = { x: 0.2, y: 0.54 }; points[14] = { x: 0.2, y: 0.56 };
  points[33] = { x: 0.15, y: 0.43 }; points[263] = { x: 0.25, y: 0.43 };
  points[133] = { x: 0.18, y: 0.43 }; points[362] = { x: 0.22, y: 0.43 };
  const [detection] = extractDuoFaces({ faceLandmarks: [points] }, 2);
  assert.ok(Math.abs(detection.x - 0.8) < 0.001);
  assert.ok(Math.abs(detection.mouth - 0.1) < 0.001);
  assert.equal(detection.tilt, 0);
  const input = new DuoFaceInput({});
  assert.equal(input.cameraConstraints.video.width.ideal, 1280);
  assert.equal(DUO_CONFIG.playerLostGraceMs, 800);
});
