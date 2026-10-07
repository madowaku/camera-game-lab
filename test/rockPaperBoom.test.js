import test from 'node:test';
import assert from 'node:assert/strict';
import { SIGNS, judge, SignWindow, RockPaperBoomGame, TIMING } from '../src/rockPaperBoom/core.js';
import { assignHands, containRect } from '../src/rockPaperBoom/tracking.js';
import { experiments, validateRegistry } from '../src/platform/experiments.js';
import { trackForGame } from '../src/platform/music.js';

test('all nine matchups have correct winners, three mirrored finishers and three unique draws', () => {
  const expected = [[0, 1, 2], [2, 0, 1], [1, 2, 0]], moves = new Set(), draws = new Set();
  SIGNS.forEach((a, i) => SIGNS.forEach((b, j) => {
    const r = judge(a, b); assert.equal(r.winner, expected[i][j]); assert.ok(Object.isFrozen(r));
    (r.winner ? moves : draws).add(r.move);
    if (r.winner) { const reverse = judge(b, a); assert.equal(reverse.winner, r.winner === 1 ? 2 : 1); assert.equal(reverse.move, r.move); }
  }));
  assert.equal(moves.size, 3); assert.equal(draws.size, 3); assert.equal(judge('UNKNOWN', 'PAPER'), null);
});
test('recognition window rejects low confidence, stale, sparse and gapped data', () => {
  const w = new SignWindow();
  for (let at = 0; at <= 240; at += 30) w.push('ROCK', .95, at);
  assert.equal(w.sample(240).sign, 'ROCK'); assert.equal(w.sample(370), null);
  w.reset(); for (let at = 0; at <= 240; at += 30) w.push('PAPER', .64, at); assert.equal(w.sample(240), null);
  w.reset(); [0, 30, 60, 240].forEach(at => w.push('SCISSORS', 1, at)); assert.equal(w.sample(240), null);
  w.reset(); [0, 100, 220].forEach(at => w.push('ROCK', 1, at)); assert.equal(w.sample(220), null);
});
test('a brief unknown may be outvoted but a newly changed hand cannot lock as an old sign', () => {
  const w = new SignWindow();
  for (let i = 0; i < 9; i++) w.push(i === 4 ? 'UNKNOWN' : 'ROCK', .9, i * 30);
  assert.equal(w.sample(240).sign, 'ROCK'); w.push('PAPER', .99, 270); assert.equal(w.sample(270), null);
  w.push('ROCK', .99, 270); assert.equal(w.frames.length, 10); // duplicate inference timestamp is not a new frame
});
const hands = (a = 'ROCK', b = 'SCISSORS') => [a, b].map(sign => ({ sign, confidence: .95 }));
function runner() {
  const g = new RockPaperBoomGame(); let at = 0;
  const tick = (seconds, signs = hands()) => { for (let i = 0; i < Math.ceil(seconds / .03); i++) { at += 30; if (signs) g.input(signs, at); g.step(.03, at); } };
  return { g, tick, now: () => at };
}
test('SHOOT discards countdown signs and locks both fresh hands atomically', () => {
  const { g, tick } = runner(); tick(.3); assert.equal(g.start(), true); tick(TIMING.beat * 3);
  assert.equal(g.phase, 'shoot'); assert.equal(g.result, null); assert.equal(g.ready, false);
  tick(.4, hands('PAPER', 'ROCK')); assert.equal(g.phase, 'freeze'); assert.equal(g.result.p1, 'PAPER'); assert.equal(g.result.winner, 1);
  const r = g.result; tick(.3, hands('ROCK', 'PAPER')); assert.equal(g.phase, 'freeze'); assert.equal(g.result, r);
  tick(.25); assert.equal(g.phase, 'boom'); tick(TIMING.boom); assert.equal(g.phase, 'result'); tick(TIMING.result); assert.equal(g.phase, 'again');
  assert.equal(g.start(), true); assert.equal(g.result, null); assert.equal(g.phase, 'countdown');
});
test('a missing second player, vanished inference, or unstable hand always retries without a result', () => {
  for (const samples of [hands('ROCK', 'UNKNOWN'), null]) {
    const { g, tick } = runner(); tick(.3); g.start(); tick(1.95); tick(1.7, samples);
    assert.equal(g.phase, 'retry'); assert.equal(g.result, null); assert.equal(g.rounds, 0);
    tick(1); assert.equal(g.phase, 'ready');
  }
});
test('pause freezes phase clock; resuming mid-count requires new hands and a fresh count', () => {
  const { g, tick } = runner(); tick(.3); g.start(); tick(.5); g.pause(); const clock = g.clock;
  tick(3); assert.equal(g.clock, clock); assert.equal(g.phase, 'countdown');
  g.resume(); assert.equal(g.phase, 'ready'); assert.equal(g.ready, false); assert.equal(g.start(), false);
  tick(.3); assert.equal(g.start(), true); assert.equal(g.count, 3);
});
test('impact sound event happens once at the actual sprite collision, after the silent freeze', () => {
  for (const signs of [hands('ROCK', 'SCISSORS'), hands('SCISSORS', 'PAPER'), hands('PAPER', 'ROCK')]) {
    const { g, tick } = runner(); tick(.3); g.start(); tick(1.95); tick(.4, signs); g.takeEvents();
    tick(.51, signs); assert.equal(g.phase, 'boom'); assert.equal(g.takeEvents().some(e => e.type === 'IMPACT'), false);
    tick(.5, signs); assert.equal(g.takeEvents().some(e => e.type === 'IMPACT'), false);
    tick(.4, signs); assert.equal(g.takeEvents().filter(e => e.type === 'IMPACT').length, 1);
    tick(1, signs); assert.equal(g.takeEvents().filter(e => e.type === 'IMPACT').length, 0);
  }
});
function detection(xs, names = xs.map(() => 'Closed_Fist')) {
  return { landmarks: xs.map(x => Array.from({ length: 21 }, () => ({ x, y: .5 }))), gestures: names.map(categoryName => [{ categoryName, score: .94 }]) };
}
test('rear camera assignment uses screen position and exact contain mapping without mirroring', () => {
  const a = assignHands(detection([.75, .25], ['Victory', 'Open_Palm']), 16 / 9);
  assert.equal(a[0].sign, 'PAPER'); assert.equal(a[1].sign, 'SCISSORS'); assert.ok(Math.abs(a[0].x - .25) < 1e-8); assert.ok(Math.abs(a[1].y - .5) < 1e-8);
  assert.deepEqual(containRect(9 / 16), { x: 0, y: 0, w: 1, h: 1 });
  const r = containRect(16 / 9); assert.ok(r.y > .3); assert.ok(Math.abs(r.y + r.h / 2 - .5) < 1e-8);
});
test('extra hands in a zone are ambiguous; center-line/outside/unrecognized hands never claim a player', () => {
  const a = assignHands(detection([.2, .3, .8]), 9 / 16); assert.equal(a[0].sign, 'UNKNOWN'); assert.equal(a[0].ambiguous, true); assert.equal(a[1].sign, 'ROCK');
  const b = assignHands(detection([.5, .98]), 9 / 16); assert.equal(b[0].sign, 'UNKNOWN'); assert.equal(b[1].sign, 'UNKNOWN');
  assert.equal(assignHands(detection([.2], ['Pointing_Up']), 9 / 16)[0].sign, 'UNKNOWN');
  assert.equal(assignHands({ landmarks: [[{ x: NaN }]] }, 1)[0].sign, 'UNKNOWN');
});
test('EXP-061 is registered as a rear-camera two-player Phaser game with licensed BGM', () => {
  const exp = experiments.find(g => g.id === 'duo-rock-paper-boom'); assert.equal(exp.players, 2); assert.equal(exp.renderer, 'phaser'); assert.equal(exp.duration, 6);
  assert.match(exp.privacyEn, /Rear camera/); assert.equal(trackForGame(exp, 'demo').id, 'finger'); assert.deepEqual(validateRegistry(experiments), []);
});
