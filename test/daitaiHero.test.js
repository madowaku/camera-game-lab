import test from "node:test";
import assert from "node:assert/strict";
import { DaitaiHeroGame, DAITAI_RULES } from "../src/games/daitaiHero.js";
import { QUESTIONS, createQuestionDeck } from "../src/daitai/questions.js";
import { FaceZoneTracker } from "../src/input/faceZones.js";
import { extractFaceXs } from "../src/input/faceZoneInput.js";
import { translate } from "../src/i18n.js";

const neutral = { ready: true, neutral: true, zone: "NEUTRAL" };
const zone = (value) => ({ ready: true, neutral: false, zone: value });
function round(control = "TAP") {
  const game = new DaitaiHeroGame({ random: () => 0, rules: { countdownMs: 0 } });
  game.start(control, 0);
  game.tick(0, neutral);
  return game;
}
function advance(game, duration, input = neutral) {
  const end = game.lastAt + duration;
  while (game.lastAt < end) game.tick(Math.min(end, game.lastAt + 60), input);
}

test("fixed dataset preserves all 12 specified answers and both languages", () => {
  assert.equal(QUESTIONS.length, 12);
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, 12);
  assert.deepEqual(QUESTIONS.map((q) => q.correctIndex), [0, 0, 0, 2, 2, 2, 0, 0, 0, 1, 1, 2]);
  for (const q of QUESTIONS) {
    assert.equal(q.choicesJa.length, 3); assert.equal(q.choicesEn.length, 3);
    assert.ok(q.promptJa && q.promptEn);
  }
  assert.equal(translate("ja", "modeDaitaiHero"), "だいたい勇者");
  assert.equal(translate("en", "dhCalibrate"), "Center your face");
});

test("decks cover all questions without three categories in a row, including cycle boundaries", () => {
  for (const random of [() => 0, () => 0.9999, Math.random]) {
    let history = [];
    for (let cycle = 0; cycle < 40; cycle++) {
      const deck = createQuestionDeck(random, history);
      assert.equal(new Set(deck.map((q) => q.id)).size, 12);
      const categories = [...history.slice(-2), ...deck.map((q) => q.category)];
      for (let i = 2; i < categories.length; i++) assert.ok(categories[i] !== categories[i - 1] || categories[i] !== categories[i - 2]);
      history = categories.slice(-2);
    }
  }
});

test("calibration needs one continuously stable face; loss and two faces never count down", () => {
  const tracker = new FaceZoneTracker();
  for (let t = 0; t <= 2000; t += 50) tracker.update([0.5], t);
  assert.ok(tracker.sample(2000).calibrationProgress > 0.5);
  assert.equal(tracker.update([], 2050).calibrationProgress, 0);
  for (let t = 2100; t <= 5500; t += 50) tracker.update([0.4, 0.6], t);
  assert.equal(tracker.sample(5500).ready, false);
  for (let t = 5550; t <= 8550; t += 50) tracker.update([0.5], t);
  assert.equal(tracker.sample(8550).ready, true);
  assert.equal(tracker.baseFaceX, 0.5);
  assert.equal(tracker.sample(8900).presence, "FACE_LOST");
  assert.equal(tracker.baseFaceX, 0.5);
});

test("mirrored coordinates, configurable threshold and hysteresis match the displayed direction", () => {
  const points = [];
  points[234] = { x: 0.6 }; points[454] = { x: 0.8 };
  assert.ok(Math.abs(extractFaceXs({ faceLandmarks: [points] })[0] - 0.3) < 1e-9);
  assert.deepEqual(extractFaceXs({ faceLandmarks: [points, points] }), []);
  const tracker = new FaceZoneTracker({ calibrationMs: 50, smoothingMs: 0.001 });
  tracker.update([0.5], 0); tracker.update([0.5], 50);
  assert.equal(tracker.update([0.35], 100).zone, "LEFT");
  assert.equal(tracker.update([0.389], 150).zone, "LEFT");
  assert.equal(tracker.update([0.41], 200).zone, "CENTER");
  assert.equal(tracker.update([0.5], 250).zone, "NEUTRAL");
  assert.equal(tracker.update([0.65], 300).zone, "RIGHT");
  const wider = new FaceZoneTracker({ threshold: 0.15, calibrationMs: 50, smoothingMs: 0.001 });
  wider.update([0.5], 0); wider.update([0.5], 50);
  assert.equal(wider.update([0.63], 100).zone, "CENTER");
});

