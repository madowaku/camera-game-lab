import test from 'node:test';
import assert from 'node:assert/strict';
import { exponentialSmooth, smoothVec2, applyDeadZone, responseCurve, createSpring1D, createSpring2D,
  createInertia1D, createInertia2D, magneticSnap, SNAP_STATES, FEEL_PRESETS } from '../src/inputFeel/index.js';
import { PaddleFeel } from '../src/palmPong/feel.js';
import { PalmTracker } from '../src/palmPong/tracking.js';
import { PalmPongGame, STEP } from '../src/palmPong/core.js';

const close = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
function run(fps, seconds, update) { for (let i = 0; i < fps * seconds; i++) update(1 / fps); }

test('exponential smoothing converges equally at 30/60/120 FPS and handles zero tau/dt', () => {
  const results = [30, 60, 120].map(fps => { let value = 0; run(fps, 1, dt => value = exponentialSmooth(value, 1, dt, .07)); return value; });
  for (const value of results) close(value, 1 - Math.exp(-1 / .07));
  assert.equal(exponentialSmooth(3, 10, 0, .07), 3);
  assert.equal(exponentialSmooth(3, 10, .1, 0), 10);
  assert.equal(exponentialSmooth(3, NaN, .1, .07), 3);
  const current = { x: 0, y: 1 }, target = { x: 1, y: -1 }, out = {};
  assert.equal(smoothVec2(current, target, .1, .07, out), out);
  close(out.x, exponentialSmooth(0, 1, .1, .07)); close(out.y, exponentialSmooth(1, -1, .1, .07));
  assert.deepEqual(current, { x: 0, y: 1 }); assert.deepEqual(target, { x: 1, y: -1 });
});

test('dead zone and response curves preserve center, continuity, sign and full scale', () => {
  for (const value of [-.1, -.05, 0, .05, .1]) assert.equal(applyDeadZone(value, .1), 0);
  close(applyDeadZone(.2, .1), 1 / 9); close(applyDeadZone(.100001, .1), .000001 / .9);
  for (const exponent of [.7, 1, 1.4, 2]) for (const sign of [-1, 1]) {
    assert.equal(responseCurve(sign, exponent), sign);
    assert.equal(Math.sign(responseCurve(sign * .4, exponent)), sign);
    close(responseCurve(sign * .4, exponent), sign * .4 ** exponent);
  }
  assert.equal(applyDeadZone(1, 1), 0); assert.equal(applyDeadZone(5, .1), 1);
  assert.equal(responseCurve(NaN, 1), 0); assert.throws(() => responseCurve(.4, 0), RangeError);
});

test('exact springs agree at 30/60/120 FPS for under/critical/over damping', () => {
  for (const damping of [.35, 1, 2]) {
    const results = [30, 60, 120].map(fps => {
      const spring = createSpring1D({ frequency: 3, damping });
      run(fps, 1, dt => spring.update(1, dt)); return { ...spring.state };
    });
    results.forEach(value => { close(value.value, results[0].value); close(value.velocity, results[0].velocity); });
    assert.ok(Math.abs(results[0].value - 1) < .01);
  }
  const spring = createSpring1D();
  let previous = 0;
  for (let i = 0; i < 120; i++) { const { value } = spring.update(1, 1 / 120); assert.ok(value >= previous && value <= 1 + 1e-12); previous = value; }
});

test('spring scalar/vector velocity and displacement limits, reset and held dt', () => {
  const one = createSpring1D({ maxVelocity: 2 }), two = createSpring2D({ maxVelocity: 2 });
  const state = two.state, value = state.value, velocity = state.velocity;
  for (let i = 0; i < 120; i++) {
    const a = one.state.value, b = { ...two.state.value };
    one.update(100, 1 / 60); two.update({ x: 100, y: 100 }, 1 / 60);
    assert.ok(Math.abs(one.state.velocity) <= 2); assert.ok(Math.hypot(two.state.velocity.x, two.state.velocity.y) <= 2 + 1e-12);
    assert.ok(one.state.value - a <= 2 / 60 + 1e-12);
    assert.ok(Math.hypot(two.state.value.x - b.x, two.state.value.y - b.y) <= 2 / 60 + 1e-12);
  }
  assert.equal(two.update({ x: 0, y: 0 }, 0), state);
  assert.equal(two.reset({ x: 3, y: 4 }), state); assert.equal(state.value, value); assert.equal(state.velocity, velocity);
  assert.deepEqual(two.state, { value: { x: 3, y: 4 }, velocity: { x: 0, y: 0 } });
  one.reset(); assert.deepEqual(one.state, { value: 0, velocity: 0 });
  const uncapped = createSpring2D(); uncapped.update({ x: 2, y: -3 }, 10);
  close(uncapped.state.value.x, 2); close(uncapped.state.value.y, -3);
});

