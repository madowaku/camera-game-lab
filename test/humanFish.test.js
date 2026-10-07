import test from 'node:test';
import assert from 'node:assert/strict';
import { HumanFishGame, DURATION, titleFor } from '../src/humanFish/core.js';
import { FishSignal } from '../src/humanFish/signals.js';
import { experiments } from '../src/platform/experiments.js';
import { planFishClip } from '../src/humanFish/creator.js';
import { MusicBed } from '../src/platform/music.js';

const advance = (game, seconds, input = {}) => { for (let t = 0; t < seconds - 1e-8 && game.phase === 'playing'; t += 1 / 60) game.step(Math.min(1 / 60, seconds - t), input); };
const start = () => { const g = new HumanFishGame({ random: () => .5 }); g.start(); return g; };
const packet = (at, state = 'CLOSED', faceX = .5, faceY = .5) => ({ at, state, faceX, faceY, face: { left: .3, right: .7, top: .2, bottom: .8 } });

test('human fish is a 45-second lazy Phaser route with camera-free practice', () => {
  const game = experiments.find(g => g.id === 'solo-human-fish'); assert.equal(game.duration, 45); assert.equal(game.renderer, 'phaser'); assert.ok(game.demo); assert.ok(game.aliases.includes('#human-fish'));
});
test('arriving at the surface does not breathe; a fresh bite fills oxygen', () => {
  const g = start(); g.oxygen = 21; advance(g, .7, { target: { x: .5, y: .155 } });
  assert.ok(g.atSurface); assert.ok(g.oxygen < 21); assert.equal(g.breaths, 0);
  g.bite(); assert.equal(g.oxygen, 100); assert.equal(g.breaths, 1); assert.equal(g.foods, 0);
});
test('breathing takes priority over nearby food, and repeated gasps cannot farm reports', () => {
  const g = start(); g.player.y = .16; g.oxygen = 4; g.spawn('flake', .5, .16);
  g.bite(); g.bite(); assert.equal(g.closeBreaths, 1); assert.equal(g.breaths, 1); assert.equal(g.foods, 0);
});
test('an underwater bite only eats one nearby item; empty bites do not score', () => {
  const g = start(); g.items = []; g.spawn('shrimp', .5, .43); g.spawn('pearl', .55, .45);
  g.bite(); assert.equal(g.score, 3); assert.equal(g.foods, 1); assert.equal(g.shrimp, 1); assert.equal(g.items.length, 1);
  g.player = { x: .2, y: .6 }; g.bite(); assert.equal(g.score, 3);
});
test('giant pearl is a real temptation: twenty points, extra oxygen cost, bonus shrimp', () => {
  const g = start(); g.items = []; g.player = { x: .7, y: .86 }; g.oxygen = 35; g.spawn('giant', .7, .86);
  g.bite(); assert.equal(g.score, 20); assert.equal(g.oxygen, 27); assert.equal(g.treasures, 1);
  assert.ok(g.items.some(i => i.kind === 'shrimp' && i.bonus));
});
test('no treasure appears before twenty seconds; timeline unlocks pearl and giant', () => {
  const g = start(); g.player.y = .16;
  for (let i = 0; i < 24 * 60; i++) { if (g.oxygen < 80) g.bite(); g.step(1 / 60); if (g.elapsed < 19.99) assert.ok(g.items.every(i => !['pearl', 'giant'].includes(i.kind))); }
  assert.ok(g.items.some(i => i.kind === 'pearl')); assert.ok(g.items.some(i => i.kind === 'giant'));
});
test('cat warns for one second; hits once, pushes down and deducts oxygen', () => {
  const g = start(); g.elapsed = 38; g.player.y = .16; g.oxygen = 100; g.updateCat();
  assert.equal(g.catHits, 0); g.elapsed = 38.9; g.updateCat(); assert.equal(g.catHits, 0);
  g.elapsed = 39; g.updateCat(); assert.equal(g.catHits, 1); assert.equal(g.oxygen, 88); assert.equal(g.player.y, .42);
  g.player.y = .16; g.updateCat(); assert.equal(g.catHits, 1);
});
test('a lateral dodge escapes the cat warning zone', () => {
  const g = start(); g.elapsed = 38; g.player = { x: .5, y: .16 }; g.updateCat();
  g.player.x = .8; g.elapsed = 39.1; g.updateCat(); assert.equal(g.catHits, 0);
});