test("neutral and sideways returns never submit; a fresh completed nod selects center once", () => {
  const game = round("FACE");
  advance(game, 1500);
  assert.equal(game.logs.length, 0);
  advance(game, 60, zone("CENTER"));
  advance(game, 600);
  assert.equal(game.logs.length, 0);
  const startedAt = game.lastAt;
  advance(game, 180, { ...neutral, neutral: false, nodProgress: 0.6 });
  assert.equal(game.candidate, 1);
  assert.equal(game.logs.length, 0);
  advance(game, 60, { ...neutral, nodId: 1, nodStartedAt: startedAt });
  assert.equal(game.logs.length, 1);
  assert.equal(game.logs[0].selectedIndex, 1);
  advance(game, 1500, { ...neutral, nodId: 1, nodStartedAt: startedAt });
  assert.equal(game.logs.length, 1);
});

test("a side answer holds 180ms, locks until neutral and cannot leak into the next question", () => {
  const game = round("FACE");
  advance(game, 180, zone("LEFT"));
  assert.equal(game.logs.length, 0);
  advance(game, 60, zone("LEFT"));
  assert.equal(game.logs.length, 1);
  const first = game.question.id;
  advance(game, 900, zone("LEFT"));
  assert.equal(game.question.id, first);
  assert.equal(game.submitAnswer(0, "MOUSE"), false);
  advance(game, 180);
  assert.notEqual(game.question.id, first);
  advance(game, 900);
  assert.equal(game.logs.length, 1);
});

test("an aborted side movement and return never accidentally chooses center", () => {
  const game = round("FACE");
  advance(game, 60, zone("CENTER"));
  advance(game, 120, zone("RIGHT"));
  advance(game, 60, zone("CENTER"));
  advance(game, 600);
  assert.equal(game.logs.length, 0);
});

test("tracking loss pauses time and clears the held answer; recovery requires neutral", () => {
  const game = round("FACE");
  advance(game, 120, zone("RIGHT"));
  const elapsed = game.elapsedMs;
  advance(game, 2000, { ready: false, zone: "NEUTRAL" });
  assert.equal(game.elapsedMs, elapsed);
  advance(game, 600, zone("RIGHT"));
  assert.equal(game.logs.length, 0);
  advance(game, 180);
  advance(game, 240, zone("RIGHT"));
  assert.equal(game.logs.length, 1);
});

test("touch and mouse use the same scoring, feedback lock and response-time path", () => {
  for (const inputType of ["TOUCH", "MOUSE"]) {
    const game = round();
    advance(game, 1000);
    assert.equal(game.submitAnswer(game.question.correctIndex, inputType), true);
    assert.equal(game.score, 150);
    assert.equal(game.submitAnswer(2, inputType), false);
    advance(game, 600);
    assert.equal(game.submitAnswer((game.question.correctIndex + 1) % 3, inputType), true);
    const stats = game.result();
    assert.equal(stats.correct, 1); assert.equal(stats.total, 2);
    assert.equal(stats.accuracy, 50); assert.equal(stats.maxCombo, 1);
    assert.equal(game.combo, 0); assert.equal(game.score, 150);
    assert.equal(game.logs[0].responseTimeMs, 1000);
    assert.equal(game.logs[0].inputType, inputType);
  }
});

test("all 12 questions are playable; ten consecutive face answers remain stable", () => {
  const game = round("FACE");
  for (let i = 0; i < 12; i++) {
    const correctIndex = game.question.correctIndex;
    if (correctIndex === 1) {
      const startedAt = game.lastAt;
      advance(game, 180, { ...neutral, neutral: false, nodProgress: 0.7 });
      advance(game, 60, { ...neutral, nodId: i + 1, nodStartedAt: startedAt });
    }
    else advance(game, 240, zone(correctIndex === 0 ? "LEFT" : "RIGHT"));
    assert.equal(game.logs.length, i + 1);
    assert.equal(game.logs[i].correct, true);
    advance(game, 600);
    advance(game, 120);
    assert.equal(game.logs.length, i + 1);
  }
  assert.equal(new Set(game.logs.map((l) => l.questionId)).size, 12);
  assert.equal(game.result().maxCombo, 12);
});

test("exactly 30s ends a round, rejects late answers, and replay clears metrics", () => {
  const game = round();
  advance(game, DAITAI_RULES.roundMs - 1);
  assert.equal(game.phase, "PLAYING");
  advance(game, 1);
  assert.equal(game.phase, "RESULT");
  assert.equal(game.submitAnswer(0), false);
  assert.equal(game.result().averageResponseTimeMs, null);
  game.start("TAP", 40_000); game.tick(40_000);
  assert.equal(game.phase, "PLAYING");
  assert.equal(game.elapsedMs, 0); assert.equal(game.score, 0); assert.deepEqual(game.logs, []);
});

test("countdown waits for neutral and cannot advance with a missing face", () => {
  const game = new DaitaiHeroGame();
  game.start("FACE", 0);
  advance(game, 4000, { ready: false });
  advance(game, 4000, zone("LEFT"));
  assert.equal(game.phase, "COUNTDOWN");
  advance(game, 3000);
  assert.equal(game.phase, "PLAYING");
  assert.equal(game.elapsedMs, 0);
});