test('inertia travel and stopping distance agree at 30/60/120 FPS', () => {
  const results = [30, 60, 120].map(fps => {
    const inertia = createInertia1D({ friction: 5, stopThreshold: .01 }); inertia.push(10);
    run(fps, 2, dt => inertia.update(dt)); return { ...inertia.state };
  });
  for (const result of results) { assert.equal(result.velocity, 0); close(result.position, (10 - .01) / 5); }
  const free = createInertia1D({ friction: 0, stopThreshold: 0 }); free.push(3); free.update(10);
  assert.deepEqual(free.state, { position: 30, velocity: 3 });
});

test('inertia caps vector magnitude and impulses, ignores invalid steps, and resets in place', () => {
  const one = createInertia1D({ maxVelocity: 2 }), two = createInertia2D({ maxVelocity: 5 });
  one.push(30); assert.equal(one.state.velocity, 2); one.push(-30); assert.equal(one.state.velocity, -2);
  two.push({ x: 30, y: 40 }); close(two.state.velocity.x, 3); close(two.state.velocity.y, 4);
  const before = structuredClone(two.state), state = two.state;
  two.update(NaN); two.update(-1); two.push({ x: NaN, y: Infinity }); assert.deepEqual(two.state, before);
  two.update(1); assert.ok(Math.hypot(two.state.velocity.x, two.state.velocity.y) < 5);
  assert.equal(two.reset(), state); assert.deepEqual(two.state, { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });
  one.reset(4); assert.deepEqual(one.state, { position: 4, velocity: 0 });
});

test('2D spring and inertia preserve direction and agree across frame rates', () => {
  const results = [30, 60, 120].map(fps => {
    const spring = createSpring2D({ frequency: 3 }), inertia = createInertia2D({ friction: 5, stopThreshold: .01 });
    inertia.push({ x: 3, y: 4 });
    run(fps, 2, dt => { spring.update({ x: 3, y: -4 }, dt); inertia.update(dt); });
    return structuredClone({ spring: spring.state, inertia: inertia.state });
  });
  for (const result of results) for (const axis of ['x', 'y']) {
    close(result.spring.value[axis], results[0].spring.value[axis]);
    close(result.spring.velocity[axis], results[0].spring.velocity[axis]);
    close(result.inertia.position[axis], results[0].inertia.position[axis]);
    assert.equal(result.inertia.velocity[axis], 0);
  }
  close(results[0].inertia.position.x / results[0].inertia.position.y, 3 / 4);
});

test('extreme and invalid dt never destabilize normal springs, inertia or smoothing', () => {
  for (const dt of [.1, 1, 10, 0, -1, NaN, Infinity]) for (const damping of [0, .4, 1, 1.00001, 5]) {
    const spring = createSpring1D({ damping }), inertia = createInertia1D();
    spring.reset(2, -3); inertia.push(5); spring.update(-1, dt); inertia.update(dt);
    assert.ok([spring.state.value, spring.state.velocity, inertia.state.position, inertia.state.velocity, exponentialSmooth(0, 1, dt, .07)].every(Number.isFinite));
  }
  for (const options of [{ frequency: 0 }, { damping: -1 }, { maxVelocity: NaN }]) assert.throws(() => createSpring1D(options), RangeError);
  for (const options of [{ friction: -1 }, { stopThreshold: -1 }, { maxVelocity: NaN }]) assert.throws(() => createInertia2D(options), RangeError);
});

