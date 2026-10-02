import test from "node:test";
import assert from "node:assert/strict";
import { PositionHistory } from "../src/ghost/history.js";
import { GhostTrailGame, sweptDistance, pointDistance } from "../src/games/ghostTrail.js";
import { nosePosition, projectGhostPosition } from "../src/input/ghostPosition.js";
import { experiments } from "../src/platform/experiments.js";

const center = { x: .5, y: .5 };
const orbit = (time) => ({ x: .5 + .3 * Math.cos(time / 19000 * Math.PI * 2), y: .5 + .225 * Math.sin(time / 19000 * Math.PI * 2) });
function advance(game, until, trajectory = orbit, dt = 25) {
  while (game.elapsedMs < until && game.phase !== "result") game.step(Math.min(dt, until - game.elapsedMs), trajectory(game.elapsedMs + dt));
}
test("ghost registry has its own lazy module, canonical URL and camera-free demo", () => {
  const g = experiments.find((e) => e.id === "solo-ghost-trail");
  assert.equal(g.exp, "EXP-030"); assert.equal(g.module, "ghost"); assert.equal(g.duration, 30);
  assert.equal(g.demo, true); assert.equal(g.route, "#/game/solo-ghost-trail");
});
test("history interpolates intended delay, rejects unavailable time and is bounded", () => {
  const h = new PositionHistory(4, 13000);
  h.add(0, { x: 0, y: .2 }); h.add(100, { x: 1, y: .8 });
  assert.equal(h.at(50).x, .5); assert.equal(h.at(50).y, .5);
  assert.equal(h.at(-1), null); assert.equal(h.at(101), null);
  h.add(200, center); h.add(300, center); h.add(400, center);
  assert.equal(h.length, 4); assert.equal(h.at(0), null); assert.equal(h.at(100).x, 1);
  h.add(399, center); h.add(NaN, center); assert.equal(h.length, 4);
  h.clear(); assert.equal(h.at(400), null);
});
test("history never interpolates across tracking recovery and retains a boundary sample", () => {
  const h = new PositionHistory(2048, 13000);
  for (let t = 0; t <= 30000; t += 25) h.add(t, center, t < 20000 ? 0 : 1);
  assert.ok(h.length <= 522); assert.equal(h.at(17987).x, .5);
  assert.equal(h.at(19990), null); assert.equal(h.at(20000).segment, 1);
});
test("raw input requires exactly one finite nose and matches mirrored cover crop", () => {
  const face = [{}, { x: .4, y: .5 }];
  assert.deepEqual(nosePosition({ faceLandmarks: [face] }), { x: .4, y: .5 });
  for (const faceLandmarks of [[], [face, face], [[{}, { x: NaN, y: .5 }]], [[{}, { x: 1.1, y: .5 }]]]) assert.equal(nosePosition({ faceLandmarks }), null);
  assert.deepEqual(projectGhostPosition(center, 640, 480, 360, 480), center);
  assert.ok(Math.abs(projectGhostPosition({ x: .6, y: .4 }, 640, 480, 360, 480).x - (1 - (384 - 140) / 360)) < 1e-10);
  assert.equal(projectGhostPosition({ x: .01, y: .5 }, 640, 480, 360, 480), null);
  assert.equal(projectGhostPosition(center, 0, 0, 360, 480), null);
});
test("30 seconds includes recording, adds 3/6/9/12 second echoes at 3/6/12/20 seconds", () => {
  const g = new GhostTrailGame(); g.start("demo"); g.step(1, orbit(0)); advance(g, 2999);
  assert.equal(g.ghosts.length, 0); assert.equal(g.phase, "recording");
  for (const [time, delays] of [[3000, [3000]], [6000, [3000, 6000]], [12000, [3000, 6000, 9000]], [20000, [3000, 6000, 9000, 12000]]]) {
    advance(g, time); assert.deepEqual(g.ghosts.map((p) => p.delay), delays);
    for (const ghost of g.ghosts) assert.deepEqual({ x: ghost.x, y: ghost.y }, { x: g.history.at(time - ghost.delay).x, y: g.history.at(time - ghost.delay).y });
  }
  advance(g, 30000);
  assert.equal(g.result.outcome, "survived"); assert.equal(g.result.seconds, 30); assert.equal(g.result.lives, 3);
  assert.equal(g.result.score, 300); assert.equal(g.result.source, "demo"); assert.equal(g.result.maxGhosts, 4);
});
test("stationary center and corner lose three lives with spawn grace and global invulnerability", () => {
  for (const point of [center, { x: .06, y: .06 }]) {
    const g = new GhostTrailGame(); g.start(); advance(g, 3799, () => point);
    assert.equal(g.lives, 3); advance(g, 3825, () => point); assert.equal(g.lives, 2);
    const atHit = g.elapsedMs; advance(g, atHit + 1000, () => point); assert.equal(g.lives, 2);
    advance(g, 9000, () => point); assert.equal(g.result.outcome, "caught"); assert.equal(g.result.hits, 3);
    assert.equal(g.result.nearMisses, 0); assert.ok(g.result.seconds < 9);
  }
});
test("tracking loss and pause freeze timer/history/score; recovery requires consecutive valid input", () => {
  const g = new GhostTrailGame(); g.start(); advance(g, 2000);
  const length = g.history.length, score = g.score;
  for (let i = 0; i < 30; i++) g.step(100, null);
  assert.equal(g.elapsedMs, 2000); assert.equal(g.history.length, length); assert.equal(g.score, score);
  for (let i = 0; i < 5; i++) g.step(100, center);
  g.step(100, null); g.step(100, center); assert.equal(g.paused, true);
  for (let i = 0; i < 5; i++) g.step(100, center);
  assert.equal(g.paused, false); assert.equal(g.elapsedMs, 2000);
  g.step(25, center); assert.equal(g.elapsedMs, 2025);
  g.setPaused(true); g.step(100, center); assert.equal(g.elapsedMs, 2025);
  g.setPaused(false); g.step(10000, center); assert.equal(g.elapsedMs, 2025);
});
test("swept collision catches crossing between samples, with portrait-correct distance", () => {
  assert.equal(sweptDistance({ x: .1, y: .5 }, { x: .9, y: .5 }, center, center), 0);
  assert.ok(Math.abs(pointDistance(center, { x: .5, y: .575 }) - .1) < 1e-10);
  const g = new GhostTrailGame(); g.start(); g.elapsedMs = 5000;
  const ghost = { ...center, solid: true, delay: 3000, segment: 0 };
  g.player = { x: .9, y: .5 }; g.ghosts = [ghost]; g.collide({ x: .1, y: .5 }, [ghost]);
  assert.equal(g.lives, 2);
});
test("near miss pays on escape once; contact and stationary proximity earn nothing", () => {
  const make = () => {
    const g = new GhostTrailGame(); g.start(); g.elapsedMs = 5000;
    g.ghosts = [{ ...center, solid: true, delay: 3000, segment: 0 }]; return g;
  };
  const g = make();
  g.player = { x: .61, y: .5 }; g.collide({ x: .7, y: .5 }, g.ghosts); assert.equal(g.nearMisses, 0);
  g.player = { x: .71, y: .5 }; g.collide({ x: .61, y: .5 }, g.ghosts); assert.equal(g.nearMisses, 1);
  g.collide(g.player, g.ghosts); assert.equal(g.nearMisses, 1); assert.equal(g.score, 100);
  const hit = make(); hit.player = { x: .54, y: .5 }; hit.collide({ x: .7, y: .5 }, hit.ghosts);
  assert.equal(hit.nearMisses, 0); assert.equal(hit.lives, 2);
  const still = make(); still.player = { x: .61, y: .5 }; still.collide(still.player, still.ghosts);
  still.ghosts[0].x = .3; still.collide(still.player, []); assert.equal(still.nearMisses, 0);
});
test("retry clears all history, encounters, damage and result with fresh provenance", () => {
  const g = new GhostTrailGame(); g.start("camera"); advance(g, 9000, () => center); assert.ok(g.result);
  g.start("demo"); assert.equal(g.history.length, 0); assert.equal(g.score, 0); assert.equal(g.result, null);
  assert.equal(g.lives, 3); assert.equal(g.ghosts.length, 0); assert.equal(g.encounters.size, 0);
  assert.equal(g.phase, "recording"); assert.equal(g.source, "demo");
});
test("high refresh displays retain all four echoes for the whole round in bounded memory", () => {
  const g = new GhostTrailGame(); g.start("demo"); advance(g, 29000, orbit, 3);
  assert.equal(g.ghosts.length, 4); assert.ok(g.history.length < 820);
  assert.ok(g.history.at(g.elapsedMs - 12000));
  advance(g, 30000, orbit, 3); assert.equal(g.result.outcome, "survived"); assert.equal(g.result.score, 300);
});
