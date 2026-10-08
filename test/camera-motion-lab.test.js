import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_LAB_PRESETS, motionLabPreset, motionLabVariant } from '../src/platform/cameraMotionLab.js';
import { experiments } from '../src/platform/experiments.js';
import { motionProfiles, motionSampleOf, motionCue } from '../src/platform/motionProfiles.js';

const maru = experiments.find(game => game.id === 'solo-maru-magic');
const sample = game => motionSampleOf({ game }, maru, { phase: 'playing' });

test('experimental B is explicit and restricted to three actual games', () => {
  assert.deepEqual(Object.keys(MOTION_LAB_PRESETS).sort(), ['solo-hand-spell','solo-maru-magic','solo-toy-drum']);
  for (const id of Object.keys(MOTION_LAB_PRESETS)) {
    assert.ok(experiments.find(game => game.id === id));
    assert.equal(motionLabVariant(id), 'A');
    assert.equal(motionLabVariant(id, '?motionLab=A'), 'A');
    assert.equal(motionLabVariant(id, '?motionLab=B'), 'B');
    assert.equal(motionLabVariant(id, '?debug=1&motionLab=B'), 'B');
    assert.ok(motionLabPreset(id));
  }
  assert.equal(motionLabVariant('solo-palm-pong', '?motionLab=B'), 'A');
  assert.equal(motionLabVariant('solo-maru-magic', '?motionLab=b'), 'A');
  assert.equal(motionLabVariant('solo-maru-magic', '?motionLab=C'), 'A');
});

test('MARU only fires a motion cue on a genuine completed summon', () => {
  const p = motionProfiles[maru.id];
  const ready = sample({ phase: 'ready', points: [{x:110,y:200}] });
  const drawing = sample({ phase: 'drawing', points: [{x:110,y:200},{x:120,y:220}] });
  const result = sample({ phase: 'summoned', result: { circle: { x: 300, y: 200 }, score: 86 } });
  assert.equal(ready.success, 0);
  assert.equal(drawing.success, 0);
  assert.equal(result.success, 1);
  assert.deepEqual(result.point, {x:.5,y:1/3});
  assert.equal(motionCue(ready, drawing, p), null);
  assert.deepEqual(motionCue(drawing, result, p), {kind:'hit',label:'SUMMON!'});
  assert.equal(motionCue(result, result, p), null);
  assert.equal(motionCue(result, ready, p), null);
  assert.deepEqual(motionCue(ready, result, p), {kind:'hit',label:'SUMMON!'});
  assert.deepEqual(sample({ phase:'summoned', result:{score:65, circle:{x:1200,y:900}} }).point, {x:.5,y:.62});
});
