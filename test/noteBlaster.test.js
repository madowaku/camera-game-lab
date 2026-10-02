import test from "node:test";
import assert from "node:assert/strict";
import { detectPitch, centsBetween, classifyNote, PitchTracker } from "../src/input/pitchAnalysis.js";
import { projectMouth } from "../src/input/mouthPosition.js";
import { NoteBlasterGame, laneY } from "../src/games/noteBlaster.js";

function tone(frequency, sampleRate = 48000, { harmonic = 0, amplitude = 0.2, offset = 0 } = {}) {
  return Float32Array.from({ length: 4096 }, (_, i) => offset + amplitude *
    (Math.sin(2 * Math.PI * frequency * i / sampleRate) + harmonic * Math.sin(4 * Math.PI * frequency * i / sampleRate)));
}
const pitch = (frequency) => ({ frequency, confidence: 0.98, rms: 0.1 });
const input = (lane = 0, grade = "PERFECT") => ({ voiced: true, note: { lane, grade }, mouth: { x: 0.14, y: 0.86 } });
function nearEnemy(game, lane = 0) { game.enemies.push({ id: ++game.serial, lane, x: 0.35, y: laneY(lane), age: 0 }); }

test("YIN detects low/high voices at common device sample rates, independent of DC offset", () => {
  for (const rate of [44100, 48000, 96000]) {
    for (const frequency of [82.41, 110, 196, 261.63, 440, 783.99]) {
      const found = detectPitch(tone(frequency, rate, { offset: 0.1 }), rate);
      assert.ok(found, `${rate}Hz / ${frequency}Hz`);
      assert.ok(Math.abs(centsBetween(found.frequency, frequency)) < 12, `${frequency}: ${found.frequency}`);
    }
  }
});

test("a louder second harmonic does not turn a voice into its octave", () => {
  const found = detectPitch(tone(196, 48000, { harmonic: 1.6 }), 48000);
  assert.ok(found);
  assert.ok(Math.abs(centsBetween(found.frequency, 196)) < 10);
});

test("silence, quiet input, unpitched noise, and invalid sample rates cannot fire", () => {
  assert.equal(detectPitch(new Float32Array(4096), 48000), null);
  assert.equal(detectPitch(tone(220, 48000, { amplitude: 0.002 }), 48000), null);
  let seed = 7;
  const noise = Float32Array.from({ length: 4096 }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 0.3;
  });
  assert.equal(detectPitch(noise, 48000), null);
  assert.equal(detectPitch(tone(220), 0), null);
});

test("relative five-note classification preserves beginner tolerance and midpoint hysteresis", () => {
  for (const [lane, step] of [0, 2, 4, 5, 7].entries()) {
    const found = classifyNote(173 * 2 ** (step / 12), 173);
    assert.equal(found.lane, lane); assert.equal(found.grade, "PERFECT");
  }
  assert.equal(classifyNote(220 * 2 ** (0.6 / 12), 220).grade, "GOOD");
  assert.equal(classifyNote(220 * 2 ** (1 / 12), 220).grade, "MISS");
  assert.equal(classifyNote(220 * 2 ** (4.55 / 12), 220, 2).lane, 2);
  assert.equal(classifyNote(220 * 2 ** (4.7 / 12), 220, 2).lane, 3);
  assert.equal(classifyNote(1000, 220).grade, "MISS");
});

test("calibration requires a sustained stable voice, recovers from gaps and uses the player's reference", () => {
  const tracker = new PitchTracker(); tracker.beginCalibration();
  for (let t = 0; t < 600; t += 40) tracker.update(pitch(170), t);
  tracker.update(null, 600);
  assert.equal(tracker.progress, 0); assert.equal(tracker.reference, null);
  for (let t = 640; t <= 1640; t += 40) tracker.update(pitch(170 + Math.sin(t) * 0.5), t);
  assert.ok(Math.abs(tracker.reference - 170) < 1);
  const found = tracker.update(pitch(170 * 2 ** (7 / 12)), 2000);
  assert.equal(found.note.lane, 4); assert.equal(found.note.grade, "PERFECT");
  assert.equal(tracker.update(null, 2040).note, null);
});