test('magnetic snap attracts, locks and releases using raw-distance hysteresis', () => {
  const target = { x: 0, y: 0 }, options = { radius: 1, releaseRadius: 1.4, strength: .5, snapRadius: .1 };
  let result = magneticSnap({ x: 2, y: 0 }, target, options);
  assert.equal(result.state, SNAP_STATES.FREE); assert.equal(result.x, 2);
  result = magneticSnap({ x: .8, y: 0 }, target, options);
  assert.equal(result.state, SNAP_STATES.ATTRACTED); assert.ok(result.x < .8 && result.x > 0);
  for (const x of [.99, 1.01, .99, 1.1]) {
    result = magneticSnap({ x, y: 0 }, target, { ...options, state: result.state }); assert.equal(result.state, SNAP_STATES.ATTRACTED);
  }
  result = magneticSnap({ x: .05, y: 0 }, target, { ...options, state: result.state });
  assert.deepEqual(result, { x: 0, y: 0, state: SNAP_STATES.SNAPPED });
  result = magneticSnap({ x: 1.3, y: 0 }, target, { ...options, state: result.state }); assert.equal(result.state, SNAP_STATES.SNAPPED);
  result = magneticSnap({ x: 1.41, y: 0 }, target, { ...options, state: result.state }); assert.equal(result.state, SNAP_STATES.FREE);
  assert.equal(magneticSnap({ x: .05, y: 0 }, target, { ...options, strength: 0 }).state, SNAP_STATES.FREE);
  assert.throws(() => magneticSnap(target, target, { radius: 1, releaseRadius: .9 }), RangeError);
  const out = {}; assert.equal(magneticSnap(target, target, options, out), out);
});

test('PALM PONG B reduces synthetic jitter, bounds visual lag and resets after loss', () => {
  const feel = new PaddleFeel({ variant: 'B' }), target = x => [{ x, y: 4.5, present: true, continuous: true }, null];
  feel.update(target(4), 1 / 60);
  let movement = 0, rawMovement = 0, previous = 4, previousRaw = 4;
  for (let i = 0; i < 120; i++) {
    const x = 4 + (i % 2 ? .03 : -.03), output = feel.update(target(x), 1 / 60)[0];
    movement += Math.abs(output.x - previous); rawMovement += Math.abs(x - previousRaw); previous = output.x; previousRaw = x;
  }
  assert.ok(movement < rawMovement * .75);
  const input = target(10), saved = structuredClone(input), output = feel.update(input, 1 / 60)[0];
  assert.ok(Math.abs(output.x - 10) <= FEEL_PRESETS.sport.maxOffset + 1e-12); assert.deepEqual(input, saved);
  const held = output.x; feel.update(target(12), 0); assert.equal(output.x, held);
  feel.update([null, null], 1); assert.equal(output.present, false);
  assert.equal(feel.update(target(2), 1 / 60)[0].x, 2);
  feel.reset(); assert.deepEqual(feel.points, [null, null]);
  const a = new PaddleFeel(); assert.equal(a.update(target(4), 1 / 60)[0].x, 4); assert.equal(a.update(target(8), 1 / 60)[0].x, 8);
});

test('PALM PONG collision and velocity truth are identical for A and B', () => {
  function simulation(variant) {
    const game = new PalmPongGame(), feel = new PaddleFeel({ variant });
    for (let i = 0; i < 1200; i++) {
      const points = [0, 1].map(side => ({ x: side ? 11.52 : 4.48, y: 4.5 + Math.sin(i * .03 + side) * .2, present: true, continuous: true }));
      game.setPaddles(points); game.step(STEP); if (game.ready && game.phase === 'calibration') game.start();
      feel.update(points, STEP);
    }
    return { ball: game.ball, paddles: game.paddles, elapsed: game.elapsed, total: game.total, history: game.history, result: game.result };
  }
  assert.deepEqual(simulation('B'), simulation('A'));
});

test('RAW/STABLE debug observations preserve tracker rejection and stale/reset policies', () => {
  const tracker = new PalmTracker(), landmarks = x => Array.from({ length: 21 }, () => ({ x, y: .5 }));
  tracker.update({ landmarks: [landmarks(.72), landmarks(.28)] }, 100);
  tracker.update({ landmarks: [landmarks(.70), landmarks(.30)] }, 150);
  const debug = tracker.debugSample(150);
  assert.ok(debug.raw.every(p => p.present)); assert.ok(debug.stable.every(p => p.present));
  assert.notEqual(debug.raw[0].x, debug.stable[0].x);
  assert.deepEqual(tracker.debugSample(251).raw, [null, null]); assert.ok(tracker.debugSample(251).stable.every(p => !p.present));
  tracker.reset(); assert.deepEqual(tracker.debugSample(300).raw, [null, null]);
});
