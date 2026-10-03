import test from "node:test";
import assert from "node:assert/strict";
import { NoteEaterGame, NOTE_TYPES, grooveStage } from "../src/games/noteEater.js";
import { MouthState, noteEaterSignal } from "../src/noteEater/signals.js";
import { selectNoteEaterHighlight } from "../src/noteEater/creatorProfile.js";
import { experiments } from "../src/platform/experiments.js";
import { trackForGame, musicCreditMarkup } from "../src/platform/music.js";

const mouth = { x: .5, y: .5, width: .08 };
const sample = state => ({ state, mouth });
function playing() { const g = new NoteEaterGame({ random: () => .5 }); g.reset("camera");
  g.step(16, sample("CLOSED")); g.step(16, sample("OPEN")); g.step(3000, sample("CLOSED")); return g; }
function bite(g, type = 0) { g.notes[0] = { ...g.spawn(), x: .5, y: .5, vx: 0, vy: 0, type }; g.notes = g.notes.slice(0, 3);
  g.step(70, sample("CLOSED")); g.step(50, sample("OPEN")); }

test("NOTE EATER has one lazy 30-second face/mouth route with procedural audio and no microphone", () => {
  const game = experiments.find(g => g.id === "solo-note-eater");
  assert.equal(game.exp, "EXP-016"); assert.deepEqual(game.input, ["FACE", "MOUTH"]); assert.equal(game.duration, 30);
  assert.equal(game.requiresMicrophone, false); assert.ok(game.demo); assert.ok(game.loadPresentation);
  assert.equal(trackForGame(game, "demo"), null); assert.equal(musicCreditMarkup(game, "en"), "");
});
test("mouth hysteresis rejects short spikes, confirms ten deliberate openings and stays closed for 30 seconds", () => {
  const s = new MouthState(); s.update(.04, 0); assert.equal(s.update(.04, 70), "CLOSED");
  s.update(.5, 90); assert.equal(s.update(.04, 110), "CLOSED");
  let now = 200;
  for (let i = 0; i < 10; i++) { s.update(.5, now); assert.equal(s.update(.5, now + 50), "OPEN");
    s.update(.05, now + 100); assert.equal(s.update(.05, now + 170), "CLOSED"); now += 200; }
  for (let i = 0; i < 600; i++) assert.equal(s.update(.06, now + i * 50), "CLOSED");
});
test("stale, invalid and lost mouth observations become UNKNOWN rather than CLOSED", () => {
  const s = new MouthState(); s.update(.04, 0); s.update(.04, 70); s.update(.5, 100); s.update(.5, 150);
  assert.equal(s.update(undefined, 200), "UNKNOWN"); assert.equal(s.update(.5, 240), "UNKNOWN");
  assert.equal(s.update(.5, 300), "OPEN"); assert.equal(s.update(.5, 600), "UNKNOWN");
  assert.equal(s.update(NaN, 700), "UNKNOWN");
});
test("landmark input corrects video aspect and rejects ambiguous faces", () => {
  const f = Array.from({ length: 478 }, () => ({ x: .5, y: .5 })); f[61] = { x: .4, y: .5 }; f[291] = { x: .6, y: .5 };
  f[13] = { x: .5, y: .45 }; f[14] = { x: .5, y: .55 };
  assert.ok(Math.abs(noteEaterSignal({ faceLandmarks: [f] }, 2).ratio - .25) < 1e-6);
  assert.equal(noteEaterSignal({ faceLandmarks: [f, f] }), null);
  f[13].x = -1; assert.equal(noteEaterSignal({ faceLandmarks: [f] }), null);
});
test("the first bite is one safe choice, then a 3-2-1 countdown; it is excluded from round metrics", () => {
  const g = new NoteEaterGame(); g.step(16, sample("OPEN")); assert.equal(g.phase, "tutorial"); assert.equal(g.notes.length, 1);
  g.step(16, sample("CLOSED")); g.step(16, sample("OPEN")); assert.equal(g.phase, "countdown"); assert.equal(g.effects[0].type, "eat");
  assert.equal(g.eaten, 0); g.step(2999, sample("CLOSED")); assert.equal(g.phase, "countdown");
  g.step(1, sample("CLOSED")); assert.equal(g.phase, "playing"); assert.equal(g.elapsed, 0); assert.equal(g.notes.length, 3);
});
test("one open mouth eats only the nearest note and must close before the next bite", () => {
  const g = playing(); g.notes.forEach(n => { n.x = .5; n.y = .5; }); g.step(16, sample("OPEN")); assert.equal(g.eaten, 1);
  for (let i = 0; i < 100; i++) g.step(16, sample("OPEN")); assert.equal(g.eaten, 1);
  g.step(16, sample("CLOSED")); g.step(16, sample("OPEN")); assert.equal(g.eaten, 2);
});
test("tracking recovery with an open mouth cannot invent a bite and the music clock keeps moving", () => {
  const g = playing(); g.notes.forEach(n => { n.x = .5; n.y = .5; });
  g.step(500, null); assert.equal(g.elapsed, 500); g.step(100, sample("OPEN")); assert.equal(g.eaten, 0);
  g.step(16, sample("CLOSED")); g.step(16, sample("OPEN")); assert.equal(g.eaten, 1);
});
test("a quiet closed mouth never eats and a zero-note round still completes exactly at 30 seconds", () => {
  const g = playing(); for (let i = 0; i < 600; i++) g.step(50, sample("CLOSED"));
  assert.equal(g.eaten, 0); assert.equal(g.phase, "result"); assert.equal(g.result.durationMs, 30000); assert.equal(g.result.uniqueNotes, 0);
});
test("forgiving radius scales with mouth width and magnet pulls only nearby choices", () => {
  const g = playing(); g.mouth = mouth; assert.equal(g.eatRadius, .18);
  const n = { ...g.notes[0], x: .75, y: .5, vx: 0, vy: 0 }; g.notes = [n]; g.step(100, sample("CLOSED"));
  assert.ok(n.magnet); assert.ok(n.x < .75); assert.ok(g.magnetRadius > g.eatRadius);
});
test("passed choices softly sound without penalties or a groove reset, and replenish to three", () => {
  const g = playing(); g.groove = 50; g.notes.forEach(n => { n.age = 20000; }); g.step(100, sample("CLOSED"));
  assert.equal(g.effects.filter(e => e.type === "pass").length, 3); assert.equal(g.notes.length, 3); assert.ok(g.groove > 49);
});
test("groove grows through five backing stages, emits highlight hooks and preserves the melody order", () => {
  const g = playing(), order = [4, 0, 4, 2, 1, 3, 2, 0]; let fast = false;
  order.forEach(type => { bite(g, type); fast ||= g.events.some(e => e.type === "FAST_3_EATS" && e.data.priority === 100); });
  assert.ok(fast); assert.equal(grooveStage(g.groove), 4); assert.deepEqual(g.melody.map(n => n.type), order);
  g.step(30000, sample("CLOSED")); assert.equal(g.result.notesEaten, order.length); assert.equal(g.result.uniqueNotes, 5);
  assert.deepEqual(g.result.melody.map(n => n.midi), order.map(i => NOTE_TYPES[i].midi)); assert.equal(g.result.durationMs, 30000);
  assert.equal(g.events.find(e => e.type === "FINAL_EAT").at, g.lastBiteEvent.at);
});
test("pause freezes input, notes and clock; retry starts a fresh round with provenance", () => {
  const g = playing(); bite(g); const elapsed = g.elapsed; g.setPaused(true); g.step(5000, sample("OPEN")); assert.equal(g.elapsed, elapsed);
  g.setPaused(false); g.step(50, sample("OPEN")); assert.equal(g.eaten, 1); g.reset("demo"); assert.equal(g.eaten, 0); assert.equal(g.source, "demo");
});
test("creator chooses a continuous highlight around high-groove three bites in chronological order", () => {
  const frames = Array.from({ length: 241 }, (_, i) => ({ at: i * 125, blob: i }));
  const selected = selectNoteEaterHighlight(frames, [{ type: "FIRST_EAT", at: 1000, data: {} }, { type: "FAST_3_EATS", at: 17000, data: { priority: 100 } }]);
  assert.equal(selected.frames[0].at, 15000); assert.equal(selected.frames.at(-1).at, 21000); assert.deepEqual(selected.events, []);
});
