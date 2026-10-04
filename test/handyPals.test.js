import test from "node:test";
import assert from "node:assert/strict";
import { HandyPalsGame, danceFromMotion, DANCES, ROUND_SECONDS } from "../src/games/handyPals.js";
import { TwoHandTracker, handToStage } from "../src/handy/tracking.js";
import { experiments, validateRegistry } from "../src/platform/experiments.js";
import { resolveRoute } from "../src/platform/navigation.js";
import { resultPayload } from "../src/platform/share.js";
import { trackForGame } from "../src/platform/music.js";

const hands = (x = .28, other = .72) => [{ x, y: .7, present: true }, { x: other, y: .7, present: true }];
function advance(g, seconds, frames = hands()) {
  for (let t = 0; t < seconds - 1e-7; t += .05) { g.setHands(frames); g.step(Math.min(.05, seconds - t)); }
}
function playing() { const g = new HandyPalsGame({ random: () => 0 }); advance(g, 3.5); assert.equal(g.phase, "playing"); return g; }

test("both hands need a short stable hold; the automatic greeting works with no movement", () => {
  const g = new HandyPalsGame(); advance(g, 1, [hands()[0], { present: false }]);
  assert.equal(g.phase, "waiting"); advance(g, .4); assert.equal(g.phase, "intro");
  advance(g, 1.3); assert.equal(g.interaction.type, "highFive"); assert.equal(g.interaction.automatic, true);
  assert.equal(g.highFives, 0); advance(g, 1.8); assert.equal(g.phase, "playing");
  assert.equal(g.pals[0].visible, true); assert.equal(g.pals[1].visible, true);
});
test("six broad movements select distinct dances and still hands keep an idle dance", () => {
  assert.deepEqual(DANCES.map(dance => ({ step: { vx: .8 }, jump: { vy: -1 }, crouch: { vy: 1 }, spin: { circle: true }, dash: { vx: 3 }, sparkle: { opened: true } })[dance]).map(danceFromMotion), [...DANCES]);
  assert.equal(danceFromMotion({ vx: .05, vy: -.02 }), "idle");
});
test("character follow is soft and the right player responds more slowly even with equal species", () => {
  const g = new HandyPalsGame({ characters: ["bear", "bear"] }); g.setHands(hands()); g.start(); advance(g, 3.01);
  const oldA = g.pals[0].x, oldB = g.pals[1].x;
  g.setHands([{ x: oldA + .1, y: .7, present: true }, { x: oldB + .1, y: .7, present: true }]); g.step(.05);
  assert.ok(g.pals[0].x < oldA + .1); assert.ok(g.pals[0].x - oldA > g.pals[1].x - oldB);
  assert.ok(g.pals[0].pending.at <= g.pals[1].pending.at);
  assert.equal((g.pals[0].pending.at * 2) % 1, 0);
});
test("a close pair high-fives then hugs; holding close cannot keep retriggering", () => {
  const g = playing(); advance(g, .1, hands(.39, .61)); assert.equal(g.highFives, 1);
  advance(g, 1.6, hands(.46, .54)); assert.equal(g.hugs, 1);
  advance(g, 3, hands(.46, .54)); assert.equal(g.hugs, 1); assert.equal(g.highFives, 1);
  advance(g, .3); advance(g, .2, hands(.39, .61)); assert.equal(g.highFives, 2);
});
test("losing a hand preserves its pal through wobble and search, then recovers without a false dance", () => {
  const g = playing(), before = g.pals[1].x;
  advance(g, .5, [hands()[0], { present: false }]); assert.equal(g.pals[1].state, "wobble");
  assert.equal(g.pals[1].visible, true); assert.equal(g.pals[1].x, before);
  advance(g, .4, [hands()[0], { present: false }]); assert.equal(g.pals[1].state, "search");
  g.setHands(hands(.28, .8)); g.step(.05); assert.equal(g.pals[1].state, "present");
  assert.equal(g.pals[1].pending, null); assert.equal(g.pals[1].motion.vx, 0);
});
test("inference freshness loss is absorbed without a new wrong proximity interaction", () => {
  const g = playing(); const count = g.highFives;
  for (let i = 0; i < 15; i++) g.step(.1);
  assert.equal(g.pals[0].state, "search"); assert.equal(g.pals[1].state, "search"); assert.equal(g.highFives, count);
});
test("a broad circular hand path actually starts a turn", () => {
  const g = playing();
  for (let i = 0; i < 40; i++) {
    const a = i / 24 * Math.PI * 2;
    g.setHands([{ x: .28 + Math.sin(a) * .13, y: .68 + Math.cos(a) * .11, present: true }, hands()[1]]); g.step(.05);
  }
  assert.ok(g.actions.has("spin"));
});
test("30-second round has two forgiving prompts, final countdown, one photo and no score", () => {
  const g = playing(); advance(g, 10.2 - g.elapsed); assert.equal(g.cue, "highFive");
  advance(g, 3); assert.equal(g.prompt1.status, "almost"); assert.equal(g.cue, "almost");
  advance(g, 18.2 - g.elapsed); assert.equal(g.cue, "spin");
  advance(g, 3); assert.equal(g.prompt2.status, "almost");
  advance(g, 25.1 - g.elapsed); assert.equal(g.phase, "pose"); assert.equal(g.photoReady, false);
  advance(g, 3); assert.equal(g.photoReady, true); assert.equal(g.takeEvents().filter(e => e.type === "photo").length, 1);
  advance(g, 2); assert.equal(g.phase, "result"); assert.equal(g.elapsed, ROUND_SECONDS);
  assert.equal(g.result.scored, false); assert.equal(g.result.score, undefined); assert.deepEqual(g.result.prompts, ["almost", "almost"]);
  assert.equal(g.result.titleEn, "BEST BUDDIES");
});
test("pause freezes clock, countdown, movement and round time", () => {
  const g = playing(), elapsed = g.elapsed, clock = g.clock, x = g.pals[0].x;
  g.paused = true; g.setHands(hands(.6, .9)); advance(g, 3);
  assert.equal(g.elapsed, elapsed); assert.equal(g.clock, clock); assert.equal(g.pals[0].x, x);
  g.paused = false; advance(g, .2); assert.ok(g.elapsed > elapsed);
});

