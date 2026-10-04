import test from "node:test";
import assert from "node:assert/strict";
import { PalmPongGame, W, H, R, HALF, THICKNESS, STEP, ANGLE_OFFSETS, returnVelocity, predictGuide } from "../src/palmPong/core.js";
import { PalmTracker, palmCenter, palmToCourt } from "../src/palmPong/tracking.js";
import { saveResult, readRecords, RECORD_KEY, readSettings, saveSettings } from "../src/palmPong/records.js";
import { experiments, validateRegistry } from "../src/platform/experiments.js";
import { resultPayload } from "../src/platform/share.js";
const hands = () => [{ x: .28 * W, y: H / 2, present: true, continuous: true }, { x: .72 * W, y: H / 2, present: true, continuous: true }];
const near = (a, b, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);
function step(g, seconds, points = hands()) { for (let t = 0; t < seconds - 1e-8; t += STEP) { g.setPaddles(points); g.step(Math.min(STEP, seconds - t)); } }
function playing() { const g = new PalmPongGame(); g.reset("demo"); step(g, .5); assert.ok(g.start()); step(g, 3); return g; }
function front(g, side = 0, y = H / 2, distance = .05) {
  g.nextReceiver = side; const p = g.paddles[side], face = p.x + (side ? -1 : 1) * (THICKNESS / 2 + R);
  g.ball = { x: face + (side ? -distance : distance), y, vx: side ? 8 : -8, vy: 0 };
}
function landmarks(x, y) { return Array.from({ length: 21 }, () => ({ x: 1 - x, y, z: 0 })); }
const detection = (...points) => ({ landmarks: points.map(p => landmarks(...p)), handedness: points.map(() => [{ categoryName: "Left", score: .99 }]) });

