import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizedToNdc, normalizePixels, syntheticPlaneZ } from '../src/visual3d/projection.js';
import { QUALITY_PROFILES, initialQuality, degradeQuality, PerformanceGovernor } from '../src/visual3d/performancePolicy.js';
import { disposeObject3D } from '../src/visual3d/disposeScene.js';

test('camera coordinates convert to canonical NDC with one optional mirror', () => {
  assert.deepEqual(normalizedToNdc({ x: 0, y: 0 }), { x: -1, y: 1 });
  assert.deepEqual(normalizedToNdc({ x: .25, y: .75 }, { mirror: true }), { x: .5, y: -.5 });
  assert.deepEqual(normalizePixels({ x: 270, y: 480 }, 540, 960), { x: .5, y: .5 });
  assert.equal(normalizePixels({ x: NaN, y: 1 }, 10, 10), null);
  assert.equal(syntheticPlaneZ(.5, 4), -2);
});

test('quality policy favors tracking and only degrades twice', () => {
  assert.equal(initialQuality({ hardwareConcurrency: 2 }).id, 'low');
  assert.equal(initialQuality({ hardwareConcurrency: 8, devicePixelRatio: 2 }).id, 'high');
  assert.equal(initialQuality({ hardwareConcurrency: 8, reducedMotion: true }).id, 'low');
  assert.equal(degradeQuality(QUALITY_PROFILES.high).id, 'standard');
  const governor = new PerformanceGovernor('high', { sampleWindow: 3, slowMs: 20 });
  assert.equal(governor.sample(30), null); assert.equal(governor.sample(30), null); assert.equal(governor.sample(30).id, 'standard');
  governor.sample(40); governor.sample(40); assert.equal(governor.sample(40).id, 'low');
  governor.sample(50); governor.sample(50); assert.equal(governor.sample(50), null);
});

test('dispose traversal releases geometry, material and textures once', () => {
  let geometry = 0, material = 0, texture = 0;
  const tex = { isTexture: true, dispose: () => texture++ };
  const mat = { map: tex, dispose: () => material++ };
  const geo = { dispose: () => geometry++ };
  const root = { traverse(fn) { fn({ geometry: geo, material: mat }); fn({ geometry: geo, material: mat }); } };
  disposeObject3D(root);
  assert.deepEqual({ geometry, material, texture }, { geometry: 1, material: 1, texture: 1 });
});
