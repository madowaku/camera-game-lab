import test from 'node:test';
import assert from 'node:assert/strict';
import { SwingTracker } from '../src/outcam/swingTracker.js';
import { gradeStrike } from '../src/outcam/watermelonRules.js';

const target = { x: 0.5, y: 0.65 };
test('fast descent is scored at target height, never at swing onset', () => {
  const tracker = new SwingTracker();
  assert.equal(tracker.update({ x: 0.4, y: 0.3 }, 0, target), null);
  assert.equal(tracker.update({ x: 0.4, y: 0.5 }, 80, target), null);
  const hit = tracker.update({ x: 0.6, y: 0.8 }, 160, target);
  assert.ok(Math.abs(hit.x - 0.5) < 1e-9);
  assert.equal(hit.y, target.y);
  assert.equal(gradeStrike(target, hit).grade, 'HIT');
  assert.equal(tracker.update({ x: 0.6, y: 0.9 }, 200, target), null);
});
test('60fps movement accumulates enough travel to count', () => {
  const tracker = new SwingTracker();
  const strikes = [];
  for (let frame = 0; frame < 20; frame++) {
    const hit = tracker.update({ x: 0.5, y: 0.4 + frame * 0.02 }, frame * 16, target);
    if (hit) strikes.push(hit);
  }
  assert.equal(strikes.length, 1);
});
test('slow positioning and upward motion do not spend a melon', () => {
  const tracker = new SwingTracker();
  for (let frame = 0; frame < 40; frame++) {
    assert.equal(tracker.update({ x: 0.5, y: 0.5 + frame * 0.005 }, frame * 16, target), null);
  }
  tracker.reset();
  tracker.update({ x: 0.5, y: 0.8 }, 0, target);
  assert.equal(tracker.update({ x: 0.5, y: 0.5 }, 80, target), null);
});
test('tracking loss, stale frames and new targets cannot invent a strike', () => {
  for (const interruption of ['loss', 'gap', 'target']) {
    const tracker = new SwingTracker();
    tracker.update({ x: 0.5, y: 0.3 }, 0, target);
    if (interruption === 'loss') tracker.update(null, 40, target);
    assert.equal(tracker.update({ x: 0.5, y: 0.8 }, interruption === 'gap' ? 300 : 80,
      interruption === 'target' ? { ...target } : target), null);
  }
});
test('horizontal offset uses actual stage aspect ratio', () => {
  assert.equal(gradeStrike(target, { x: 0.7, y: 0.65 }, 0.5).grade, 'HIT');
  assert.equal(gradeStrike(target, { x: 0.7, y: 0.65 }, 1.5).grade, 'MISS');
});
