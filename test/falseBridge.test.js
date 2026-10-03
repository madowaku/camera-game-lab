import test from "node:test";
import assert from "node:assert/strict";
import { FalseBridgeGame } from "../src/games/falseBridge.js";
import { STAGES, contains, coverCrop, WIDTH, HEIGHT } from "../src/falseBridge/shapes.js";
import { compareFrames } from "../src/falseBridge/scoring.js";
import { BridgeCamera } from "../src/falseBridge/camera.js";
import { experiments, validateRegistry } from "../src/platform/experiments.js";

function frame(shape = null, background = 80, value = 210) {
  const width = 180, height = 220, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, v = shape && contains(shape, (x + .5) * WIDTH / width, (y + .5) * HEIGHT / height) ? value : background;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
  }
  return { width, height, data };
}
const perfect = { coverage: 1, spill: 0, angleError: 0, fit: 1, grade: "PERFECT", reason: null };
test("all six target silhouettes score as matching shapes without recognition", () => {
  for (const stage of STAGES) for (const shape of stage.parts) {
    const result = compareFrames(frame(), frame(shape), shape);
    assert.equal(result.grade, "PERFECT", stage.id); assert.equal(result.reason, null); assert.ok(result.coverage > .95);
    if (shape.kind === "bar") assert.ok(result.angleError < 2);
  }
});
test("empty, shifted, oversized and rotated objects do not receive a perfect fit", () => {
  const guide = STAGES[0].parts[0]; assert.equal(compareFrames(frame(), frame(), guide).reason, "uncertain");
  for (const shape of [{ ...guide, x: guide.x + 70 }, { ...guide, h: guide.h * 4 }, { ...guide, angle: 40 }]) assert.notEqual(compareFrames(frame(), frame(shape), guide).grade, "PERFECT");
  assert.ok(compareFrames(frame(), frame({ ...guide, angle: 25 }), guide).angleError > 10);
});
test("exposure change is not an object; darkness and global movement need human judgment", () => {
  const guide = STAGES[0].parts[0]; assert.equal(compareFrames(frame(), frame(null, 120), guide).coverage, 0);
  assert.equal(compareFrames(frame(null, 12), frame(guide, 12, 20), guide).reason, "dark");
  const moved = frame();
  for (let i = 0; i < moved.data.length; i += 4) { const value = i % 8 === 0 ? 220 : 0; moved.data[i] = value; moved.data[i + 1] = value; moved.data[i + 2] = value; }
  assert.equal(compareFrames(frame(), moved, guide).reason, "motion"); assert.equal(compareFrames(null, moved, guide).reason, "unavailable");
});
test("portrait and landscape camera sources use centered cover cropping", () => {
  assert.deepEqual(coverCrop(720, 880), { x: 0, y: 0, w: 720, h: 880 });
  const crop = coverCrop(1280, 720); assert.ok(crop.x > 300); assert.ok(Math.abs(crop.y) < .0001); assert.ok(Math.abs(crop.w / crop.h - WIDTH / HEIGHT) < .0001);
  const circle = STAGES[2].parts[0]; assert.equal(contains(circle, circle.x + 55, circle.y), true); assert.equal(contains(circle, circle.x + 55, circle.y + 55), false);
});
test("calibration requires an active second and pause blocks locks and clocks", () => {
  const g = new FalseBridgeGame(); g.start("camera"); assert.equal(g.phase, "background"); assert.equal(g.lock(perfect), false);
  g.calibrate(); g.step(999); assert.equal(g.phase, "calibration"); g.paused = true; g.step(5000); assert.equal(g.phase, "calibration");
  g.paused = false; g.step(1); assert.equal(g.phase, "playing"); g.paused = true; assert.equal(g.lock(perfect), false); g.step(500); assert.equal(g.elapsedMs, 0);
});
test("uncertain locks can be retried or explicitly self-judged", () => {
  const g = new FalseBridgeGame(); g.start("demo"); g.lock({ ...perfect, reason: "motion" });
  assert.equal(g.phase, "review"); assert.equal(g.parts.length, 0); assert.equal(g.lock(perfect), false);
  g.retryLock(); assert.equal(g.phase, "playing"); g.lock({ ...perfect, fit: .1 }); assert.equal(g.phase, "review");
  g.accept(); assert.equal(g.parts[0].selfJudged, true); assert.equal(g.accept(), false); g.step(2400); assert.equal(g.phase, "clear");
});
test("five stages need six locks and preserve independent bridge and pillar records", () => {
  const g = new FalseBridgeGame(); g.start("demo");
  for (let stage = 0; stage < 5; stage++) {
    assert.equal(g.stageIndex, stage); g.step(2000); assert.equal(g.next(), false); g.lock(perfect); assert.equal(g.lock(perfect), false); g.step(2400);
    if (stage === 4) { assert.equal(g.phase, "playing"); assert.equal(g.partIndex, 1); assert.equal(g.parts.length, 1); g.lock(perfect); g.step(2400); }
    assert.equal(g.phase, "clear"); g.next();
  }
  assert.equal(g.phase, "result"); assert.equal(g.result.completed, 5); assert.equal(g.result.stages.flatMap(s => s.parts).length, 6); assert.equal(g.result.source, "demo"); assert.equal(g.result.seconds, 10);
  g.start("camera"); assert.equal(g.stageIndex, 0); assert.equal(g.phase, "background"); assert.equal(g.result, null);
});
test("second camera part requires another background while retaining the first lock", () => {
  const g = new FalseBridgeGame(); g.start("camera"); g.stageIndex = 4; g.calibrate(); g.step(1000); g.lock(perfect); g.step(900);
  assert.equal(g.phase, "background"); assert.equal(g.parts.length, 1); assert.equal(g.partIndex, 1); assert.equal(g.lock(perfect), false);
});
function cameraFixture(facingMode = "environment") {
  const track = new EventTarget(); track.readyState = "live"; track.muted = false; track.getSettings = () => ({ facingMode }); track.stops = 0; track.stop = () => { track.stops++; track.readyState = "ended"; };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] }, video = { srcObject: null, videoWidth: 1280, readyState: 4, pause() {}, play: async () => {} };
  return { track, stream, video };
}
test("camera requests rear video only and releases it on stop", async () => {
  const f = cameraFixture(), c = new BridgeCamera(f.video); let constraints;
  await c.start({ getUserMedia: async value => { constraints = value; return f.stream; } });
  assert.equal(constraints.audio, false); assert.deepEqual(constraints.video.facingMode, { exact: "environment" }); assert.equal(c.ready, true);
  c.stop(); assert.equal(f.track.stops, 1); assert.equal(f.video.srcObject, null);
});
test("late permission, front camera and video playback failure stop acquired tracks", async () => {
  const f = cameraFixture(), c = new BridgeCamera(f.video); let allow;
  const pending = c.start({ getUserMedia: () => new Promise(resolve => { allow = resolve; }) }); c.stop(); allow(f.stream);
  await assert.rejects(pending, { name: "AbortError" }); assert.equal(f.track.stops, 1); assert.equal(f.video.srcObject, null);
  const wrong = cameraFixture("user"); await assert.rejects(new BridgeCamera(wrong.video).start({ getUserMedia: async () => wrong.stream })); assert.ok(wrong.track.stops > 0);
  const broken = cameraFixture(); broken.video.play = async () => { throw new Error("Playback failed"); };
  await assert.rejects(new BridgeCamera(broken.video).start({ getUserMedia: async () => broken.stream })); assert.ok(broken.track.stops > 0); assert.equal(broken.video.srcObject, null);
});
test("track interruption notifies and removed listeners do not revive a game", async () => {
  const f = cameraFixture(); let interrupted = 0; const c = new BridgeCamera(f.video, () => interrupted++);
  await c.start({ getUserMedia: async () => f.stream }); f.track.dispatchEvent(new Event("mute")); assert.equal(interrupted, 1); c.stop(); f.track.dispatchEvent(new Event("ended")); assert.equal(interrupted, 1);
});
test("FALSE BRIDGE is a lazy rear-camera discovery entry with its own route", () => {
  assert.deepEqual(validateRegistry(experiments), []); const e = experiments.find(e => e.id === "outcam-false-bridge");
  assert.equal(e.exp, "EXP-025"); assert.equal(e.module, "falseBridge"); assert.equal(e.demo, true); assert.deepEqual(e.input, ["CAMERA"]); assert.equal(e.requiresMicrophone, false);
});