function detection(points) {
  return { landmarks: points.map(({ x, y }) => Array.from({ length: 21 }, () => ({ x: 1 - x, y, z: 0 }))),
    handedness: points.map(p => [{ categoryName: p.label, score: .99 }]) };
}
test("camera detector list reordering and hand crossing retain player identity", () => {
  const tracker = new TwoHandTracker();
  let slots = tracker.update(detection([{ x: .2, y: .6, label: "Left" }, { x: .8, y: .6, label: "Right" }]), 0);
  assert.equal(slots[0].label, "Left");
  slots = tracker.update(detection([{ x: .7, y: .6, label: "Right" }, { x: .3, y: .6, label: "Left" }]), 100);
  assert.equal(slots[0].label, "Left"); assert.ok(Math.abs(slots[0].x - .3) < 1e-8);
  slots = tracker.update(detection([{ x: .25, y: .6, label: "Right" }, { x: .75, y: .6, label: "Left" }]), 400);
  assert.equal(slots[0].x, .75); assert.equal(slots[1].x, .25);
});
test("one detected hand never substitutes for the missing labelled hand", () => {
  const tracker = new TwoHandTracker(); tracker.update(detection([{ x: .2, y: .6, label: "Left" }, { x: .8, y: .6, label: "Right" }]), 0);
  const slots = tracker.update(detection([{ x: .3, y: .6, label: "Right" }]), 100);
  assert.equal(slots[0].present, false); assert.equal(slots[1].present, true); assert.equal(slots[1].label, "Right");
});
test("mirrored palm coordinates use the camera cover crop and exclude cropped-out hands", () => {
  assert.equal(handToStage({ x: .5, y: .7, present: true }, 16 / 9).x, .5);
  assert.equal(handToStage({ x: .1, y: .7, present: true }, 16 / 9).present, false);
  const p = handToStage({ x: .6, y: .7, present: true }, 16 / 9);
  assert.ok(Math.abs(p.x - .72222222) < 1e-6); assert.equal(p.present, true);
});
test("registry, legacy link, licensed soundtrack and sharing preserve an unscored practice result", () => {
  const game = experiments.find(g => g.id === "solo-handy-pals");
  assert.deepEqual(validateRegistry(experiments), []); assert.equal(resolveRoute("#handy-pals").experiment, game);
  assert.equal(trackForGame(game, "camera").id, "handy");
  const payload = resultPayload(game, { outcome: "duo", scored: false, source: "demo", titleEn: "BEST BUDDIES" }, "en", "https://example.test");
  assert.match(payload.text, /Camera-free practice/); assert.doesNotMatch(payload.text, /pts|undefined/);
  assert.match(payload.url, /solo-handy-pals$/);
});
