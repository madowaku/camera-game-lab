import test from "node:test";
import assert from "node:assert/strict";
import { BlinkHorrorGame, MONSTER_STAGES } from "../src/games/blinkHorror.js";
const eyes = (closed = false, events = []) => ({ present: true, ready: true, eyeState: closed ? "EYES_CLOSED" : "EYES_OPEN", events });
function playing(source = "demo") { const g = new BlinkHorrorGame(); g.start(source); g.step(600, eyes()); g.step(150, eyes(true)); g.step(50, eyes()); g.step(1200, eyes()); assert.equal(g.phase, "playing"); return g; }
function blink(g, duration = 150) { g.step(duration, eyes(true)); g.step(20, eyes()); }
function locker(g) { g.step(13750, eyes()); assert.equal(g.stage, "HIDE"); return g; }
test("calibration confirms OPEN and CLOSED once before a tracked countdown", () => {
  const g = new BlinkHorrorGame(); g.start(); g.step(6000, eyes()); assert.equal(g.phase, "calibration");
  g.step(100, eyes(true)); g.step(30, eyes()); assert.equal(g.phase, "countdown");
  g.step(800, eyes()); g.step(500, {}); assert.equal(g.countdown, 0);
  g.step(400, eyes()); g.step(1200, eyes()); assert.equal(g.phase, "playing"); assert.equal(g.blinks, 0);
});
test("OPEN advances toward EXIT without moving the monster", () => {
  const g = playing(); g.step(2000, eyes()); assert.equal(g.remaining, 92); assert.equal(g.monster, 0);
  g.step(79, eyes(true)); g.step(20, eyes()); assert.equal(g.monster, 0); assert.equal(g.blinks, 0);
});
test("80–449ms blink approaches once, including an overlapping camera event", () => {
  const g = playing(); g.step(80, eyes(true)); g.step(20, eyes(false, ["BLINK_BOTH"]));
  assert.equal(g.monsterStage, "FAR"); assert.equal(g.blinks, 1); g.step(30, eyes()); assert.equal(g.monster, 1);
  blink(g, 449); assert.equal(g.monsterStage, "NEAR");
});
test("fast bilateral camera events count even without a stable CLOSED frame", () => {
  const g = playing("camera"); g.step(30, eyes(false, ["BLINK_BOTH"])); assert.equal(g.monster, 1); assert.equal(g.blinks, 1);
});
test("LONG CLOSE charges once per episode; Stage 001 +1, configurable HARD +2", () => {
  const g = playing(); g.step(450, eyes(true)); assert.equal(g.monster, 1); g.step(2000, eyes(true)); assert.equal(g.monster, 1);
  g.step(30, eyes(false, ["LONG_CLOSE_BOTH"])); assert.equal(g.monster, 1); assert.equal(g.longCloses, 1); assert.equal(g.blinks, 0);
  g.rules.longPenalty = 2; g.step(450, eyes(true)); assert.equal(g.monster, 3);
});
test("raw camera closure timing is not delayed by stable-state qualification", () => {
  const g = playing("camera"); g.step(16, { ...eyes(true), closedDurationMs: 470 }); assert.equal(g.monster, 1); assert.equal(g.longCloses, 1);
});
test("all five monster stages lead to CAUGHT on the fourth unsafe blink", () => {
  const g = playing(); assert.equal(g.monsterStage, MONSTER_STAGES[0]);
  for (let i = 1; i <= 4; i++) { blink(g); assert.equal(g.monsterStage, MONSTER_STAGES[i]); }
  assert.equal(g.result.outcome, "caught"); assert.equal(g.result.blinks, 4); assert.equal(g.result.closeCalls, 2);
});
test("one recognizable locker at 45m remaining accepts repeated safe blinks", () => {
  const g = locker(playing()); assert.equal(g.remaining, 45); assert.equal(g.hides, 1);
  blink(g); blink(g); assert.equal(g.safeBlinks, 2); assert.equal(g.monster, 0); assert.equal(g.travelled, 55);
  g.step(450, eyes(true)); assert.equal(g.monster, 0);
});
test("DON’T LOOK allows reaction time, needs a continuous 1.2s close, then GO", () => {
  const g = locker(playing()); g.step(3000, eyes()); assert.equal(g.stage, "DONT_LOOK");
  g.step(500, eyes()); g.step(1200, eyes(true)); assert.equal(g.passSuccess, true); assert.equal(g.monster, 0);
  g.step(2500, eyes(true)); assert.equal(g.stage, "GO"); g.step(700, eyes(true)); assert.equal(g.stage, "RUN");
  g.step(500, eyes(true)); assert.equal(g.monster, 0); g.step(30, eyes()); g.step(450, eyes(true)); assert.equal(g.monster, 1);
});
test("opening mid-pass or ignoring DON’T LOOK costs exactly +1, without instant death", () => {
  for (const mid of [false, true]) {
    const g = locker(playing()); g.step(3000, eyes());
    if (mid) { g.step(500, eyes(true)); g.step(100, eyes()); }
    g.step(4200 - g.stageMs, eyes()); assert.equal(g.monster, 1); assert.equal(g.passFailed, true); assert.equal(g.stage, "GO");
  }
});
test("tracking loss pauses distance, danger and pass clocks without granting defense", () => {
  const g = locker(playing()); g.step(3000, eyes()); g.step(500, eyes(true));
  const before = [g.elapsedMs, g.travelled, g.stageMs, g.monster]; g.step(5000, {});
  assert.deepEqual([g.elapsedMs, g.travelled, g.stageMs, g.monster], before); assert.equal(g.hold, 0);
  g.step(200, eyes(true)); g.step(200, eyes(true)); assert.equal(g.paused, false); assert.deepEqual([g.elapsedMs, g.travelled, g.stageMs, g.monster], before);
  g.step(1200, eyes(true)); assert.equal(g.passSuccess, true);
});
test("manual pause discards closure edges and resumes after stable tracking", () => {
  const g = playing(); g.step(50, eyes(true)); g.setPaused(true); g.step(8000, eyes()); assert.equal(g.elapsedMs, 50);
  g.setPaused(false); g.step(400, eyes()); g.step(50, eyes()); assert.equal(g.monster, 0);
});
test("full RUN→HIDE→DON’T LOOK→GO→RUN escape takes 30–45 active seconds", () => {
  const g = locker(playing()); blink(g); g.step(3000 - g.stageMs, eyes()); g.step(4200, eyes(true)); g.step(700, eyes()); g.step(11250, eyes());
  assert.equal(g.result.outcome, "escaped"); assert.equal(g.remaining, 0); assert.equal(g.result.passSuccess, true);
  assert.equal(g.result.safeBlinks, 1); assert.ok(g.result.seconds >= 30 && g.result.seconds <= 45);
  assert.equal(g.result.source, "demo"); g.start("camera"); assert.equal(g.result, null); assert.equal(g.blinks, 0); assert.equal(g.monster, 0);
});
test("large and small frames agree at exact locker and escape boundaries", () => {
  const a = playing(), b = playing(); a.step(45000, eyes());
  for (let i = 0; i < 2700 && !b.result; i++) b.step(1000 / 60, eyes());
  assert.equal(a.result.outcome, b.result.outcome); assert.equal(a.monster, b.monster); assert.ok(Math.abs(a.result.seconds - b.result.seconds) < 1e-8);
});
test("staying closed cannot escape and the session has a bounded end", () => {
  const g = playing(); g.step(45000, eyes(true)); assert.equal(g.result.reason, "timeout"); assert.equal(g.monster, 1); assert.equal(g.result.score, 0);
});

test("DON’T LOOK stays closed until GO, even after the minimum hold qualifies", () => {
  const g = locker(playing()); g.step(3000, eyes()); g.step(1200, eyes(true)); assert.equal(g.passSuccess,true);
  g.step(20,eyes()); assert.equal(g.passSuccess,false); assert.equal(g.passFailed,true); assert.equal(g.monster,1);
});
test("a caught pass uses the exact reaction boundary at any frame size", () => {
  const a = locker(playing()), b = locker(playing());
  for(const g of [a,b]) { g.monster=3; g.step(3000,eyes()); }
  a.step(4200,eyes()); for(let i=0;i<84 && !b.result;i++) b.step(50,eyes());
  assert.equal(a.result.outcome,'caught'); assert.equal(a.result.seconds,b.result.seconds);
  assert.equal(a.result.seconds,17.95);
});
