import test from 'node:test';
import assert from 'node:assert/strict';
import { HookGame, FISH } from '../src/hook/core.js';
import { HookSignal, extractPalm } from '../src/hook/signals.js';
const advance = (g, seconds, input = () => ({})) => { for (let t = 0; t < seconds; t += 1 / 120) g.step(1 / 120, input(g)); };
const bite = g => { assert.ok(g.cast()); while (g.phase !== 'bite' && !g.result) g.step(1 / 120); };
const catchFish = g => { bite(g); assert.ok(g.hook()); while (g.phase === 'fight') g.step(1 / 120, { pull: -g.direction * .55 }); advance(g, 2.6); };
test('HOOK: first cast is an aji; hook, observed counterpull, landing and scoring form a complete loop', () => {
  const g = new HookGame({ random: () => .5 }); bite(g); assert.equal(g.fish.id, 'AJI'); assert.ok(g.hook());
  while (g.phase === 'fight') g.step(1 / 120, { pull: -g.direction * .55 });
  assert.equal(g.phase, 'landing'); assert.equal(g.catches.length, 1); assert.equal(g.lastCatch.hookPoints, 300);
  assert.ok(g.lastCatch.tensionPoints >= 100); assert.ok(g.score > 500); advance(g, 2.6); assert.equal(g.phase, 'ready');
});
test('HOOK: fake nibbles cannot be hooked; real bite has a forgiving timeout and miss recasts', () => {
  const g = new HookGame({ random: () => .1 }); g.catches.push({ id: 'AJI' }); g.cast(); assert.equal(g.hook(), false);
  advance(g, .9); assert.ok(g.drainEvents().some(e => e.type === 'NIBBLE')); assert.equal(g.phase, 'wait');
  advance(g, 2.6); assert.equal(g.misses, 1); assert.equal(g.phase, 'ready'); assert.ok(g.cast());
});
test('HOOK: overpull breaks the line; inactivity becomes loose; both need sustained danger', () => {
  for (const [pull, reason] of [[1.2, 'break'], [0, 'loose']]) {
    const g = new HookGame({ random: () => .5 }); bite(g); g.hook(); advance(g, .5, () => ({ pull })); assert.equal(g.phase, 'fight');
    advance(g, 4, () => ({ pull })); assert.equal(g.reason, reason); assert.equal(g.catches.length, 0);
  }
});
test('HOOK: lost tracking and pause freeze all clocks, fish movement and tension', () => {
  const g = new HookGame(); bite(g); g.hook(); const before = JSON.stringify([g.elapsed, g.age, g.tension, g.fishX, g.behaviorAge]);
  advance(g, 10, () => ({ tracked: false, pull: 1.5 })); assert.equal(JSON.stringify([g.elapsed, g.age, g.tension, g.fishX, g.behaviorAge]), before);
  g.paused = true; advance(g, 10); assert.equal(JSON.stringify([g.elapsed, g.age, g.tension, g.fishX, g.behaviorAge]), before);
});
test('HOOK: three successive catches trigger fever, +5 seconds and rarity boost', () => {
  const g = new HookGame({ random: () => .05 }); for (let i = 0; i < 3; i++) catchFish(g);
  assert.equal(g.catches.length, 3); assert.equal(g.limit, 35); assert.equal(g.fevers, 1); assert.ok(g.fever);
  assert.equal(g.bestCombo, 3); assert.ok(g.drainEvents().some(e => e.type === 'FEVER'));
});
test('HOOK: human fish release is a catch-only achievement and survives in the result', () => {
  const g = new HookGame(); assert.equal(g.release(), false); g.fish = FISH[4]; g.phase = 'catch';
  assert.ok(g.release()); assert.equal(g.phase, 'ready'); advance(g, 30.1); assert.equal(g.result.releasedHuman, true);
});
test('HOOK: 30-second deadline produces an immutable summary and cannot add late catches', () => {
  const g = new HookGame(); advance(g, 30.5); assert.equal(g.phase, 'result'); assert.ok(Math.abs(g.result.elapsed - 30) < 1e-6);
  assert.equal(g.cast(), false); advance(g, 1); assert.equal(g.result.score, 0);
});
test('HOOK: warning lasts 450ms before dash and tired phase reverses direction', () => {
  const g = new HookGame(); bite(g); g.hook(); const direction = g.direction;
  advance(g, .4, () => ({ pull: -g.direction * .5 })); assert.equal(g.behavior, 'warning');
  advance(g, .08, () => ({ pull: -g.direction * .5 })); assert.equal(g.behavior, 'dash');
  advance(g, 1.6, () => ({ pull: -g.direction * .5 })); assert.equal(g.direction, -direction);
});
test('HOOK: palm motions cast and hook; reappearance, slot swap and jitter cannot invent gestures', () => {
  const s = new HookSignal(), hand = (x, y, slot = 0) => [{ x, y, slot, present: true }];
  s.sample(hand(.5, .6), 0, 'ready'); s.sample(hand(.51, .61), 80, 'ready'); assert.equal(s.consume(), null);
  s.sample(hand(.66, .6), 180, 'ready'); assert.equal(s.consume(), 'cast');
  s.clearMotion(); s.sample(hand(.6, .6), 200, 'bite'); s.sample(hand(.6, .5), 320, 'bite'); assert.equal(s.consume(), 'hook');
  s.sample([], 400, 'bite'); s.sample(hand(.6, .2), 480, 'bite'); assert.equal(s.consume(), null);
  s.sample(hand(.8, .1, 1), 550, 'bite'); assert.equal(s.consume(), null);
  s.sample(hand(.8, .7, 1), 950, 'ready'); assert.equal(s.consume(), null);
});
test('HOOK: a big one-hand cast preserves controller identity across the screen', () => {
  const s=new HookSignal(), raw=x=>({landmarks:[Array.from({length:21},()=>({x:1-x,y:.6}))]});
  s.sample(extractPalm(raw(.5)),0,'ready');s.sample(extractPalm(raw(.68)),100,'ready');
  assert.equal(s.consume(),'cast');assert.equal(s.slot,0);
  assert.deepEqual(extractPalm({landmarks:[]}),[]);assert.deepEqual(extractPalm({landmarks:[[{}]]}),[]);
});
