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


test('opt-in director adds one visual only after MARU result, then cleans up', async () => {
  const { MotionDirector } = await import('../src/platform/motionDirector.js');
  const original = { document: globalThis.document, matchMedia: globalThis.matchMedia, location: globalThis.location };
  const node = () => ({
    dataset: {}, children: [], isConnected: true, textContent: '',
    style: { setProperty() {} }, setAttribute() {}, addEventListener() {},
    append(child) { this.children.push(child); child.parent = this; child.isConnected = true; },
    get firstElementChild() { return this.children[0] ?? null; },
    replaceChildren() { this.children = []; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.isConnected = false; },
  });
  try {
    const stage = node(), host = node();
    host.querySelector = () => stage;
    host.querySelectorAll = () => [];
    globalThis.document = {
      hidden: false, createElement: () => node(),
      addEventListener() {}, removeEventListener() {},
    };
    globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    globalThis.location = { search: '?motionLab=B' };
    const director = new MotionDirector(host);
    director.begin(maru);
    assert.equal(host.dataset.motionLab, 'B');
    director.update({ game: { phase: 'ready' } }, maru, { phase: 'playing' });
    assert.equal(director.layer.children.length, 0, 'do not play success animation on game start');
    director.update({ game: { phase: 'drawing' } }, maru, { phase: 'playing' });
    assert.equal(director.layer.children.length, 0, 'no early recognition animation');
    director.update({ game: { phase: 'summoned', result: { score: 86, circle: {x:300,y:300} } } }, maru, { phase: 'playing' });
    assert.equal(director.layer.children.length, 1, 'one successful summon creates one burst');
    assert.match(director.layer.children[0].className, /motion-burst--lab/);
    assert.equal(director.layer.children[0].children[0].textContent, '✦');
    director.update({ game: { phase: 'summoned', result: { score: 86 } } }, maru, { phase: 'playing' });
    assert.equal(director.layer.children.length, 1, 'repeat render does not duplicate result');
    director.update({ game: { phase: 'ready' } }, maru, { phase: 'playing' });
    director.lastBurst = -Infinity;
    director.update({ game: { phase: 'summoned', result: { score: 91 } } }, maru, { phase: 'playing' });
    assert.equal(director.layer.children.length, 2, 'new round can trigger another burst');
    director.stop();
    assert.equal(host.dataset.motionLab, undefined, 'teardown removes A/B state');
    assert.equal(stage.children.length, 0, 'teardown removes the overlay');

    globalThis.location.search = '?motionLab=A';
    const legacy = new MotionDirector(host);
    legacy.begin(maru);
    assert.equal(legacy.game, null, 'MARU A remains native only');
    assert.equal(host.dataset.motionLab, undefined);
    legacy.destroy();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
