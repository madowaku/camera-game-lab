import test from "node:test";
import assert from "node:assert/strict";
import { ToyDrumGame, DrumHitDetector, DRUMS, BIG_DRUM, PATTERN, entryOnSegment } from "../src/games/toyDrum.js";
import { PalmTracker, projectPalm } from "../src/toyDrum/tracking.js";
import { experiments } from "../src/platform/experiments.js";
import { resolveRoute } from "../src/platform/navigation.js";
import { MusicBed, trackForGame } from "../src/platform/music.js";
const hand = (x, y, slot = 0, present = true) => ({ x, y, slot, present });
const at = (g, t) => { g.step(t - g.elapsed); return g; };
const start = () => { const g = new ToyDrumGame(); g.start(); return g; };
const landmarks = (x, y) => Array.from({ length: 21 }, () => ({ x: 1 - x, y }));

test("downward swept entry catches low-FPS swings and chooses only the first drum", () => {
  const d = new DrumHitDetector(); d.update([hand(.27, .48)], 1);
  assert.deepEqual(d.update([hand(.27, .94)], 1.08).map(h => h.drum), [0]);
  assert.equal(entryOnSegment(hand(.27, .5), hand(.27, .8), DRUMS[0]) != null, true);
});
test("resting, upward motion, slow approach and sideways motion never hit", () => {
  for (const path of [[hand(.27, .62), hand(.27, .63)], [hand(.27, .72), hand(.27, .56)], [hand(.27, .535), hand(.27, .55)], [hand(.02, .62), hand(.27, .62)]]) {
    const d = new DrumHitDetector(); d.update([path[0]], 0); assert.deepEqual(d.update([path[1]], .1), []);
  }
  const d = new DrumHitDetector(); d.update([hand(.27, .5)], 0); assert.equal(d.update([hand(.27, .62)], .08).length, 1);
  for (let i = 1; i <= 30; i++) assert.equal(d.update([hand(.27, .62 + Math.sin(i) * .003)], .08 + i * .04).length, 0);
});
test("one drum has a 200ms cooldown shared by both hands; exiting rearms it", () => {
  const d = new DrumHitDetector(); d.update([hand(.27, .5, 0), hand(.27, .49, 1)], 0);
  assert.equal(d.update([hand(.27, .62, 0), hand(.27, .62, 1)], .06).length, 1);
  d.update([hand(.27, .5)], .15); assert.equal(d.update([hand(.27, .62)], .2).length, 0);
  d.update([hand(.27, .5)], .27); assert.equal(d.update([hand(.27, .62)], .34).length, 1);
});
test("tracking gaps, stale frames and first-frame reacquisition cannot invent hits", () => {
  const d = new DrumHitDetector(); d.update([hand(.27, .5)], 1); d.update([], 1.02);
  assert.equal(d.update([hand(.27, .62)], 1.08).length, 0);
  d.update([hand(.27, .5)], 1.15); assert.equal(d.update([hand(.27, .62)], 1.5).length, 0);
  d.clearMotion(); assert.equal(d.update([hand(.27, .62)], 1.55).length, 0);
});
test("simultaneous hands can strike two separate drums and BIG DRUM", () => {
  const d = new DrumHitDetector(); d.update([hand(.27, .48), hand(.73, .48, 1)], 1);
  assert.deepEqual(d.update([hand(.27, .62), hand(.73, .62, 1)], 1.08).map(h => h.drum), [0, 1]);
  d.clearMotion(); d.update([hand(.4, .5), hand(.6, .5, 1)], 2, [BIG_DRUM]);
  assert.equal(d.update([hand(.4, .72), hand(.6, .72, 1)], 2.08, [BIG_DRUM]).length, 2);
});
test("30 active seconds contain free, rhythm, fever, finish and a truthful result", () => {
  const g = start(); assert.equal(g.phase, "free"); at(g, 5); assert.equal(g.phase, "rhythm");
  at(g, 20); assert.equal(g.phase, "fever"); at(g, 25); assert.equal(g.phase, "finish");
  at(g, 30); assert.equal(g.phase, "result"); assert.equal(g.result.duration, 30); assert.equal(g.result.finishSuccess, false);
  assert.equal(g.result.score, 0); assert.equal(g.result.bestCombo, 0); assert.equal(g.practiceHit(0), false);
});
test("wide cue window grades PERFECT at 220ms, allows good hits and keeps off-cue play audible", () => {
  const perfect = at(start(), 5.8); perfect.practiceHit(0); assert.equal(perfect.score, 200); assert.equal(perfect.perfects, 1); assert.equal(perfect.combo, 1);
  const good = at(start(), 6.3); good.practiceHit(0); assert.equal(good.score, 100); assert.equal(good.combo, 1);
  good.practiceHit(1); assert.equal(good.hits, 2); assert.equal(good.combo, 1);
  const wrong = at(start(), 5.8); wrong.practiceHit(3); assert.equal(wrong.hits, 1); assert.equal(wrong.combo, 0);
});
test("paired cue requires two different drums AND hands within 300ms", () => {
  const g = at(start(), 13.3); g.practiceHit(0, 0); g.practiceHit(1, 1); assert.equal(g.doubles, 1); assert.equal(g.combo, 1); assert.equal(g.score, 300);
  const sameHand = at(start(), 13.3); sameHand.practiceHit(0, 0); sameHand.practiceHit(1, 0); assert.equal(sameHand.doubles, 0); assert.equal(sameHand.combo, 0);
  const sameDrum = at(start(), 13.1); sameDrum.practiceHit(0, 0); at(sameDrum, 13.32); sameDrum.practiceHit(0, 1); assert.equal(sameDrum.doubles, 0); assert.equal(sameDrum.combo, 0);
  const late = at(start(), 13.1); late.practiceHit(0, 0); at(late, 13.5); late.practiceHit(1, 1); assert.equal(late.doubles, 0);
});
test("missing a cue resets combo but cannot stop the round", () => {
  const g = at(start(), 5.8); g.practiceHit(0); at(g, 8); assert.equal(g.combo, 0); assert.equal(g.bestCombo, 1); assert.equal(g.phase, "rhythm");
});
test("fever accepts all drums and finish counts only distinct simultaneous hands once", () => {
  const g = at(start(), 20.2); for (let id = 0; id < 4; id++) g.practiceHit(id); assert.equal(g.hits, 4); assert.equal(g.combo, 4);
  at(g, 25.2); assert.equal(g.practiceHit(0), false); g.practiceHit(4, 0); at(g, 25.45); g.practiceHit(4, 0); assert.equal(g.finishSuccess, false);
  g.practiceHit(4, 1); assert.equal(g.finishSuccess, true); const score = g.score; at(g, 26); assert.equal(g.practiceHit(4, 1), false); assert.equal(g.score, score);
});
test("pause freezes time and motion; retry clears all round state", () => {
  const g = start(); g.practiceHit(0); g.paused = true; g.step(20); g.input([hand(.73, .4)], 1); assert.equal(g.elapsed, 0); assert.equal(g.practiceHit(1), false);
  g.paused = false; g.start(); assert.equal(g.score, 0); assert.equal(g.hits, 0); assert.equal(g.doubles, 0); assert.equal(g.bestCombo, 0); assert.equal(g.detector.previous.size, 0);
});
test("five deterministic perfect rounds complete with independent receipts", () => {
  const g = new ToyDrumGame(), results = [];
  for (let i = 0; i < 5; i++) { g.start(); for (const n of PATTERN) { at(g, n.at); n.drums.forEach((d, slot) => g.practiceHit(d, slot)); } at(g, 20.2); g.practiceHit(0); at(g, 25.2); g.practiceHit(4, 0); g.practiceHit(4, 1); at(g, 30); results.push(g.result); }
  assert.equal(new Set(results).size, 5); assert.ok(results.every(r => r.finishSuccess && r.hits > 15 && r.bestCombo >= 14));
});
test("palm slots ignore handedness flips and order reversals; camera projection matches cover", () => {
  const tracker = new PalmTracker(); tracker.update({ landmarks: [landmarks(.25, .4), landmarks(.75, .4)] }, 0);
  const swapped = tracker.update({ landmarks: [landmarks(.7, .45), landmarks(.3, .45)], handedness: [[{ categoryName: "Left" }], [{ categoryName: "Right" }]] }, 60);
  assert.ok(Math.abs(swapped[0].x - .3) < 1e-9); assert.ok(Math.abs(swapped[1].x - .7) < 1e-9); assert.ok(tracker.update({ landmarks: [] }, 80).every(h => !h.present));
  assert.equal(projectPalm(hand(.5, .6), 16 / 9).x, .5); assert.equal(projectPalm(hand(.9, .5), 16 / 9).present, false); assert.equal(projectPalm(hand(.5, .5), 9 / 16).y, .5);
});
test("EXP-047 has canonical routing, a licensed music credit and no mic", () => {
  const game = experiments.find(g => g.exp === "EXP-047"); assert.equal(resolveRoute("#toy-drum").experiment, game); assert.equal(game.requiresMicrophone, false); assert.equal(game.duration, 30); assert.equal(trackForGame(game, "camera").creator, "いまたく");
});
test("fever music changes rate without losing playback offset across pause", async () => {
  const nodes = [], c = { state: "running", currentTime: 0, destination: {}, resume: async () => {}, close: async () => {}, decodeAudioData: async () => ({ duration: 36 }), createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }), createBufferSource: () => { const n = { playbackRate: {}, connect() {}, disconnect() {}, start(_, offset) { this.offset = offset; }, stop() {} }; nodes.push(n); return n; } };
  const bed = new MusicBed({ contextFactory: () => c, fetchBytes: async () => new ArrayBuffer(1) }); bed.arm({ id: "toy", volume: .2, load: async () => ({ default: "toy" }) });
  await new Promise(resolve => setImmediate(resolve)); bed.update({ phase: "playing" }); c.currentTime = 20; bed.update({ phase: "playing", musicRate: 1.18 });
  assert.equal(nodes[1].offset, 20); assert.equal(nodes[1].playbackRate.value, 1.18); c.currentTime = 25; bed.update({ phase: "playing", paused: true, musicRate: 1.18 }); bed.update({ phase: "playing", musicRate: 1 });
  assert.ok(Math.abs(nodes[2].offset - 25.9) < .001); assert.equal(nodes[2].playbackRate.value, 1); bed.stop();
});
