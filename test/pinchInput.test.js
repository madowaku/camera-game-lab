import test from "node:test";
import assert from "node:assert/strict";
import { PinchState, readPinch, projectPinch } from "../src/input/pinchState.js";
function hand(ratio = .6, x = .4, y = .5) {
  const points = Array.from({ length: 21 }, () => ({ x, y }));
  points[0] = { x, y: .8 }; points[9] = { x, y: .6 };
  points[4] = { x: x - ratio * .1, y }; points[8] = { x: x + ratio * .1, y };
  return { landmarks: [points] };
}
test("pinch geometry normalizes by hand scale and mirrors both fingertips and midpoint", () => {
  const state = readPinch(hand(.2)); assert.ok(Math.abs(state.pinchRatio - .2) < 1e-9);
  assert.deepEqual(state.pinchPosition, { x: .6, y: .5 });
  assert.ok(state.thumbTip.x > state.indexTip.x); assert.ok(Math.abs(readPinch(hand(.2), 2).pinchRatio - .4) < 1e-9);
  assert.equal(readPinch({ landmarks: [[]] }), null); assert.equal(readPinch(hand(NaN)), null);
});
test("new tracking while fingers are held together never fabricates a pinch start", () => {
  const state = new PinchState();
  state.update(hand(.2), 0); const held = state.update(hand(.2), 20);
  assert.equal(held.pinching, true); assert.ok(!held.events.includes("PINCH_START"));
  state.update(hand(.6), 40); assert.ok(state.update(hand(.6), 60).events.includes("PINCH_END"));
  state.update(hand(.2), 80); assert.ok(state.update(hand(.2), 100).events.includes("PINCH_START"));
});
test("pinch hysteresis produces one fresh edge, moves while held, and one immediate qualified release", () => {
  const state = new PinchState(); state.update(hand(), 0); state.update(hand(), 20);
  assert.ok(!state.update(hand(.2), 40).events.includes("PINCH_START"));
  assert.ok(state.update(hand(.2), 60).events.includes("PINCH_START"));
  for (const [ratio, at] of [[.35, 80], [.39, 100], [.21, 120]]) {
    const frame = state.update(hand(ratio), at); assert.equal(frame.pinching, true); assert.deepEqual(frame.events, ["PINCH_MOVE"]);
  }
  state.update(hand(.6), 140); assert.ok(state.update(hand(.6), 160).events.includes("PINCH_END"));
  assert.ok(!state.update(hand(.6), 180).events.includes("PINCH_END"));
});
test("brief tracking loss preserves hold; a long loss or stale stream requires opening to rearm", () => {
  const state = new PinchState(); for (const [ratio, at] of [[.6, 0], [.6, 20], [.2, 40], [.2, 60]]) state.update(hand(ratio), at);
  const missing = state.update({}, 80); assert.equal(missing.present, false); assert.equal(missing.pinching, true);
  assert.ok(state.update(hand(.2), 180).events.includes("PINCH_MOVE"));
  state.update({}, 200); state.update({}, 450); state.update({}, 510);
  state.update(hand(.2), 530); const returning = state.update(hand(.2), 550);
  assert.ok(!returning.events.includes("PINCH_START"));
  assert.ok(!state.update(hand(.2), 1000).events.includes("PINCH_START"));
});
test("ten deliberate pinch/release cycles yield ten pairs and no repeated start", () => {
  const state = new PinchState(); state.update(hand(), 0); state.update(hand(), 20); let starts = 0, ends = 0;
  for (let i = 0; i < 10; i++) for (let n = 0; n < 8; n++) {
    const frame = state.update(hand(n < 4 ? .2 : .6), 40 + i * 160 + n * 20);
    starts += frame.events.includes("PINCH_START"); ends += frame.events.includes("PINCH_END");
  }
  assert.equal(starts, 10); assert.equal(ends, 10);
});
test("camera cover projection matches mirrored fingertips and rejects offscreen pinches", () => {
  const input = { present: true, ...readPinch(hand(.2, .4)) };
  const projected = projectPinch(input, 1280, 720, 360, 360);
  assert.ok(Math.abs(projected.pinchPosition.x - (.5 + .1 * 1280 / 720)) < 1e-9);
  assert.equal(projected.pinchPosition.y, .5);
  assert.equal(projectPinch({ ...input, pinchPosition: { x: .99, y: .5 } }, 1280, 720, 360, 360).present, false);
  assert.equal(projectPinch(input, 0, 720, 360, 360).present, false);
});