test("EXP-048 has unique DUO identity and practice-aware challenge sharing", () => {
  const game = experiments.find(g => g.id === "duo-palm-pong"); assert.deepEqual(validateRegistry(experiments), []);
  assert.equal(game.players, 2); assert.equal(game.orientation, "landscape"); assert.equal(game.requiresMicrophone, false); assert.deepEqual(game.aliases, ["#palm-pong"]);
  assert.equal(experiments.filter(g => g.exp === "EXP-048").length, 1);
  const payload = resultPayload(game, { outcome: "rally", source: "demo", bestRally: 18, scored: false }, "ja", "https://example.test/");
  assert.match(payload.text, /練習.*18ラリー.*何回/); assert.equal(payload.url, "https://example.test/#/game/duo-palm-pong"); assert.doesNotMatch(payload.text, /点|pts/);
});
test("two in-zone hands need 500ms; countdown never consumes round time", () => {
  const g = new PalmPongGame(); step(g, .49); assert.equal(g.start(), false); step(g, .01); assert.equal(g.ready, true); assert.equal(g.start(), true);
  step(g, 2.99); assert.equal(g.elapsed, 0); assert.equal(g.phase, "countdown"); step(g, .01); assert.equal(g.phase, "playing");
  assert.equal(g.elapsed, 0); assert.equal(g.ball.vx, -8); assert.deepEqual(g.takeEvents().map(e => e.type), ["SERVE"]);
});
test("swept collision catches a ball crossing the whole paddle in one step once", () => {
  const g = playing(); front(g); g.ball.vx = -120; g.step(STEP);
  assert.equal(g.total, 1); assert.equal(g.nextReceiver, 1); assert.ok(g.ball.vx > 0); near(Math.hypot(g.ball.vx, g.ball.vy), .514 * W);
  step(g, .1); assert.equal(g.total, 1); assert.equal(g.takeEvents().filter(e => e.type === "RETURN").length, 1);
});
test("reliable moving front face is swept at its actual contact height", () => {
  const g = playing(); const points = hands(); g.setPaddles(points); const face = points[0].x + THICKNESS / 2 + R;
  g.ball = { x: face + .06, y: H / 2, vx: -8, vy: 0 }; points[0].x += .05; g.setPaddles(points); g.step(STEP);
  assert.equal(g.total, 1); assert.equal(g.returns[0], 1);
});
test("entering a zone can return if the swept contact is already in the zone", () => {
  const g = playing(), points = hands(); points[0].x = 1.59; points[0].continuous = false; g.setPaddles(points);
  g.ball = { x: 1.59 + THICKNESS / 2 + R + .05, y: 4.5, vx: -8, vy: 0 };
  points[0].x = 1.62; points[0].continuous = true; g.setPaddles(points); g.step(STEP); assert.equal(g.total, 1);
});
test("leaving a zone still returns before the center crosses the zone boundary", () => {
  const g = playing(), points = hands(); points[0].x = 1.62; points[0].continuous = false; g.setPaddles(points);
  g.ball = { x: 1.62 + THICKNESS / 2 + R + .01, y: 4.5, vx: -8, vy: 0 };
  points[0].x = 1.59; points[0].continuous = true; g.setPaddles(points); g.step(STEP); assert.equal(g.total, 1);
});
test("a swept contact after leaving the zone cannot return", () => {
  const g = playing(), points = hands(); points[0].x = 1.62; points[0].continuous = false; g.setPaddles(points);
  g.ball = { x: 1.62 + THICKNESS / 2 + R + .03, y: 4.5, vx: -8, vy: 0 };
  points[0].x = 1.59; points[0].continuous = true; g.setPaddles(points); g.step(STEP); assert.equal(g.total, 0);
});
test("top overlap, back face and outgoing balls cannot create returns", () => {
  for (const mode of ["top", "back", "outgoing"]) {
    const g = playing(), p = g.paddles[0];
    g.ball = mode === "top" ? { x: p.x, y: p.y - HALF - R - .01, vx: 0, vy: 8 } : { x: p.x - 1, y: p.y, vx: mode === "back" ? -8 : 8, vy: 0 };
    g.step(STEP); assert.equal(g.total, 0, mode);
  }
});
test("out-of-zone and discontinuous paddles cannot score or get clamped", () => {
  for (const mode of ["outside", "jump"]) {
    const g = playing(), points = hands(); front(g);
    if (mode === "outside") { points[0].x = .48 * W; g.setPaddles(points); } else points[0].continuous = false;
    g.setPaddles(points); g.step(STEP); assert.equal(g.total, 0, mode); assert.equal(g.paused, false);
    if (mode === "outside") assert.equal(g.paddles[0].x, .48 * W);
  }
});
test("an invalid but tracked hand does not pause the game", () => {
  const g = playing(), p = hands(); p[0].x = W / 2; step(g, .3, p); assert.equal(g.paused, false); near(g.elapsed, .3);
});
test("return angles use equal XY units, specified offsets and capped vector speed", () => {
  for (const side of [0, 1]) for (let rally = 1; rally <= 35; rally++) {
    const v = returnVelocity(side, H / 2, H / 2, rally); near(v.angle * 180 / Math.PI, ANGLE_OFFSETS[(rally - 1) % 6]);
    near(Math.hypot(v.vx, v.vy), Math.min(.78, .50 + .014 * rally) * W); assert.equal(Math.sign(v.vx), side ? -1 : 1);
    near(returnVelocity(side, H / 2 + HALF + R, H / 2, rally).angle * 180 / Math.PI, Math.min(42, 36 + ANGLE_OFFSETS[(rally - 1) % 6]));
  }
});
test("wall-only contacts do not count and preserve speed", () => {
  const g = playing(); g.ball = { x: W / 2, y: R + .01, vx: -4, vy: -8 }; g.step(STEP);
  assert.equal(g.total, 0); assert.ok(g.ball.vy > 0); near(Math.hypot(g.ball.vx, g.ball.vy), Math.sqrt(80));
  assert.equal(g.takeEvents().filter(e => e.type === "WALL_BOUNCE").length, 1);
});
test("wall followed by paddle in the same step returns without duplication", () => {
  const g = playing(), points = hands(); points[0].y = .17 * H; g.setPaddles(points); g.setPaddles(points);
  const contactY = points[0].y - HALF - R, face = points[0].x + THICKNESS / 2 + R;
  // Use a paddle at the minimum zone edge; the ball first bounces at the rail,
  // then crosses its front face later within the same step.
  g.ball = { x: face + .04, y: R + .01, vx: -8, vy: -50 }; g.step(STEP);
  assert.equal(g.total, 1); assert.ok(g.ball.y >= R); assert.ok(contactY >= R);
  assert.deepEqual(g.takeEvents().filter(e => ["RETURN", "WALL_BOUNCE"].includes(e.type)).map(e => e.type), ["WALL_BOUNCE", "RETURN"]);
});
test("miss resets current rally and offset sequence; re-serves to the missed side at 650ms", () => {
  const g = playing(); g.rally = 8; g.best = 8; g.nextReceiver = 1; g.ball = { x: W + R, y: 1, vx: 8, vy: 0 };
  g.step(STEP); assert.equal(g.misses, 1); assert.equal(g.rally, 0); assert.equal(g.best, 8); assert.equal(g.phase, "serve_wait");
  step(g, .63); assert.equal(g.phase, "serve_wait"); step(g, .02); assert.equal(g.phase, "playing"); assert.equal(g.ball.vx, 8); assert.equal(g.nextReceiver, 1);
  near(g.elapsed, .658333333); near(returnVelocity(1, 4.5, 4.5, 1).angle * 180 / Math.PI, 8);
});
test("receiver loss just before contact freezes without a stale success or miss", () => {
  const g = playing(); front(g, 0, H / 2, .01); const p = hands(); p[0].present = false;
  g.setPaddles(p); g.step(STEP); assert.equal(g.phase, "paused"); assert.equal(g.total, 0); assert.equal(g.misses, 0); assert.ok(g.elapsed < STEP);
});
test("receiver loss before miss freezes without a stale failure", () => {
  const g = playing(); g.ball = { x: -R + .01, y: 1, vx: -8, vy: 0 }; const p = hands(); p[0].present = false;
  g.setPaddles(p); g.step(STEP); assert.equal(g.phase, "paused"); assert.equal(g.misses, 0);
});
test("150ms loss grace holds position, then pauses even away from collision", () => {
  const g = playing(), p = hands(); p[1].present = false; const old = g.paddles[1].x;
  step(g, .15, p); assert.equal(g.paused, false); assert.equal(g.paddles[1].x, old);
  step(g, STEP, p); assert.equal(g.paused, true); assert.equal(g.pauseReason, "tracking");
});
test("tracking recovery needs 500ms stability plus one second and preserves the round", () => {
  const g = playing(); g.rally = 4; g.best = 4; g.serveWait = .4; g.phase = "serve_wait"; g.pause("tracking"); const elapsed = g.elapsed;
  step(g, .49); assert.equal(g.resumeCount, null); step(g, .01); assert.equal(g.resumeCount, 1);
  step(g, .99); assert.equal(g.paused, true); step(g, .01); assert.equal(g.phase, "serve_wait");
  assert.equal(g.rally, 4); assert.equal(g.serveWait, .4); assert.equal(g.elapsed, elapsed);
  assert.deepEqual(g.takeEvents().filter(e => /TRACK/.test(e.type)).map(e => e.type), ["TRACK_LOST", "TRACK_RETURNED"]);
});
test("manual and rotation pauses require an explicit resume, then stable hands", () => {
  for (const reason of ["user", "rotation", "hidden", "processing"]) {
    const g = playing(); g.pause(reason); step(g, 2); assert.equal(g.paused, true); assert.equal(g.elapsed, 0);
    g.requestResume(); step(g, 1.5); assert.equal(g.phase, "playing", reason); assert.equal(g.elapsed, 0);
  }
});
test("overlap after recovery is separated without awarding a return or altering velocity", () => {
  const g = playing(); g.ball.x = g.paddles[0].x; g.pause("tracking"); const before = { ...g.ball };
  step(g, 1.5); assert.equal(g.total, 0); assert.equal(g.ball.vx, before.vx); assert.equal(g.ball.vy, before.vy);
  assert.ok(g.ball.x > g.paddles[0].x); assert.equal(g.elapsed, 0);
});
test("time-up beats an exactly simultaneous return and miss; results freeze", () => {
  for (const mode of ["return", "miss"]) {
    const g = playing(); g.elapsed = 30 - STEP;
    if (mode === "return") front(g, 0, H / 2, 8 * STEP); else g.ball = { x: -R + 8 * STEP, y: 1, vx: -8, vy: 0 };
    g.step(STEP); assert.equal(g.phase, "round_end"); assert.equal(g.total, 0); assert.equal(g.misses, 0); assert.equal(g.elapsed, 30);
    const result = g.result; step(g, 1); assert.equal(g.phase, "result"); assert.equal(g.result, result); assert.equal(g.total, 0);
  }
});
test("time-up during serve wait does not wait for the next serve", () => {
  const g = playing(); g.phase = "serve_wait"; g.serveWait = .6; g.elapsed = 30 - STEP; g.takeEvents(); g.step(STEP);
  assert.equal(g.phase, "round_end"); assert.deepEqual(g.takeEvents().map(e => e.type), ["ROUND_END"]);
});
test("prediction includes reflections, stays within 0.8 seconds and never changes velocity", () => {
  const g = playing(); g.ball = { x: 8, y: .3, vx: -8, vy: -5 }; const before = { ...g.ball }, guide = predictGuide(g);
  assert.ok(guide.points.length > 2); assert.ok(guide.points.every(p => p.y >= R && p.y <= H - R));
  assert.ok(guide.points.at(-1).x >= 8 - 8 * .8); assert.deepEqual(g.ball, before); assert.ok(guide.target);
});
test("fixed steps give identical simulation for different rendering batches", () => {
  const one = playing(), two = playing();
  for (let i = 0; i < 120; i++) step(one, STEP);
  for (let i = 0; i < 20; i++) step(two, 6 * STEP);
  near(one.elapsed, two.elapsed); near(one.ball.x, two.ball.x); near(one.ball.y, two.ball.y); assert.equal(one.total, two.total);
});
test("reset clears events, effects, serve timers and all previous-round counts", () => {
  const g = playing(); front(g); g.step(STEP); const roundId = g.roundId; g.reset("camera");
  assert.notEqual(g.roundId, roundId); assert.equal(g.total, 0); assert.equal(g.best, 0); assert.equal(g.elapsed, 0); assert.equal(g.serveWait, 0); assert.equal(g.lastHit, null); assert.deepEqual(g.takeEvents(), []);
});
test("palm uses five landmarks, mirrors once and cover crop does not clamp", () => {
  near(palmCenter(landmarks(.28, .5)).x, .28);
  const p = palmToCourt({ x: .1, y: .5 }, 3); assert.ok(p.x < 0); assert.equal(p.present, false);
  const center = palmToCourt({ x: .28, y: .5 }, 16 / 9); near(center.x, .28 * W); near(center.y, H / 2);
  assert.equal(palmCenter([]), null);
});
test("hand ownership follows velocity across crossing and ignores handedness changes", () => {
  const tracker = new PalmTracker(); tracker.update(detection([.28, .5], [.72, .6]), 0);
  let result;
  for (let i = 1; i <= 12; i++) {
    const x = .28 + i * .035; const r = detection([1 - x, .6], [x, .5]); r.handedness[1][0].categoryName = "Right";
    result = tracker.update(r, i * 40);
  }
  assert.ok(result[0].present); assert.ok(result[0].x > W / 2); assert.ok(result[1].x < W / 2);
});
test("third hand doesn't replace existing slots; one hand never controls both paddles", () => {
  const tracker = new PalmTracker(); tracker.update(detection([.28, .5], [.72, .5]), 0);
  const next = tracker.update(detection([.05, .9], [.73, .5], [.29, .5]), 40);
  near(next[0].x / W, .28 + .01 * (1 - Math.exp(-.04 / .06))); assert.ok(next.every(h => h.present));
  const single = tracker.update(detection([.30, .5]), 80); assert.equal(single.filter(h => h.present).length, 1);
});
test("ambiguous overlap, rapid jump, and cropped hand stop trustworthy interpolation", () => {
  const ambiguous = new PalmTracker(); ambiguous.update(detection([.45, .5], [.55, .5]), 0);
  assert.equal(ambiguous.update(detection([.5, .5], [.5, .5]), 30).filter(h => h.present).length, 0);
  const jump = new PalmTracker(); jump.update(detection([.15, .5], [.9, .5]), 0);
  assert.equal(jump.update(detection([.41, .5], [.9, .5]), 60)[0].present, false);
  const crop = new PalmTracker(); assert.equal(crop.update(detection([.01, .5], [.99, .5]), 0, 3).filter(h => h.present).length, 0);
});
test("lost interval isn't bridged on return; no new inference becomes lost", () => {
  const tracker = new PalmTracker(); tracker.update(detection([.28, .5], [.72, .5]), 0); tracker.update(detection([.29, .5], [.71, .5]), 40);
  assert.ok(tracker.sample(45).every(h => h.present)); tracker.update(detection([.7, .5]), 80);
  assert.equal(tracker.sample(85)[0].present, false); const returned = tracker.update(detection([.28, .5], [.72, .5]), 120);
  assert.equal(returned[0].continuous, false); assert.equal(tracker.sample(250).filter(h => h.present).length, 0);
});
test("record storage keeps aggregate practice and camera records separate", () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  saveResult({ source: "demo", bestRally: 18, totalReturns: 24 }, storage); saveResult({ source: "camera", bestRally: 4, totalReturns: 6 }, storage);
  const records = readRecords(storage); assert.equal(records.camera.best, 4); assert.equal(records.demo.best, 18); assert.equal(records.camera.rounds, 1);
  assert.doesNotMatch(data.get(RECORD_KEY), /landmarks|video|paddles|coordinate/); assert.equal(readRecords({ getItem() { throw Error("blocked"); } }).camera.best, 0);
});
test("guide and sound settings persist without exposing input history", () => {
  const values = new Map(), storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  saveSettings({ guide: false }, storage); saveSettings({ effects: false }, storage);
  assert.deepEqual(readSettings(storage), { guide: false, effects: false }); assert.equal(readRecords(storage).camera.rounds, 0);
  assert.deepEqual(readSettings({ getItem() { throw Error("denied"); } }), { guide: true, effects: true });
});
test("static centered paddles do not sustain a ten-return rally", () => {
  const g = playing(); step(g, 30.5); assert.ok(g.best < 10); assert.ok(g.misses > 0); assert.equal(g.phase, "result");
});
