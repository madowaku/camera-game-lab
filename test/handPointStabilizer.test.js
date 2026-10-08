import test from 'node:test';
import assert from 'node:assert/strict';
import { HandPointStabilizer } from '../src/input/handPointStabilizer.js';

test('first camera observation is instantaneous and copies its input', () => {
  const f = new HandPointStabilizer(), point = { x: 125, y: 260 };
  assert.deepEqual(f.update(point, 100), point);
  assert.notEqual(f.value, point);
});
test('small stationary fingertip jitter cannot repeatedly restart readiness', () => {
  const f = new HandPointStabilizer();
  assert.deepEqual(f.update({ x: 250, y: 200 }, 0), { x: 250, y: 200 });
  for (let i = 1; i <= 20; i++) {
    const p = f.update({ x: 250 + (i % 2 ? 2 : -2), y: 200 + (i % 2 ? -1 : 1) }, i * 40);
    assert.deepEqual(p, { x: 250, y: 200 });
  }
});
test('deliberate movements have minimal lag and do not freeze at slow speeds', () => {
  const f = new HandPointStabilizer();
  f.update({ x: 120, y: 200 }, 0);
  const moved = f.update({ x: 220, y: 200 }, 40);
  assert.ok(moved.x > 215 && moved.x <= 220, moved.x);
  let last = moved;
  for (let i = 1; i <= 15; i++) last = f.update({ x: 220 + i * 2, y: 200 }, 40 + i * 40);
  assert.ok(last.x > moved.x + 24, last.x);
});
test('missing, stale, out-of-order or invalid frames never produce a ghost cursor', () => {
  const f = new HandPointStabilizer();
  f.update({ x: 100, y: 100 }, 100);
  assert.equal(f.update(null, 140), null);
  assert.deepEqual(f.update({ x: 300, y: 280 }, 180), { x: 300, y: 280 });
  assert.deepEqual(f.update({ x: 130, y: 140 }, 600), { x: 130, y: 140 });
  assert.deepEqual(f.update({ x: 160, y: 170 }, 550), { x: 160, y: 170 });
  assert.equal(f.update({ x: NaN, y: 2 }, 560), null);
});
test('one source cannot mutate an already returned point', () => {
  const f = new HandPointStabilizer();
  const p = f.update({ x: 10, y: 10 }, 10); f.update({ x: 300, y: 10 }, 50);
  assert.deepEqual(p, { x: 10, y: 10 });
});