test('the final five seconds contain three warned cat strikes before the life ends', () => {
  const g = start(); g.player.y = .16;
  for (let i = 0; i < 46 * 60 && g.phase === 'playing'; i++) {
    if (g.oxygen < 75) g.bite();
    g.step(1 / 60, { target: { x: .5, y: .16 } });
  }
  const warnings = g.events.filter(e => e.type === 'CAT_WARNING');
  const strikes = g.events.filter(e => e.type === 'CAT_HIT');
  assert.equal(warnings.length, 3); assert.equal(strikes.length, 3);
  assert.ok(strikes.every((e, i) => e.at - warnings[i].at >= 1 && e.at < DURATION));
});
test('oxygen zero floats away with exact lifetime rather than finishing the whole frame', () => {
  const one = start(), two = start(); one.oxygen = two.oxygen = 1;
  advance(one, 1); for (let i = 0; i < 5 && two.phase === 'playing'; i++) two.step(.25);
  assert.equal(one.phase, 'over'); assert.equal(one.oxygen, 0); assert.equal(one.result.survived, false);
  assert.ok(Math.abs(one.elapsed - two.elapsed) < 1e-9); assert.ok(one.elapsed < .2);
});
test('a managed life ends at exactly 45 seconds, with no reset from arrival alone', () => {
  const g = start(); g.player.y = .16;
  for (let i = 0; i < 46 * 60 && g.phase === 'playing'; i++) { if (g.oxygen < 75) g.bite(); g.step(1 / 60); }
  assert.equal(g.elapsed, DURATION); assert.equal(g.phase, 'clear'); assert.equal(g.result.survival, 45); assert.ok(g.result.breaths >= 4);
});
test('pause freezes every rule; reset clears warnings and previous-round records', () => {
  const g = start(); g.paused = true; advance(g, 2, { target: { x: .8, y: .9 }, bite: true }); assert.equal(g.elapsed, 0); assert.equal(g.oxygen, 100);
  g.low = true; g.catHits = 3; g.reset(); assert.equal(g.paused, false); assert.equal(g.low, false); assert.equal(g.catHits, 0);
});
test('invalid movement cannot poison state and deep diving spends oxygen faster', () => {
  const shallow = start(), deep = start(); shallow.player.y = .16; deep.player.y = .9;
  advance(shallow, 2); advance(deep, 2, { target: { x: NaN, y: Infinity } });
  assert.ok(deep.oxygen < shallow.oxygen); assert.ok(Number.isFinite(deep.player.x)); assert.equal(Math.round(deep.maxDepth), 100);
});
test('mouth needs a closed-to-open transition; tracking recovery cannot invent a bite', () => {
  const s = new FishSignal(); assert.equal(s.sample(packet(0, 'OPEN'), 0).bite, false);
  s.sample(packet(60), 60); assert.equal(s.sample(packet(120, 'OPEN'), 120).bite, true);
  assert.equal(s.sample(packet(180, 'OPEN'), 180).bite, false);
  s.lost(); assert.equal(s.sample(packet(240, 'OPEN'), 240).bite, false);
  s.sample(packet(300), 300); assert.equal(s.sample(packet(360, 'OPEN'), 360).bite, true);
});
test('neutral calibration mirrors horizontal input and fits full depth within small head movement', () => {
  const s = new FishSignal(); for (let t = 0; t <= 750; t += 50) s.sample(packet(t), t);
  assert.ok(s.neutral); const upper = s.sample(packet(800, 'CLOSED', .65, .4), 800), lower = s.sample(packet(850, 'CLOSED', .35, .65), 850);
  assert.equal(upper.target.x, .13); assert.equal(upper.target.y, .155); assert.equal(lower.target.x, .87); assert.equal(lower.target.y, .9);
  assert.equal(s.sample(packet(900), 1300).tracked, false);
});
test('style titles reward actual behavior, not only score', () => {
  const r = { catHits: 2, treasures: 0, shrimp: 0, closeBreaths: 0, maxDepth: 30, surfaceTime: 0, survival: 45 };
  assert.equal(titleFor(r)[0], '猫の友達'); r.catHits = 0; r.treasures = 3; assert.equal(titleFor(r)[0], '欲張り人面魚');
});
test('director selects the real gasp over a later cat failure and fits seven seconds', () => {
  const frames = Array.from({ length: 90 }, (_, i) => ({ at: i * 500 }));
  const plan = planFishClip(frames, [{ type: 'HERO', timestamp: 39000 }, { type: 'FAIL', timestamp: 40500 }]);
  assert.equal(plan.heroTimestamp, 39000); assert.equal(plan.duration, 7000); assert.ok(plan.segments.some(s => s.kind === 'REACTION' && s.to >= 40500));
});

test('a late gasp or short life still exports seven seconds using the real report', () => {
  const frames = Array.from({ length: 8 }, (_, i) => ({ at: 43000 + i * 250 }));
  const plan = planFishClip(frames, [{ type: 'HERO', timestamp: 44500 }]);
  assert.equal(plan.duration, 7000);
  assert.ok(plan.segments.filter(s => s.kind !== 'END_CARD').every(s => s.from >= 43000 && s.to <= 44750));
  const card = plan.segments.at(-1); assert.equal(card.start + card.duration, 7000); assert.ok(card.duration > 1000);
  assert.equal(planFishClip([], []), null);
});

test('critical oxygen muffles the music, breathing restores it and exit disconnects it', async () => {
  const filters = [], nodes = [];
  const context = { state: 'running', currentTime: 0, destination: {}, resume: async () => {},
    close: async () => { context.state = 'closed'; }, decodeAudioData: async () => ({ duration: 48 }),
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
    createBufferSource: () => { const node = { connect() {}, disconnect() {}, start() { this.active = true; }, stop() { this.active = false; } }; nodes.push(node); return node; },
    createBiquadFilter: () => { const filter = { frequency: { value: 20000, setTargetAtTime(value) { this.value = value; } }, connect() {}, disconnect() { this.disconnected = true; } }; filters.push(filter); return filter; },
  };
  const bed = new MusicBed({ contextFactory: () => context, fetchBytes: async () => new ArrayBuffer(1) });
  bed.arm({ id: 'humanFish', volume: .22, load: async () => ({ default: 'qa-music' }) });
  bed.update({ phase: 'playing', musicFilterHz: 600 }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(filters[0].frequency.value, 600); assert.equal(nodes[0].active, true);
  bed.update({ phase: 'playing', musicFilterHz: 18000 }); assert.equal(filters[0].frequency.value, 18000);
  bed.update({ phase: 'result' }); assert.equal(nodes[0].active, false); assert.equal(filters[0].disconnected, true);
  bed.stop(); assert.equal(context.state, 'closed');
});
