import test from 'node:test';
import assert from 'node:assert/strict';
import { experiments } from '../src/platform/experiments.js';
import { motionProfiles, motionSampleOf, motionCue } from '../src/platform/motionProfiles.js';

const sample = (id, instance, extra = {}) => motionSampleOf(instance, experiments.find(g => g.id === id), { phase: 'playing', ...extra });
const profile = motionProfiles['solo-air-slash'];
test('every playable route, including modes sharing a controller, has a motion identity', () => {
  for (const game of experiments) {
    assert.ok(motionProfiles[game.id], game.id);
    assert.ok(motionProfiles[game.id].stage);
  }
  assert.notEqual(motionProfiles['solo-hand-beat'].family, motionProfiles['solo-finger-gun'].family);
});
test('passive scores, attempts, damage and failed judgments never manufacture a success', () => {
  assert.equal(sample('solo-ghost-trail', { game: { score: 9000, hits: 3, nearMisses: 0 } }).success, 0);
  assert.equal(sample('outcam-frame-smuggler', { game: { score: 1000, keptMs: 9000, cleared: 0 } }).success, 0);
  assert.equal(sample('guardian-spirit', { game: { hits: 4, defeated: 0 } }).success, 0);
  assert.equal(sample('solo-pose-wall', { game: { walls: [{ rank: 'CRASH' }, { rank: 'PERFECT' }] } }).success, 1);
  assert.equal(sample('solo-daitai-hero', { game: { logs: [{ correct: false }, { correct: true }] } }).success, 1);
  assert.equal(sample('solo-tilt-turbo', { game: { hits: 3, near: 0 } }).success, 0);
});
test('both players and accepted bridge parts contribute measured feedback', () => {
  assert.equal(sample('duo-tiny-bot-duel', { game: { bots: [{ hits: 2 }, { hits: 3 }] } }).success, 5);
  assert.equal(sample('outcam-false-bridge', { game: { stages: [{ parts: [{}, {}] }], parts: [{}] } }).success, 3);
  assert.equal(sample('solo-handy-pals', { game: { highFives: 2, hugs: 1 } }).success, 3);
});
test('resting, penalties and counter resets do not replay success or combo', () => {
  const a = sample('solo-air-slash', { game: { sliced: 4, combo: 4 } });
  assert.equal(motionCue(a, a, profile), null);
  const bomb = sample('solo-air-slash', { game: { sliced: 4, combo: 0, score: -300 } });
  assert.equal(motionCue(a, bomb, profile), null);
  assert.equal(motionCue(a, { ...a, success: 0, combo: 0 }, profile), null);
  assert.equal(motionCue(null, a, profile), null);
});
test('a combo arrival fires once and stronger real events take priority', () => {
  const a = { success: 4, combo: 4 }, b = { success: 5, combo: 5 };
  assert.deepEqual(motionCue(a, b, profile), { kind: 'combo', label: '5 COMBO!' });
  assert.equal(motionCue(b, b, profile), null);
  assert.deepEqual(motionCue(a, { ...b, special: { key: 'x:1', label: 'X-SLASH!' } }, profile), { kind: 'special', label: 'X-SLASH!' });
  assert.equal(motionCue(a, { ...b, paused: true }, profile), null);
});
test('safe blink and attack cues preserve their meaning without calling them wins', () => {
  assert.equal(sample('solo-blink-horror', { game: { blinks: 4, safeBlinks: 0, stage: 'RUN' } }).success, 0);
  assert.equal(sample('solo-blink-horror', { game: { stage: 'GO', hides: 1 } }).special.label, 'GO!');
  assert.equal(motionProfiles['solo-dont-laugh'].label, '?!');
});
test('normalized positions are retained; invalid and pixel positions use a bounded center', () => {
  assert.deepEqual(sample('solo-note-eater', { game: { mouth: { x: .3, y: .6 } } }).point, { x: .3, y: .6 });
  for (const point of [{ x: NaN, y: .5 }, { x: 300, y: 400 }, { x: -.1, y: .5 }]) {
    assert.deepEqual(sample('solo-ghost-trail', { game: { player: point } }).point, { x: .5, y: .62 });
  }
});
