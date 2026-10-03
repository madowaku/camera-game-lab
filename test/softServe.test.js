import test from "node:test";
import assert from "node:assert/strict";
import { SoftServeGame, heightMultiplier } from "../src/games/softServe.js";
import { handCenter, mouthSignal } from "../src/softServe/signals.js";
import { projectMouth } from "../src/input/mouthPosition.js";
import { resolveRoute } from "../src/platform/navigation.js";

const center = { hand: { x: .5, y: .72 } };
function advance(g, ms, input = center) { for (let t = 0; t < ms; t += 20) g.step(Math.min(20, ms - t), typeof input === "function" ? input(t) : input); }
function served(source = "demo", amount = 5) {
  const g = new SoftServeGame(); g.reset(source); advance(g, 1000);
  let time = 0;
  while (g.amount < amount && g.phase === "serve") {
    const radius = Math.max(.025, .105 - g.amount * .007) * .9;
    g.step(20, { hand: { x: .5 + Math.sin(time / 230) * radius, y: .72 } }); time += 20;
  }
  return g;
}

test("SOFT SERVE has a canonical route, legacy alias, hand/mouth inputs and camera-free practice", () => {
  const game = resolveRoute("#soft-serve").experiment;
  assert.equal(game.id, "solo-soft-serve"); assert.equal(game.exp, "EXP-044");
  assert.equal(resolveRoute(game.route).experiment, game); assert.deepEqual(game.input, ["HAND", "MOUTH"]);
  assert.equal(game.demo, true); assert.equal(game.launchStepsJa.length, 3);
});
test("ready needs a visible hand held under the nozzle; no permission or face is implied", () => {
  const g = new SoftServeGame(); advance(g, 2000, null); assert.equal(g.phase, "ready");
  advance(g, 1500, { hand: { x: .8, y: .7 } }); assert.equal(g.phase, "ready");
  advance(g, 1200); assert.equal(g.phase, "serve"); assert.ok(g.amount < .3);
});
test("gentle shrinking swirls build a taller, more stable cone than a stationary hand", () => {
  const moving = served("demo", 9), still = new SoftServeGame(); advance(still, 1000); advance(still, moving.serveMs);
  assert.ok(moving.stability > still.stability + .2); assert.ok(moving.beauty > still.beauty + .25);
  assert.ok(moving.segments.length > 100); assert.equal(moving.multiplier, 3); assert.equal(moving.phase, "serve");
});
test("leaving the nozzle is a held, intentional transition; a brief excursion does not stop serving", () => {
  const g = served("camera", 3), away = { hand: { x: .83, y: .72 } };
  advance(g, 400, away); assert.equal(g.phase, "serve"); advance(g, 200, center); assert.equal(g.awayMs, 0);
  advance(g, 800, away); assert.equal(g.phase, "eat");
  const amount = g.amount; advance(g, 200, away); assert.equal(g.amount, amount);
});
test("hand/face loss and manual pause freeze heat, geometry and elapsed time", () => {
  const g = served("camera", 4); const before = [g.amount, g.melt, g.elapsedMs];
  advance(g, 1500, null); assert.deepEqual([g.amount, g.melt, g.elapsedMs], before);
  advance(g, 300); assert.deepEqual([g.amount, g.melt, g.elapsedMs], before);
  advance(g, 300); assert.ok(g.elapsedMs > before[2]);
  g.completeServe(); const frozen = [g.amount, g.melt, g.elapsedMs]; advance(g, 2000, center);
  assert.deepEqual([g.amount, g.melt, g.elapsedMs], frozen);
  assert.equal(g.bites, 0);
  g.setPaused(true); advance(g, 1000, { ...center, mouth: g.tip, open: true }); assert.deepEqual([g.amount, g.melt, g.elapsedMs], frozen);
});
test("camera eating requires an open mouth at the tip and a fresh approach for every bite", () => {
  const g = served("camera", 4); g.completeServe();
  advance(g, 300, { ...center, mouth: g.tip, open: false }); assert.equal(g.bites, 0);
  advance(g, 300, { ...center, mouth: { x: .1, y: .1 }, open: true }); assert.equal(g.bites, 0);
  advance(g, 200, () => ({ ...center, mouth: g.tip, open: true })); assert.equal(g.bites, 1);
  advance(g, 1000, () => ({ ...center, mouth: g.tip, open: true })); assert.equal(g.bites, 1);
  advance(g, 100, { ...center, mouth: { x: .1, y: .1 }, open: true });
  advance(g, 200, () => ({ ...center, mouth: g.tip, open: true })); assert.equal(g.bites, 1);
  advance(g, 200, { ...center, mouth: { x: .1, y: .1 }, open: true });
  advance(g, 200, () => ({ ...center, mouth: g.tip, open: true })); assert.equal(g.bites, 2);
});
test("camera mode ignores demo bites; demo bites consume one portion at a time", () => {
  const camera = served("camera", 3); camera.completeServe();
  advance(camera, 500, { ...center, mouth: { x: .1, y: .1 }, open: false, bite: true }); assert.equal(camera.bites, 0);
  const demo = served("demo", 3); demo.completeServe(); demo.step(20, { ...center, bite: true });
  assert.equal(demo.bites, 1); assert.ok(demo.amount > 1.9); assert.equal(demo.result, null);
});
test("eating everything earns height, beauty and clean bonuses and retains source", () => {
  const g = served("demo", 7); g.completeServe();
  while (g.phase !== "result") g.step(20, { ...center, bite: true });
  assert.equal(g.result.outcome, "clean"); assert.equal(g.result.source, "demo"); assert.equal(g.result.eatenPercent, 100);
  assert.equal(g.result.multiplier, 2); assert.equal(g.result.cleanBonus, 300); assert.ok(g.result.beautyBonus > 0);
  assert.equal(g.result.score, g.result.base + g.result.beautyBonus + g.result.cleanBonus + g.result.perfectBonus);
});
test("a failed unfinished cone only pays for the cream actually eaten", () => {
  const g = served("demo", 5); g.completeServe(); g.step(20, { ...center, bite: true }); g.finish("splat");
  assert.ok(g.result.eatenPercent > 0 && g.result.eatenPercent < 100); assert.equal(g.result.failedPhase, "eat");
  assert.equal(g.result.cleanBonus, 0); assert.equal(g.result.beautyBonus, 0); assert.equal(g.result.score, g.result.base);
});
test("melting and rapid movement can end a round during serve or eat", () => {
  const hot = new SoftServeGame({ meltPerSecond: 150 }); advance(hot, 1000); advance(hot, 1000);
  assert.equal(hot.result.outcome, "melted");
  for (const phase of ["serve", "eat"]) {
    const g = served("demo", 5); if (phase === "eat") g.completeServe();
    advance(g, 10000, t => ({ hand: { x: t % 40 ? .7 : .3, y: .72 } }));
    assert.equal(g.result.outcome, "splat"); assert.equal(g.result.failedPhase, phase);
  }
});
test("serve cap offers eating; missing the cream gives an understandable empty result", () => {
  const g = served("demo", 9); advance(g, 15000); assert.ok(["eat", "result"].includes(g.phase));
  const empty = new SoftServeGame(); advance(empty, 1000); advance(empty, 21000, { hand: { x: .71, y: .72 } });
  assert.equal(empty.result.outcome, "empty");
});
test("height rewards rise without requiring the player to reach a fixed target", () => {
  assert.deepEqual([3, 5, 7, 9, 10].map(heightMultiplier), [1, 1.5, 2, 3, 5]);
  const g = served("demo", 1); assert.equal(g.completeServe(), true);
  while (g.phase !== "result") g.step(20, { ...center, bite: true }); assert.equal(g.result.outcome, "clean");
});
test("landmark extraction tolerates invalid data and corrects mouth aspect ratio", () => {
  const palm = Array.from({ length: 21 }, () => ({ x: .6, y: .8 })); const point = handCenter({ landmarks: [palm] }); assert.ok(Math.abs(point.x - .6) < .001 && Math.abs(point.y - .8) < .001);
  palm[5].x = NaN; assert.equal(handCenter({ landmarks: [palm] }), null);
  const face = Array.from({ length: 478 }, () => ({ x: .5, y: .4 }));
  face[13] = { x: .5, y: .38 }; face[14] = { x: .5, y: .42 }; face[61] = { x: .4, y: .4 }; face[291] = { x: .6, y: .4 };
  assert.ok(Math.abs(mouthSignal({ faceLandmarks: [face] }, 2).ratio - .1) < .001);
  assert.equal(mouthSignal({ faceLandmarks: [face, face] }), null); face[13].y = 1.1; assert.equal(mouthSignal({ faceLandmarks: [face] }), null);
});
test("hand and mouth projection matches the mirrored object-fit cover camera image", () => {
  assert.deepEqual(projectMouth({ x: .25, y: .5 }, 720, 1280, 360, 640), { x: .75, y: .5 });
  assert.equal(projectMouth({ x: .05, y: .5 }, 1280, 720, 360, 640), null);
});
