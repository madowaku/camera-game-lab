import test from 'node:test';
import assert from 'node:assert/strict';
import { MouthMusicGame, NOTES, SHAPES, musicStage, sectionAt, ROUND_MS } from '../src/mouthMusic/core.js';

const closed = { mouth: { x: .5, y: .58 }, state: 'CLOSED' };
const open = { ...closed, state: 'OPEN' };
const playing = () => { const g = new MouthMusicGame(() => .1); g.phase = 'playing'; g.nextSpawn = Infinity; return g; };
const target = (g, types = [0]) => { g.notes = types.map((type, i) => ({ id: ++g.id, type, start: closed.mouth,
  x: .5, y: .58, born: g.elapsed - 1700, travel: 1700, offset: i * .03 })); };

test('five distinct shapes map only to C major pentatonic notes', () => {
  assert.deepEqual(NOTES, ['C4', 'D4', 'E4', 'G4', 'A4']); assert.equal(new Set(SHAPES).size, 5);
});
test('held-open input catches once; a real close rearms the next bite', () => {
  const g = playing(); target(g); g.step(16, open); assert.equal(g.eaten, 0);
  g.step(16, closed); g.step(16, open); assert.equal(g.eaten, 1);
  target(g); for (let i = 0; i < 5; i++) g.step(16, open); assert.equal(g.eaten, 1);
  g.step(16, closed); g.step(16, open); assert.equal(g.eaten, 2);
});
test('unknown, pause and reacquisition cannot create a phantom bite', () => {
  const g = playing(); target(g); g.step(16, closed); const at = g.elapsed;
  g.step(100, { state: 'UNKNOWN' }); assert.equal(g.elapsed, at);
  g.step(16, open); assert.equal(g.eaten, 0);
  g.step(16, closed); g.setPaused(true); g.step(100, closed); g.setPaused(false); g.step(16, open); assert.equal(g.eaten, 0);
  g.step(16, closed); g.step(16, open); assert.equal(g.eaten, 1);
});
test('mouth collision collects nearby shapes together, keeps distant shapes silent', () => {
  const g = playing(); target(g, [0, 2, 3]);
  g.notes.push({ id: ++g.id, type: 4, start: { x: 1.08, y: 0 }, born: g.elapsed, travel: 1700, offset: 0 });
  g.step(16, closed); g.step(16, open);
  assert.equal(g.eaten, 3); assert.equal(g.chords, 1); assert.equal(g.triads, 1); assert.equal(g.notes.length, 1);
  assert.deepEqual(g.melody[0].types, [0, 2, 3]); assert.equal(g.events[0].type, 'bite');
});
test('every successful bite grows music at 5/10/15/20; missing shapes reset the streak silently', () => {
  const g = playing();
  for (let i = 1; i <= 20; i++) { target(g); g.step(16, closed); g.step(16, open); assert.equal(musicStage(g.combo), Math.min(4, Math.floor(i / 5))); }
  assert.equal(g.maxCombo, 20);
  target(g); g.notes[0].born -= 1000; g.step(16, closed);
  assert.equal(g.combo, 0); assert.deepEqual(g.events, []); assert.equal(g.eaten, 20);
});
test('countdown waits for valid input and finishes before the 30 second round starts', () => {
  const g = new MouthMusicGame();
  g.step(100, { state: 'UNKNOWN' }); assert.equal(g.countdown, 0);
  for (let i = 0; i < 30; i++) g.step(100, closed);
  assert.equal(g.phase, 'playing'); assert.equal(g.elapsed, 0); assert.equal(g.armed, false);
});
test('round choreography creates singles, pairs and finale triads aimed at the mouth', () => {
  assert.deepEqual([0, 5000, 15000, 25000].map(sectionAt), [0, 1, 2, 3]);
  const g = playing();
  for (const [at, count] of [[0, 1], [5000, 1], [15000, 2], [25000, 2], [26000, 3]]) {
    g.elapsed = at; g.notes = []; g.spawn();
    assert.equal(g.notes.length, count); assert.equal(new Set(g.notes.map(n => n.type)).size, count);
  }
});
test('30 seconds returns musical counts, preserved chords and no synthetic score', () => {
  const g = playing(); target(g, [0, 2]); g.step(16, closed); g.step(16, open);
  g.elapsed = ROUND_MS - 50; g.step(100, closed);
  assert.equal(g.phase, 'result'); assert.equal(g.elapsed, ROUND_MS); assert.equal(g.result.notesEaten, 2);
  assert.equal(g.result.chords, 1); assert.equal(g.result.scored, false); assert.equal(g.result.score, undefined);
  const result = structuredClone(g.result); g.step(100, open); assert.deepEqual(g.result, result);
});
