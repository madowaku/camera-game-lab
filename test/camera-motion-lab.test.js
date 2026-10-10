import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_LAB_PRESETS, motionLabPreset, motionLabVariant, motionLabPoint } from '../src/platform/cameraMotionLab.js';
import { NoteBlasterGame, laneY } from '../src/games/noteBlaster.js';
import { PalmPongGame, W, H, STEP } from '../src/palmPong/core.js';
import { TiltTurboGame, roadCenter } from '../src/tiltTurbo/core.js';
import { experiments } from '../src/platform/experiments.js';
import { motionProfiles, motionSampleOf, motionCue } from '../src/platform/motionProfiles.js';

const maru = experiments.find(game => game.id === 'solo-maru-magic');
const sample = game => motionSampleOf({ game }, maru, { phase: 'playing' });

test('experimental B is explicit and restricted to the seven supported games', () => {
  assert.deepEqual(Object.keys(MOTION_LAB_PRESETS).sort(), [
    'duo-palm-pong', 'solo-air-slash', 'solo-hand-spell', 'solo-maru-magic',
    'solo-tilt-turbo', 'solo-toy-drum', 'voice-note-blaster',
  ]);
  for (const id of Object.keys(MOTION_LAB_PRESETS)) {
    assert.ok(experiments.find(game => game.id === id));
    assert.equal(motionLabVariant(id), 'A');
    assert.equal(motionLabVariant(id, '?motionLab=A'), 'A');
    assert.equal(motionLabVariant(id, '?motionLab=B'), 'B');
    assert.equal(motionLabVariant(id, '?debug=1&motionLab=B'), 'B');
    assert.ok(motionLabPreset(id));
  }
  assert.equal(motionLabVariant('solo-palm-pong', '?motionLab=B'), 'A');
  assert.equal(motionLabVariant('solo-finger-gun-showdown', '?motionLab=B'), 'A');
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

const sampleGame = (id, game) => motionSampleOf({ game }, experiments.find(e => e.id === id), { phase: 'playing' });

test('NOTE BLASTER pulse waits for a collision, not a shot or a breach', () => {
  const id = 'voice-note-blaster', game = new NoteBlasterGame(); game.start();
  const before = sampleGame(id, game);
  game.step(100, { voiced: true, note: { lane: 0, grade: 'PERFECT' }, mouth: { x: .14, y: .86 } });
  assert.equal(game.shots, 1);
  assert.equal(motionCue(before, sampleGame(id, game), motionProfiles[id]), null);
  game.enemies.push({ id: ++game.serial, lane: 0, x: .38, y: laneY(0), age: 0 });
  for (let i = 0; i < 4 && !game.hits; i++) game.step(50);
  const hit = sampleGame(id, game);
  assert.equal(motionCue(before, hit, motionProfiles[id]).kind, 'hit');
  assert.deepEqual(motionLabPoint('pulse', { game }, before.point), { x: game.effects.at(-1).x, y: laneY(0) });
  game.enemies.push({ id: ++game.serial, lane: 1, x: .27, y: laneY(1), age: 0 });
  game.step(16);
  assert.equal(game.hp, 2);
  assert.equal(motionCue(hit, sampleGame(id, game), motionProfiles[id]), null);
});

test('PALM PONG rebound follows a confirmed return in world coordinates', () => {
  const id = 'duo-palm-pong', game = new PalmPongGame(); game.reset('demo');
  const paddles = [0, 1].map(side => ({ x: (side ? .72 : .28) * W, y: H / 2, present: true }));
  game.setPaddles(paddles); game.setPaddles(paddles); game.step(.5); game.start(); game.step(3);
  const before = sampleGame(id, game);
  assert.equal(game.rally, 0);
  for (let i = 0; i < 120 && !game.rally; i++) game.step(STEP);
  const hit = sampleGame(id, game);
  assert.equal(motionCue(before, hit, motionProfiles[id]).kind, 'hit');
  assert.deepEqual(motionLabPoint('rebound', { game }, before.point), { x: game.lastHit.x / W, y: .5 });
  assert.equal(motionCue(hit, hit, motionProfiles[id]), null);
  for (const lastHit of [null, { x: NaN, y: 2 }, { x: 400, y: 200 }]) {
    assert.deepEqual(motionLabPoint('rebound', { game: { lastHit } }, before.point), before.point);
  }
});

test('TILT TURBO speed accent follows a near miss and ignores BONK', () => {
  const id = 'solo-tilt-turbo', game = new TiltTurboGame(); game.start();
  game.elapsed = 4190; game.x = roadCenter(4200); game.lastSkrrt = game.elapsed;
  const before = sampleGame(id, game);
  game.step(20, { steering: game.x / 1.12, tracked: true });
  const near = sampleGame(id, game);
  assert.equal(motionCue(before, near, motionProfiles[id]).kind, 'hit');
  game.bonk();
  assert.equal(motionCue(near, sampleGame(id, game), motionProfiles[id]), null);
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
