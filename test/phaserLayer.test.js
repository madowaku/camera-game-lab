import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraInputBridge } from '../src/game-runtime/phaser/input/CameraInputBridge.js';
import { GameEventBus } from '../src/game-runtime/phaser/events/GameEventBus.js';
import { ObjectPool } from '../src/game-runtime/phaser/objects/ObjectPool.js';
import { CameraGestureEvents, palmPongSnapshot } from '../src/input/cameraGameState.js';
import { PalmTracker } from '../src/palmPong/tracking.js';
import { renderSize } from '../src/game-runtime/phaser/performance/PerformanceTier.js';

test('bridge rejects old frames, strips raw landmarks, bounds coordinates and expires tracking', () => {
  const bridge = new CameraInputBridge();
  const value = { timestamp: 10, leftHand: { visible: true, confidence: .9, x: .3, y: .7, landmarks: [1] } };
  assert.ok(bridge.publish(value)); value.leftHand.x = .8;
  assert.equal(bridge.sample(11).leftHand.x, .3);
  assert.equal(bridge.sample(11).leftHand.landmarks, undefined);
  assert.equal(bridge.publish({ timestamp: 9 }), false);
  assert.equal(bridge.sample(170).leftHand.visible, false);
  bridge.publish({ timestamp: 180, leftHand: { visible: true, x: -1, y: .2, confidence: 3 } });
  assert.equal(bridge.sample(180).leftHand.visible, false);
  assert.equal(bridge.sample(180).leftHand.confidence, 1);
});

test('mirrored cover-cropped tracker points reach the game in the same screen location', () => {
  const tracker = new PalmTracker(), bridge = new CameraInputBridge();
  const landmarks = x => Array.from({ length: 21 }, () => ({ x, y: .6 }));
  tracker.update({ landmarks: [landmarks(.75), landmarks(.25)] }, 100, 4 / 3);
  const snapshot = palmPongSnapshot(tracker.sample(100), 100);
  bridge.publish(snapshot);
  assert.equal(bridge.sample(100).leftHand.x, .25);
  assert.equal(bridge.sample(100).rightHand.x, .75);
  assert.ok(Math.abs(bridge.sample(100).leftHand.y - (.5 + .1 * (16 / 9) / (4 / 3))) < 1e-8);
  tracker.update({ landmarks: [] }, 150, 4 / 3);
  bridge.publish(palmPongSnapshot(tracker.sample(150), 150, snapshot));
  assert.equal(bridge.sample(150).leftHand.visible, false);
  assert.equal(bridge.sample(150).leftHand.velocityX, 0);
});

test('input edges fire once, release a lost pinch, and ignore discontinuous swipes', () => {
  const edges = new CameraGestureEvents();
  const frame = (timestamp, changes = {}) => ({ timestamp, rightHand: { visible: true, pinch: true, fist: false, continuous: true, velocityX: 2, ...changes } });
  assert.deepEqual(edges.update(frame(1)).map(e => e.type), ['pinch-start']);
  assert.deepEqual(edges.update(frame(50)).map(e => e.type), ['swipe']);
  assert.deepEqual(edges.update(frame(100)), []);
  assert.deepEqual(edges.update(frame(400, { continuous: false })), []);
  assert.deepEqual(edges.update(frame(450, { visible: false })).map(e => e.type), ['pinch-end']);
  edges.reset(); assert.deepEqual(edges.update({ timestamp: 500 }), []);
});

test('bounded pools reuse objects, reject duplicate releases and destroy every object once', () => {
  let created = 0, destroyed = 0;
  const pool = new ObjectPool().register('bullet', { max: 2, create: () => ({ id: ++created }), reset: (o, x) => o.x = x,
    deactivate: o => o.x = 0, destroy: () => destroyed++ });
  const first = pool.acquire('bullet', 4), second = pool.acquire('bullet', 8);
  assert.equal(pool.acquire('bullet'), null); assert.equal(pool.release(first), true); assert.equal(pool.release(first), false);
  assert.equal(pool.acquire('bullet', 9), first); assert.equal(first.x, 9);
  pool.reset(); assert.equal(pool.activeCount, 0); assert.equal(pool.size, 2);
  assert.ok(second); pool.destroy(); pool.destroy(); assert.equal(destroyed, 2);
});

test('semantic bus subscriptions can be removed on scene restart without removing external listeners', () => {
  const bus = new GameEventBus(), events = [];
  bus.on('*', e => events.push(e.type));
  for (let i = 0; i < 8; i++) { const off = bus.on('HIT', () => {}); bus.emit('HIT', { type: 'wrong', score: 1 }); off(); }
  assert.equal(bus.listenerCount, 1); assert.deepEqual(events, Array(8).fill('HIT'));
  bus.clear(); assert.equal(bus.listenerCount, 0);
});

test('mobile rendering budget caps high device pixel ratio', () => {
  assert.deepEqual(renderSize(360, 800, 4), { width: 540, height: 1200 });
});
