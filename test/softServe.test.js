import test from "node:test";
import assert from "node:assert/strict";
import { SoftServeGame, heightMultiplier } from "../src/games/softServe.js";
import { handCenter, mouthSignal } from "../src/softServe/signals.js";
import { projectMouth } from "../src/input/mouthPosition.js";
import { resolveRoute } from "../src/platform/navigation.js";
import { SoftServeAnimation } from "../src/softServe/animation.js";
import { resultPayload } from "../src/platform/share.js";

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
  advance(g, g.rules.readyMs); assert.equal(g.phase, "serve"); assert.equal(g.amount, 0);
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
  const empty = new SoftServeGame(); advance(empty, empty.rules.readyMs); advance(empty, 21000, { hand: { x: .71, y: .72 } });
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

test("made shape is copied before eating and survives mutations and a clean empty cone", () => {
  const g=served("demo",7);g.completeServe();const made=structuredClone(g.completedShape);
  g.segments[0].x=42;g.lean=.2;
  while(g.phase!=="result")g.bite();
  assert.equal(g.amount,0);assert.deepEqual(g.completedShape,made);
  assert.ok(made.amount>=7&&made.segments.length>90);
});
test("serve failure captures its shape once; repeated finish cannot replace the result",()=>{
  const g=served("demo",3);g.finish("splat");const result=g.result,shape=structuredClone(g.completedShape);
  g.segments.length=0;g.finish("clean");assert.equal(g.result,result);assert.deepEqual(g.completedShape,shape);
  assert.equal(g.result.cleanBonus,0);
});
test("bite events preserve the consumed size, pre-bite tip and food geometry",()=>{
  const g=served("demo",1.5);g.completeServe();const tip={...g.tip},amount=g.amount;
  g.bite();assert.equal(g.effect.size,1);assert.deepEqual(g.effect.tip,tip);assert.equal(g.effect.before.amount,amount);assert.equal(g.effect.afterAmount,g.amount);
  g.bite();assert.ok(g.effect.size<1);assert.equal(g.effect.afterAmount,0);assert.equal(g.effect.id,2);
});
test("presentation pauses independently and delivers clean or failure completion exactly once after 750ms",()=>{
  for(const outcome of ["clean","splat","melted","empty"]){
    const a=new SoftServeAnimation();a.consume({type:"lick",size:.4,tip:{x:.5,y:.4}}, {x:.4,y:.3});a.finish(outcome);
    assert.equal(a.advance(400),false);assert.equal(a.advance(400,true),false);assert.equal(a.finishAge,400);
    assert.equal(a.advance(3000),false);assert.equal(a.advance(349),false);assert.equal(a.advance(1),true);assert.equal(a.advance(100),false);
    const retry=new SoftServeAnimation();assert.equal(retry.advance(100),false);assert.equal(retry.bite,null);assert.equal(retry.finishAt,null);
  }
});
test("challenge text uses actual outcome, practice provenance and canonical environment URL",()=>{
  const game=resolveRoute("#soft-serve").experiment;
  for(const outcome of ["clean","splat","melted","empty"]){
    const p=resultPayload(game,{outcome,maxSwirls:3,source:"demo"},"ja","https://local.example/test#old");
    assert.ok(p.text.includes("練習"));assert.ok(p.text.includes(outcome==="clean"?"3段完食":"3段つくった"));
    assert.equal(p.url,"https://local.example/test#/game/solo-soft-serve");
  }
});

test("camera eating accepts a deliberate near-mouth approach hidden by the hand", () => {
  const g = served("camera", 3); g.completeServe();
  const near = () => ({ ...center, mouth: { x: g.tip.x, y: g.tip.y + .14 }, open: true });
  advance(g, 100, near); assert.equal(g.bites, 0);
  advance(g, 200, { ...center, mouth: null, open: false });
  assert.equal(g.bites, 1); assert.equal(g.paused, false);
  const amount = g.amount;
  advance(g, 400, { ...center, mouth: null, open: false });
  assert.equal(g.amount, amount); assert.equal(g.bites, 1);
});
test("camera eating accepts a hand occluded behind the cone after approaching", () => {
  const g = served("camera", 3); g.completeServe();
  advance(g, 100, () => ({ ...center, mouth: { x: g.tip.x, y: g.tip.y + .14 }, open: true }));
  assert.equal(g.bites, 0);
  advance(g, 200, { hand: null, mouth: { ...g.tip }, open: true });
  assert.equal(g.bites, 1);
});
test("a closed mouth, distant approach, and long tracking gap never create ghost bites", () => {
  for (const mouth of [
    { x: .04, y: .04, open: true },
    { x: .5, y: .5, open: false },
  ]) {
    const g = served("camera", 3); g.completeServe();
    advance(g, 100, { ...center, mouth: { x: mouth.x, y: mouth.y }, open: mouth.open });
    advance(g, 500, { ...center, mouth: null, open: false });
    assert.equal(g.bites, 0); assert.equal(g.paused, true);
  }
  const g = served("camera", 3); g.completeServe();
  advance(g, 60, () => ({ ...center, mouth: { x: g.tip.x, y: g.tip.y + .14 }, open: true }));
  g.step(600, { ...center, mouth: null, open: false });
  assert.equal(g.bites, 0); assert.equal(g.paused, true);
});
test("camera last-bite assist eats only the remaining half-swirl and credits its actual size", () => {
  const g = served("camera", 1.4); g.completeServe();
  g.paused = false; assert.equal(g.bite(), true);
  assert.equal(g.phase, "result"); assert.equal(g.result.outcome, "clean");
  assert.ok(Math.abs(g.effect.size - g.maxAmount) < .02);
  assert.equal(g.result.eatenPercent, 100);
  const strict = served("camera", 1.4); strict.completeServe();
  strict.rules.finalBiteGrace = 0; strict.bite();
  assert.equal(strict.phase, "eat"); assert.ok(strict.amount > 0);
});
test("occlusion assist can be disabled for A/B without changing normal contact", () => {
  const g = served("camera", 3); g.rules.occlusionGraceMs = 0; g.completeServe();
  advance(g, 100, () => ({ ...center, mouth: { x: g.tip.x, y: g.tip.y + .14 }, open: true }));
  advance(g, 200, { ...center, mouth: null, open: false });
  assert.equal(g.bites, 0); assert.equal(g.paused, true);
  // Strict mode needs the existing 450ms recovery before contact can accrue.
  advance(g, 750, () => ({ ...center, mouth: g.tip, open: true }));
  assert.equal(g.bites, 1);
});