test("pitch smoothing rejects one-frame jitter and drops stale notes immediately on silence", () => {
  const tracker = new PitchTracker(); tracker.reference = 220;
  tracker.update(pitch(220), 0); tracker.update(pitch(220), 40);
  assert.equal(tracker.update(pitch(330), 80).note.lane, 0);
  assert.equal(tracker.update(null, 120).voiced, false);
  assert.equal(tracker.update(pitch(330), 160).note.lane, 4);
});

test("mouth projection mirrors and compensates cover cropping, rejecting mouths outside the tile", () => {
  assert.deepEqual(projectMouth({ x: 0.2, y: 0.7 }, 640, 480, 640, 480), { x: 0.8, y: 0.7 });
  assert.deepEqual(projectMouth({ x: 0.5, y: 0.5 }, 640, 480, 100, 200), { x: 0.5, y: 0.5 });
  assert.equal(projectMouth({ x: 0, y: 0.5 }, 640, 480, 100, 200), null);
  assert.equal(projectMouth({ x: NaN, y: 0.5 }, 640, 480, 100, 200), null);
});

test("short voice fires once; sustained voice respects cadence; missing mouth or wrong pitch never fires", () => {
  const game = new NoteBlasterGame(); game.start();
  game.step(16, input()); assert.equal(game.shots, 1);
  for (let i = 0; i < 5; i += 1) game.step(40, input());
  assert.equal(game.shots, 1);
  game.step(40, input()); assert.equal(game.shots, 2);
  game.step(40, {});
  game.step(40, { ...input(), mouth: null });
  game.step(40, input(0, "MISS")); assert.equal(game.shots, 2);
});

test("notes launch from the mouth, settle onto their lane and collide only with matching enemies", () => {
  const game = new NoteBlasterGame(); game.start(); game.spawnIn = Infinity;
  nearEnemy(game, 0); nearEnemy(game, 2);
  game.step(10, input());
  assert.ok(game.bullets[0].y > laneY(0));
  for (let i = 0; i < 5; i += 1) game.step(40, {});
  assert.equal(game.hits, 1); assert.equal(game.score, 150); assert.equal(game.combo, 1);
  assert.deepEqual(game.enemies.map((e) => e.lane), [2]);
});

test("three breaches end the round; replay resets counters, bullets and results", () => {
  const game = new NoteBlasterGame(); game.start(); game.spawnIn = Infinity;
  for (let i = 0; i < 3; i += 1) game.enemies.push({ id: i, lane: i, x: 0.27, age: 0 });
  game.step(16);
  assert.equal(game.result.reason, "GAME_OVER"); assert.equal(game.hp, 0);
  game.start(); assert.equal(game.hp, 3); assert.equal(game.result, null); assert.equal(game.shots, 0);
});

test("30 active seconds finish with bounded hit and PERFECT rates and all five lanes unlocked", () => {
  const game = new NoteBlasterGame({ random: () => 0 }); game.start();
  for (let i = 0; i < 300 && game.running; i += 1) game.step(100, input());
  assert.equal(game.result.reason, "TIME"); assert.equal(game.elapsed, 30000); assert.equal(game.level, 3);
  assert.ok(game.result.score > 0);
  assert.ok(game.result.accuracy <= 100); assert.equal(game.result.perfectRate, 100);
});

test("20 consecutive hits trigger fever, and misses reset the combo", () => {
  const game = new NoteBlasterGame(); game.start(); game.spawnIn = Infinity;
  for (let i = 0; i < 20; i += 1) {
    nearEnemy(game); game.step(10, input());
    for (let j = 0; j < 5; j += 1) game.step(40, {});
  }
  assert.equal(game.combo, 20); assert.equal(game.fever, true); assert.equal(game.maxCombo, 20);
  game.enemies.push({ id: 900, lane: 4, x: 0.27, age: 0 }); game.step(16);
  assert.equal(game.combo, 0);
});
