import test from "node:test";
import assert from "node:assert/strict";
import { CameraIsItGame, existence, clampCamera } from "../src/games/cameraIsIt.js";
import { stages } from "../src/camera/stages.js";
import { orientationBasis, relativeLook, CameraOrientation } from "../src/input/cameraOrientation.js";
import { experiments, validateRegistry } from "../src/platform/experiments.js";

test("the camera experiment has a lazy, sensor-specific registry entry", () => {
  const entry = experiments.find((g) => g.exp === "EXP-043");
  assert.ok(entry); assert.deepEqual(entry.input, ["ORIENTATION"]);
  assert.deepEqual(validateRegistry(experiments), []); assert.ok(entry.demo);
});
test("existence fades across a 10% margin and disappears beyond it", () => {
  const p = { x: 0, y: 1000, width: 400 }, camera = { x: 400, y: 600 };
  assert.equal(existence(p, camera), 1);
  assert.equal(existence(p, { x: 840, y: 600 }), .5);
  assert.equal(existence(p, { x: 890, y: 600 }), 0);
  assert.equal(existence(p, { x: 400, y: 450 }), .5);
});
test("disappearance has a short recovery grace and restores collision", () => {
  const g = new CameraIsItGame(); g.start(); const p = g.platforms[0];
  assert.ok(p.active); g.setCamera({ x: 1600, y: 570 }, true); g.updateExistence(100);
  assert.ok(p.active); assert.ok(p.opacity < 1);
  g.updateExistence(160); assert.equal(p.active, false);
  g.setCamera({ x: 400, y: 570 }, true); g.updateExistence(16); assert.ok(p.active);
});
test("view clamping cannot reveal the whole world at once", () => {
  assert.deepEqual(clampCamera({ x: -1000, y: -1000 }), { x: 400, y: 500 });
  assert.deepEqual(clampCamera({ x: 9000, y: 9000 }), { x: 2600, y: 1300 });
});
test("standing still loses the route; camera never carries the character", () => {
  const g = new CameraIsItGame(); g.start(); const x = g.runner.x;
  g.setCamera({ x: 600, y: 570 }); g.step(1400); assert.equal(g.runner.x, x);
  g.step(30000); assert.equal(g.phase, "result"); assert.equal(g.result.clear, false);
});
test("looking away loses the walker with grace instead of instant failure", () => {
  const g = new CameraIsItGame(); g.start(); g.step(1400);
  g.setCamera({ x: 2600, y: 570 }, true); g.step(500);
  assert.equal(g.phase, "playing"); g.step(1500);
  assert.equal(g.result.reason, "lost");
});
test("all five framing puzzles clear with automatic movement in 15–30 seconds each", () => {
  const g = new CameraIsItGame(); g.start("camera", true);
  for (let tick = 0; tick < 12000 && g.phase !== "result"; tick++) {
    const r = g.runner, next = g.platforms[Math.min(r.support + 1, g.platforms.length - 1)];
    g.setCamera({ x: r.x + 200, y: (r.y + next.y) / 2 - 50 }); g.step(16);
    if (g.phase === "stage-clear") g.nextStage();
  }
  assert.equal(g.result?.clear, true); assert.equal(g.result.completed, 5);
  assert.equal(g.result.source, "camera"); assert.ok(g.result.receipts.every((r) => r.background));
  for (const row of g.result.receipts) assert.ok(row.seconds >= 15 && row.seconds <= 30, JSON.stringify(row));
  assert.equal(stages[3].title, "TWO WORLDS");
});
test("a paused world freezes movement, fade and time", () => {
  const g = new CameraIsItGame(); g.start(); g.step(1600); g.paused = true;
  const before = JSON.stringify(g); g.step(5000); assert.equal(JSON.stringify(g), before);
});
test("TWO WORLDS defeats simple character-following without framing the landing", () => {
  const g = new CameraIsItGame(); g.start(); g.loadStage(3);
  for (let tick = 0; tick < 2500 && g.phase !== "result"; tick++) {
    g.setCamera({ x: g.runner.x + 200, y: g.runner.y + 50 }); g.step(16);
  }
  assert.equal(g.result?.clear, false); assert.equal(g.completed, 0);
});
test("orientation wraps headings and measures the rear lens around upright phones", () => {
  const near = relativeLook(orientationBasis({ alpha: 1, beta: 90, gamma: 0 }), orientationBasis({ alpha: 359, beta: 90, gamma: 0 }));
  assert.ok(Math.abs(near.yaw + 2) < .001);
  const up = relativeLook(orientationBasis({ alpha: 0, beta: 110, gamma: 0 }), orientationBasis({ alpha: 0, beta: 90, gamma: 0 }));
  assert.ok(Math.abs(up.pitch - 20) < .001); assert.equal(up.yaw, 0);
  assert.equal(orientationBasis({ alpha: null, beta: 90, gamma: 0 }), null);
  const landscape = relativeLook(orientationBasis({ alpha: 0, beta: 110, gamma: 0 }, 90), orientationBasis({ alpha: 0, beta: 90, gamma: 0 }, 90));
  assert.ok(Math.abs(landscape.yaw - 20) < .001);
});
function env(permission = "granted") {
  const target = new EventTarget(); target.isSecureContext = true; target.screen = { orientation: { angle: 0 } };
  target.DeviceOrientationEvent = { requestPermission: async () => permission };
  target.navigator = { mediaDevices: { getUserMedia: async () => { throw Error("Unexpected camera request"); } } };
  return target;
}
const video = () => ({ srcObject: null, pause() {}, async play() {} });
test("denied orientation permission never requests a camera", async () => {
  const input = new CameraOrientation(video(), () => {}, env("denied"));
  await assert.rejects(input.start(), /permission/); input.stop();
});
test("late camera permission stops every track after exit", async () => {
  const target = env(); let grant; let stopped = 0;
  target.navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { grant = resolve; });
  const input = new CameraOrientation(video(), () => {}, target);
  const pending = input.start(); const assertion = assert.rejects(pending, { name: "AbortError" });
  await new Promise((resolve) => setImmediate(resolve));
  input.stop(); grant({ getTracks: () => [{ stop: () => stopped++ }] });
  await assertion; await new Promise((resolve) => setImmediate(resolve)); assert.equal(stopped, 1); assert.equal(input.video.srcObject, null);
});
