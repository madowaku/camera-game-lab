import test from "node:test";
import assert from "node:assert/strict";
import { AimLock, AIM_LOCK_MS } from "../src/input/aimLock.js";
import { FingerGunInput } from "../src/input/fingerGunInput.js";
import { HandInput, normalizeGesture } from "../src/input/handInput.js";
import { GripState, readGrip, projectGrip } from "../src/input/gripState.js";
import { SoftServeGame } from "../src/games/softServe.js";
import { SoftServeAnimation } from "../src/softServe/animation.js";
import { experiments } from "../src/platform/experiments.js";

const aim = { x: .5, y: .5, visible: true }, target = { id: 1, x: .5, y: .5, radius: .09 };
const hand = (categoryName = "Open_Palm", score = .9, x = .4, y = .5) => ({
  landmarks: [Array.from({ length: 21 }, () => ({ x, y }))], gestures: [[{ categoryName, score }]],
});

test("ten deliberate target locks fire once each after 250ms", () => {
  const lock = new AimLock(); let shots = 0;
  for (let i = 0; i < 10; i++) for (let at = 0; at <= 500; at += 50) {
    const output = lock.update(aim, { ...target, id: i }, i * 550 + at);
    if (at < AIM_LOCK_MS) assert.equal(output.fire, false);
    shots += Number(output.fire);
  }
  assert.equal(shots, 10);
});
test("off-target neutral input and short target sweeps never auto-fire", () => {
  const lock = new AimLock();
  for (let at = 0; at <= 30000; at += 50) {
    assert.equal(lock.update({ ...aim, x: .1 }, target, at).fire, false);
  }
  for (let at = 30050; at <= 35000; at += 50) {
    assert.equal(lock.update({ ...aim, x: at % 250 < 150 ? .5 : .1 }, target, at).fire, false);
  }
});
test("leaving, tracking loss, a stale frame and a target change reset lock progress", () => {
  for (const interruption of ["leave", "loss", "gap", "target"]) {
    const lock = new AimLock(); lock.update(aim, target, 0); lock.update(aim, target, 100);
    const at = interruption === "gap" ? 300 : 150;
    const next = interruption === "target" ? { ...target, id: 2 } : target;
    lock.update({ ...aim, x: interruption === "leave" ? 0 : .5, visible: interruption !== "loss" }, next, at);
    const output = lock.update(aim, next, at + 50);
    assert.equal(output.fire, false); assert.ok(output.progress <= .2);
  }
});
test("pointing at a target or folding the thumb alone never fires the finger gun", () => {
  const video = { videoWidth: 100, videoHeight: 100, clientWidth: 100, clientHeight: 100 };
  const result = hand(); const p = result.landmarks[0];
  p[0] = { x: .5, y: .8 }; p[9] = { x: .5, y: .55 };
  [5,6,7,8].forEach((i,n) => { p[i] = { x: .5, y: .55 - n * .1 }; });
  let shots = 0, latest;
  const input = new FingerGunInput(video, { getTarget: () => ({ ...target, y: .055 }), onShot: () => shots++, onAim: value => latest = value });
  const lips = []; lips[61] = { x: .4, y: .6 }; lips[291] = { x: .6, y: .6 };
  lips[13] = { x: .5, y: .6 }; lips[14] = { x: .5, y: .61 };
  const face = { faceLandmarks: [lips] };
  for (let at = 0; at <= 1000; at += 50) input.processResult({ hand: result, face }, at);
  assert.equal(shots, 0); assert.equal(latest.onTarget, true); assert.equal(input.mouthInput.currentMouth.ready, true);
  for (let at = 1050; at < 1500; at += 50) { p[4] = { x: at % 100 ? .5 : .8, y: .5 }; input.processResult({ hand: result, face }, at); }
  assert.equal(shots, 0);
  input.processResult({ face }, 1500); assert.equal(latest.visible, false); assert.equal(latest.onTarget, false);
});
test("HAND BEAT uses the four canned gestures and never a fingertip-distance override", () => {
  const mapped = ["Open_Palm", "Closed_Fist", "Victory", "Thumb_Up"].map(name => normalizeGesture(hand(name)));
  assert.deepEqual(mapped, ["OPEN", "FIST", "PEACE", "THUMB_UP"]);
  assert.equal(normalizeGesture(hand("None")), "NONE");
  assert.equal(normalizeGesture(hand("Thumb_Up", .4)), "NONE");
  const gestures = [], input = new HandInput({}, { onGesture: value => gestures.push(value) });
  input.processResult(hand("Thumb_Up")); input.processResult(hand("Thumb_Up")); assert.equal(gestures.length, 0);
  input.processResult(hand("Thumb_Up")); assert.deepEqual(gestures, ["THUMB_UP"]);
  for (const id of ["solo-hand-beat", "solo-pinch-world"]) assert.deepEqual(experiments.find(g => g.id === id).input, ["HAND"]);
});
test("palm cursor is stable under fingertip changes and uses mirrored cover projection", () => {
  const result = hand(), before = readGrip(result);
  result.landmarks[0][4] = { x: .1, y: .1 }; result.landmarks[0][8] = { x: .9, y: .9 };
  assert.deepEqual(readGrip(result).gripPosition, before.gripPosition);
  const projected = projectGrip({ ...before, present: true }, 1280, 720, 360, 360);
  assert.ok(Math.abs(projected.gripPosition.x - (.5 + .1 * 1280 / 720)) < 1e-9);
  assert.equal(projectGrip({ present: true, gripPosition: { x: .99, y: .5 } }, 1280, 720, 360, 360).present, false);
  assert.equal(projectGrip({ ...before, present: true }, 0, 720, 360, 360).present, false);
});
test("ten palm/fist cycles produce ten grabs and ten releases without repeats", () => {
  const state = new GripState(); let starts = 0, ends = 0;
  state.update(hand(), 0); state.update(hand(), 80);
  for (let i = 0; i < 10; i++) for (let n = 0; n < 10; n++) {
    const output = state.update(hand(n < 5 ? "Closed_Fist" : "Open_Palm"), 100 + i * 200 + n * 20);
    starts += Number(output.events.includes("GRIP_START")); ends += Number(output.events.includes("GRIP_END"));
  }
  assert.equal(starts, 10); assert.equal(ends, 10);
});
test("neutral and low-confidence flicker cannot activate a grip in 30 seconds", () => {
  const state = new GripState();
  for (let at = 0; at <= 30000; at += 20) {
    const output = state.update(hand(at % 200 === 0 ? "Closed_Fist" : "Open_Palm", at % 100 === 0 ? .3 : .9), at);
    assert.equal(output.grabbing, false); assert.ok(!output.events.includes("GRIP_START"));
  }
});
test("unknown poses retain an existing hold; only a qualified open palm releases", () => {
  const state = new GripState();
  state.update(hand(), 0); state.update(hand(), 80);
  state.update(hand("Closed_Fist"), 100); assert.ok(state.update(hand("Closed_Fist"), 180).events.includes("GRIP_START"));
  const unknown = state.update(hand("None"), 200); assert.equal(unknown.grabbing, true); assert.equal(unknown.open, false);
  const weak = state.update(hand("Open_Palm", .3), 220); assert.equal(weak.grabbing, true);
  state.update(hand(), 240); assert.ok(state.update(hand(), 320).events.includes("GRIP_END"));
});
test("cold or long-lost closed hands cannot grab until a new palm-to-fist edge", () => {
  const state = new GripState();
  state.update(hand("Closed_Fist"), 0); assert.ok(!state.update(hand("Closed_Fist"), 80).events.includes("GRIP_START"));
  state.update(hand(), 100); state.update(hand(), 180); state.update(hand("Closed_Fist"), 200); state.update(hand("Closed_Fist"), 280);
  state.update({}, 300); state.update({}, 500); state.update({}, 620);
  state.update(hand("Closed_Fist"), 640); assert.ok(!state.update(hand("Closed_Fist"), 720).events.includes("GRIP_START"));
  state.update(hand(), 740); state.update(hand(), 820); state.update(hand("Closed_Fist"), 840);
  assert.ok(state.update(hand("Closed_Fist"), 920).events.includes("GRIP_START"));
});
test("SOFT SERVE follows immediately, shows partial attachment and confirms once at 450ms", () => {
  const g = new SoftServeGame(), animation = new SoftServeAnimation(); g.reset("camera");
  g.step(20, { hand: { x: .6, y: .7 } });
  assert.ok(g.cone.x > .5); assert.ok(g.attachmentProgress > 0 && g.attachmentProgress < 1); assert.equal(g.phase, "ready");
  for (let at = 20; at < 440; at += 20) g.step(20, { hand: { x: .6, y: .7 } });
  assert.equal(g.phase, "ready"); g.step(10, { hand: { x: .6, y: .7 } });
  assert.equal(g.phase, "serve"); assert.equal(g.effect.type, "attached");
  animation.consume(g.effect); animation.advance(100); animation.consume(g.effect); assert.equal(animation.attachmentAge, 100);
});
test("SOFT SERVE attachment cannot accumulate on off-zone input or invisible frames and expires on extended loss", () => {
  const g = new SoftServeGame();
  for (const hand of [{ x: .8, y: .7 }, { x: .5, y: .1 }, { x: .5, y: 1.1 }]) {
    for (let i = 0; i < 60; i++) g.step(20, { hand });
    assert.equal(g.phase, "ready"); assert.equal(g.attachmentProgress, 0);
  }
  g.step(100, { hand: { x: .5, y: .7 } }); assert.ok(g.attachmentProgress > 0);
  g.step(20, null); assert.equal(g.attachmentProgress, 100 / g.rules.readyMs);
  g.step(140, null); assert.equal(g.attachmentProgress, 0);
});
