import test from "node:test";
import assert from "node:assert/strict";
import { extractWingsPose, lossInput, turnStrength } from "../src/input/bodyWingsPose.js";
import { BodyWingsGame, FLIGHT_RULES, RING_LINE } from "../src/games/bodyWings.js";
import { selectFlightHighlight } from "../src/wings/creatorProfile.js";
import { experiments } from "../src/platform/experiments.js";
import { trackForGame } from "../src/platform/music.js";

const frame = (tilt = 0, spread = true) => ({ tilt, spread });
const advance = (game, ms, input = frame(), dt = 20) => { for (let remaining = ms; remaining > 0; remaining -= dt) game.step(Math.min(remaining, dt), input); };
function rush() { const g = new BodyWingsGame("demo"); advance(g, 1500); advance(g, 8500); assert.equal(g.phase, "playing"); return g; }
function landmarks() {
  const l = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .1 }));
  for (const [i, x, y] of [[11,.65,.48],[12,.35,.48],[15,.94,.55],[16,.06,.56],[0,.5,.3],[7,.57,.30],[8,.43,.30]]) l[i] = { x, y, visibility: .95 };
  return l;
}
test("mirrored shoulders turn toward the lowered screen-side shoulder, with aspect correction", () => {
  const l = landmarks(); l[12].y = .54;
  const p = extractWingsPose(l, 4 / 3);
  assert.ok(p.tilt > 0); assert.ok(Math.abs(p.tilt - .15) < .001); assert.equal(p.spread, true);
  assert.equal(extractWingsPose(l, 2 / 3).tilt, p.tilt * 2);
  l[12].y = .48; l[11].y = .54; assert.ok(extractWingsPose(l).tilt < 0);
});
test("low-confidence shoulders reject input; hidden wrists do not end flight; offscreen wrists cannot start", () => {
  const l = landmarks(); l[15].visibility = .1; const p = extractWingsPose(l);
  assert.ok(p); assert.equal(p.spread, false);
  l[15] = { x: 1.1, y: .5, visibility: 1 }; assert.equal(extractWingsPose(l).spread, false);
  l[11].visibility = .2; assert.equal(extractWingsPose(l), null);
  assert.equal(extractWingsPose(landmarks(), 0), null);
});
test("spread hold requires 500 continuous ms, resets on loss and triggers a one-second transformation", () => {
  const g = new BodyWingsGame(); advance(g, 480); assert.equal(g.phase, "ready");
  g.step(20, null); assert.equal(g.holdMs, 0);
  advance(g, 500); assert.equal(g.phase, "transform");
  advance(g, 980, frame(0, false)); assert.equal(g.phase, "transform");
  advance(g, 20, frame(0, false)); assert.equal(g.phase, "tutorial");
});
test("tutorial requires a visible left move; stillness cannot claim the practice perfect", () => {
  const g = new BodyWingsGame(); advance(g, 1500); advance(g, 3200);
  assert.equal(g.phase, "tutorial"); assert.equal(g.tutorialDone, false);
  advance(g, 220, frame(-.24)); advance(g, 100);
  assert.equal(g.phase, "playing"); assert.equal(g.tutorialDone, true); assert.ok(g.elapsed < 100);
});
test("dead zone ignores sway, tilt controls velocity, neutral gently returns, and relaxed arms keep flying", () => {
  assert.equal(turnStrength(.039), 0); assert.ok(turnStrength(.12) > 0 && turnStrength(.12) < turnStrength(.24));
  const g = rush(); advance(g, 400, frame(.24, false)); const x = g.x;
  assert.ok(x > .6); assert.equal(g.phase, "playing");
  advance(g, 1300, frame(0, false)); assert.ok(g.x < x); assert.ok(g.x > .5);
});
test("tracking loss holds for 300ms then fades through 800ms; time and rings continue with stable autopilot", () => {
  assert.equal(lossInput(.2, 300), .2); assert.equal(lossInput(.2, 550), .1); assert.equal(lossInput(.2, 800), 0);
  const g = rush(); advance(g, 400, frame(.24)); const elapsed = g.elapsed;
  advance(g, 820, null); assert.equal(g.elapsed, elapsed + 820); assert.equal(g.trackingLosses, 1);
  const x = g.x; advance(g, 1500, null); assert.ok(g.x < x);
  advance(g, 100, frame(0, false)); assert.equal(g.missingMs, 0); assert.equal(g.phase, "playing");
});
test("manual pause and long stalled frames do not spend flight time or preserve a partial start hold", () => {
  const g = rush(); g.setPaused(true); const elapsed = g.elapsed, x = g.x;
  advance(g, 1000, frame(.5)); assert.equal(g.elapsed, elapsed); assert.equal(g.x, x);
  g.setPaused(false); g.step(1000, frame(.5)); assert.equal(g.elapsed, elapsed);
  const ready = new BodyWingsGame(); advance(ready, 400); ready.setPaused(true); assert.equal(ready.holdMs, 0);
});
test("perfect/good/miss separate scores, fifth success boosts for 2s, misses reset combo without locking steering", () => {
  const g = rush();
  for (let i = 0; i < 5; i++) { g.x = .5; g.grade({ id: i, x: .5 }); }
  assert.equal(g.score, 500); assert.equal(g.boosted, true); assert.equal(g.bestCombo, 5);
  g.grade({ id: 5, x: .62 }); assert.equal(g.score, 600); assert.equal(g.combo, 6);
  g.grade({ id: 6, x: .75 }); assert.equal(g.score, 600); assert.equal(g.combo, 0);
  advance(g, 2000, frame(-.24)); assert.equal(g.boosted, false); assert.ok(g.x < .5);
});
test("deterministic 30-ring course completes exactly 30 seconds, easy opening and truthful result metrics", () => {
  assert.equal(RING_LINE.length, 30); assert.deepEqual(RING_LINE.slice(0, 2).map(r => r.x), [.5,.5]);
  assert.ok(RING_LINE.slice(0, 5).every(r => Math.abs(r.x - .5) <= .10001));
  const g = rush(); advance(g, 29980); assert.equal(g.phase, "playing"); assert.equal(g.attempts, 29);
  advance(g, 20); assert.equal(g.phase, "result"); assert.equal(g.attempts, 30); assert.equal(g.elapsed, FLIGHT_RULES.roundMs);
  assert.equal(g.result.source, "demo"); assert.equal(g.result.totalRings, 30); assert.ok(g.result.distance >= 1500);
  const result = g.result; advance(g, 100); assert.equal(g.result, result);
});
test("five simulated body flights and reset retain independent receipts and bounded coordinates", () => {
  for (let round = 0; round < 5; round++) {
    const g = rush(); while (g.phase === "playing") {
      const target = RING_LINE[g.attempts]?.x ?? .5;
      g.step(20, frame(Math.max(-.3, Math.min(.3, (target - g.x) * 2)), false));
      assert.ok(g.x >= .16 && g.x <= .84);
    }
    assert.ok(g.result.rings >= 25); assert.ok(g.result.boosts >= 1);
    g.reset("camera"); assert.equal(g.phase, "ready"); assert.equal(g.rings, 0); assert.equal(g.result, null);
  }
});
test("best flight is a chronological six-second window around the strongest actual event", () => {
  const frames = Array.from({ length: 241 }, (_, i) => ({ at: i * 125, blob: i }));
  const selected = selectFlightHighlight(frames, [{ type: "MISS", at: 5000, data: { priority: 10 } }, { type: "BOOST", at: 23000, data: { priority: 100 } }]);
  assert.equal(selected.frames[0].at, 20500); assert.equal(selected.frames.at(-1).at, 26500); assert.equal(selected.events.length, 0);
  assert.deepEqual(selectFlightHighlight([], []).frames, []);
});
test("EXP-046 is a lazy portrait body input game with a commercially licensed OpenTracks music credit", () => {
  const game = experiments.find(g => g.id === "solo-body-wings");
  assert.equal(game.exp, "EXP-046"); assert.equal(game.duration, 30); assert.deepEqual(game.input, ["BODY"]);
  assert.equal(game.requiresMicrophone, false); assert.equal(game.demo, true); assert.ok(game.loadPresentation);
  assert.match(trackForGame(game, "camera").url, /opentracks.com\/bgm\/detail/);
});
