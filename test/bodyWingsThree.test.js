import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BodyWingsGame, RING_LINE } from '../src/games/bodyWings.js';
import { BodyWingsThreeScene } from '../src/wings/threeScene.js';
import { projectFlightRing } from '../src/wings/visualLayout.js';
import { QUALITY_PROFILES } from '../src/visual3d/performancePolicy.js';

function fixture(aspect = 9 / 16) {
  const camera = new THREE.PerspectiveCamera(45, aspect, .01, 100);
  camera.position.z = 5; camera.updateMatrixWorld();
  const listeners = new Set();
  const visual = {
    scene: new THREE.Scene(), camera, quality: QUALITY_PROFILES.high, reducedMotion: false,
    onQualityChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    normalizedToWorld({ x, y }, depth = 0) {
      const z = -depth * 4, halfHeight = (5 - z) * Math.tan(Math.PI / 8);
      return new THREE.Vector3((x * 2 - 1) * halfHeight * camera.aspect, (1 - y * 2) * halfHeight, z);
    },
    render() { return true; },
  };
  return { visual, scene: new BodyWingsThreeScene(visual), listeners };
}

test('3D rings agree with canonical 2D centers at approach and grading, across aspect ratios', () => {
  for (const aspect of [9 / 16, 1, 16 / 9]) {
    const { visual, scene } = fixture(aspect);
    for (const progress of [0, .4, .9, 1]) {
      const ring = { id: -1, x: .4, progress };
      const game = { time: progress * 1000, phase: 'tutorial', ringsAhead: [ring], x: .4, tilt: 0 };
      scene.update({ game });
      const p = scene.rings[0].position.clone().project(visual.camera), layout = projectFlightRing(ring);
      assert.ok(Math.abs((p.x + 1) / 2 - layout.x) < 1e-9);
      assert.ok(Math.abs((1 - p.y) / 2 - layout.y) < 1e-9);
      assert.ok(scene.rings[0].scale.x > 0);
      if (progress === 1) { assert.equal(layout.x, ring.x); assert.equal(layout.y, .69); assert.ok(Math.abs(scene.rings[0].position.z) < 1e-9); }
    }
    scene.dispose();
  }
});

test('a full flight is deterministic with or without visuals and uses actual game events', () => {
  const plain = new BodyWingsGame('demo'), hybrid = new BodyWingsGame('demo'), { scene } = fixture();
  let boosts = 0;
  for (let i = 0; i < 2300; i++) {
    const target = RING_LINE[plain.attempts]?.x ?? .5;
    const input = { spread: true, tilt: Math.max(-.3, Math.min(.3, (target - plain.x) * 2)) };
    plain.step(20, input); hybrid.step(20, input);
    for (const event of hybrid.events) { scene.handleEvent(event, hybrid); if (event.type === 'BOOST') boosts++; }
    scene.update({ game: hybrid });
    assert.deepEqual(hybrid, plain);
    assert.ok(scene.rings.filter(r => r.visible).length <= 3);
  }
  assert.equal(hybrid.result.seconds, 30); assert.ok(boosts > 0); scene.dispose();
});

test('BOOST trails stop on pause and clear on reduced motion; quality bounds particle draw counts', () => {
  const { visual, scene, listeners } = fixture(), game = new BodyWingsGame('demo');
  game.beginRush(); game.boostUntil = 2000;
  scene.update({ game }); game.step(20, { tilt: 0 }); scene.update({ game });
  assert.ok(scene.trails.every(t => t.count === 1));
  scene.handleEvent({ type: 'BOOST' }, game);
  game.setPaused(true); const before = scene.trails.map(t => [...t.positions]);
  scene.update({ game }); scene.update({ game });
  assert.deepEqual(scene.trails.map(t => [...t.positions]), before); assert.equal(scene.impact.life, 1);
  visual.reducedMotion = true; scene.update({ game });
  assert.ok(scene.trails.every(t => t.count === 0)); assert.equal(scene.impact.geometry.drawRange.count, 8);
  visual.reducedMotion = false; visual.quality = QUALITY_PROFILES.low; listeners.forEach(fn => fn(visual.quality));
  assert.equal(scene.impact.geometry.drawRange.count, 20);
  assert.equal(scene.clouds.filter(c => c.visible).length, 4);
  assert.ok(scene.trails.every(t => t.visiblePoints === 12)); scene.dispose();
});

test('reused geometry/materials are disposed once and scene subscriptions are released', () => {
  const { visual, scene, listeners } = fixture(), counts = new Map();
  scene.root.traverse(object => {
    for (const resource of [object.geometry, object.material].filter(Boolean)) {
      if (counts.has(resource)) continue;
      counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
  });
  scene.dispose(); scene.dispose();
  assert.equal(visual.scene.children.length, 0); assert.equal(listeners.size, 0);
  assert.ok(counts.size > 10); assert.ok([...counts.values()].every(n => n === 1));
});
