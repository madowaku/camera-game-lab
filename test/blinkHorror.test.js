import test from "node:test";
import assert from "node:assert/strict";
import { BlinkHorrorGame, rushWindows } from "../src/games/blinkHorror.js";
const eyes = (closed = false) => ({ present: true, ready: true, eyeState: closed ? "EYES_CLOSED" : "EYES_OPEN" });
function playing() { const game = new BlinkHorrorGame(); game.start("demo"); game.step(1000, eyes()); game.step(1200, eyes()); assert.equal(game.phase, "playing"); return game; }
test("calibration requires continuous normal open eyes and a tracked countdown", () => {
  const game = new BlinkHorrorGame(); game.start(); game.step(900, eyes()); game.step(30, eyes(true));
  assert.equal(game.calibration, 0); game.step(1000, eyes()); assert.equal(game.phase, "countdown");
  game.step(800, eyes()); game.step(500, { present: false }); assert.equal(game.countdown, 0);
  game.step(400, eyes()); assert.equal(game.phase, "countdown"); game.step(1200, eyes()); assert.equal(game.phase, "playing");
});
test("open advances escape and danger, closed stops escape and retreats", () => {
  const game = playing(); game.step(2000, eyes()); assert.equal(game.progress, 0.15); assert.equal(game.danger, 0.17);
  game.step(1000, eyes(true)); assert.equal(game.progress, 0.15); assert.ok(Math.abs(game.danger - 0.11) < 1e-10); assert.equal(game.hides, 1);
  game.step(1000, eyes(true)); assert.equal(game.hides, 1);
});
test("seeded rushes start after three seconds and are repeatable", () => {
  assert.deepEqual(rushWindows(4), rushWindows(4)); assert.notDeepEqual(rushWindows(4), rushWindows(5));
  for (const w of rushWindows()) { assert.ok(w.start > 3000); assert.ok(w.end - w.start >= 1200 && w.end - w.start <= 1800); }
  const game = playing(); game.elapsedMs = game.windows[0].start; game.step(1000, eyes()); assert.ok(Math.abs(game.danger - 0.16) < 1e-10);
});
test("FACE_LOST freezes escape, danger and deterministic rush timing, then waits for stable recovery", () => {
  const game = playing(); game.step(2500, eyes()); const before = [game.progress, game.danger, game.elapsedMs];
  game.step(5000, { present: false, ready: false, eyeState: "EYES_CLOSED" });
  assert.deepEqual([game.progress, game.danger, game.elapsedMs], before); assert.equal(game.hides, 0);
  game.step(200, eyes()); game.step(100, {}); game.step(300, eyes()); assert.equal(game.paused, true);
  game.step(100, eyes()); assert.equal(game.paused, false); assert.deepEqual([game.progress, game.danger, game.elapsedMs], before);
  game.step(100, eyes()); assert.ok(game.progress > before[0]);
});
test("manual pause and resume do not skip danger or rush windows", () => {
  const game = playing(); game.step(1000, eyes()); game.setPaused(true); game.step(9000, eyes(true));
  assert.equal(game.elapsedMs, 1000); game.setPaused(false); game.step(400, eyes()); assert.equal(game.elapsedMs, 1000);
  game.step(1000, eyes()); assert.equal(game.elapsedMs, 2000);
});
test("continuous staring is caught, strategic hides can escape within 26 seconds", () => {
  const caught = playing(); caught.step(26000, eyes()); assert.equal(caught.result.outcome, "caught");
  const game = playing();
  for (let i = 0; i < 260 && !game.result; i++) game.step(100, eyes(game.rush || game.danger > 0.6 || (game.lastEye === "EYES_CLOSED" && game.danger > 0.3)));
  assert.equal(game.result.outcome, "escaped"); assert.ok(game.result.seconds <= 26); assert.ok(game.result.hides > 0); assert.equal(game.result.source, "demo");
});
test("all-closed time reaches a bounded timeout, and retry resets all metrics", () => {
  const game = playing(); game.step(26000, eyes(true)); assert.equal(game.result.outcome, "timeout"); assert.equal(game.result.score, 0); assert.equal(game.danger, 0);
  game.start("camera"); assert.equal(game.result, null); assert.equal(game.hides, 0); assert.equal(game.source, "camera"); assert.equal(game.elapsedMs, 0);
});
test("rush integration and result time are independent of frame size", () => {
  const a = playing(), b = playing(); a.step(25000, eyes()); for (let i = 0; i < 1500; i++) b.step(1000 / 60, eyes());
  assert.equal(a.result.outcome, b.result.outcome); assert.ok(Math.abs(a.result.seconds - b.result.seconds) < 1e-8); assert.equal(a.result.score, b.result.score);
});
