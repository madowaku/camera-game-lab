import test from "node:test";
import assert from "node:assert/strict";
import { EyeState, readEyes } from "../src/input/eyeState.js";
const result = (left = 0.1, right = left) => ({ faceLandmarks: [[{}, { x: 0.3, y: 0.4 }]], faceBlendshapes: [{ categories: [{ categoryName: "eyeBlinkLeft", score: left }, { categoryName: "eyeBlinkRight", score: right }] }] });
function open(state, start = 0) { for (const t of [start, start + 20, start + 40]) state.update(result(), t); }

test("eye input mirrors face position and exposes normalized scores, not blendshape names", () => {
  assert.deepEqual(readEyes(result(0.2, 0.3)), { blinkLeftScore: 0.2, blinkRightScore: 0.3, facePosition: { x: 0.7, y: 0.4 } });
  assert.equal(readEyes({ faceLandmarks: [[]] }), null);
  assert.equal(readEyes(result(NaN)), null);
});
test("held closure requires both eyes, three stable frames and 120ms", () => {
  const state = new EyeState(); open(state);
  assert.equal(state.update(result(0.9, 0.1), 100).eyeState, "EYES_OPEN");
  assert.equal(state.update(result(0.8), 140).eyeState, "EYES_OPEN");
  assert.equal(state.update(result(0.8), 200).eyeState, "EYES_OPEN");
  assert.equal(state.update(result(0.8), 260).eyeState, "EYES_CLOSED");
  assert.equal(state.update(result(0.5), 280).eyeState, "EYES_CLOSED");
  for (const t of [300, 320]) assert.equal(state.update(result(), t).eyeState, "EYES_CLOSED");
  assert.equal(state.update(result(), 340).eyeState, "EYES_OPEN");
});
test("a natural bilateral blink emits once without awarding held-closed defense", () => {
  const state = new EyeState(); open(state);
  state.update(result(0.9), 80); state.update(result(0.9), 110);
  const frame = state.update(result(), 140);
  assert.equal(frame.eyeState, "EYES_OPEN"); assert.deepEqual(frame.events, ["BLINK_BOTH"]);
  assert.ok(!state.update(result(), 160).events.includes("BLINK_BOTH"));
});
test("face loss is never EYES_CLOSED and return must requalify", () => {
  const state = new EyeState(); open(state);
  for (const t of [80, 140, 200]) state.update(result(0.9), t);
  const lost = state.update({}, 230);
  assert.equal(lost.eyeState, "FACE_LOST"); assert.equal(lost.ready, false); assert.deepEqual(lost.events, ["FACE_LOST"]);
  assert.equal(state.update(result(0.9), 250).eyeState, "UNKNOWN");
  assert.equal(state.update(result(), 280).ready, false);
  state.update(result(), 300); assert.equal(state.update(result(), 320).eyeState, "EYES_OPEN");
});
test("stale frames and reversed clocks cannot preserve a held eye state", () => {
  const state = new EyeState(); open(state);
  assert.equal(state.update(result(), 600).ready, false);
  assert.equal(state.update(result(), 590).ready, false);
  assert.equal(state.update(result(), NaN).present, false);
});
test("ten deliberate close/open cycles yield ten qualified pairs without held repeats", () => {
  const state = new EyeState(); open(state); let close = 0, opened = 0;
  for (let i = 0; i < 10; i++) for (let t = 0; t < 400; t += 20) {
    const frame = state.update(result(t < 220 ? 0.9 : 0.1), 80 + i * 400 + t);
    close += frame.events.includes("EYES_CLOSED"); opened += frame.events.includes("EYES_OPEN");
  }
  assert.equal(close, 10); assert.equal(opened, 10);
});
