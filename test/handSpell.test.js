import test from 'node:test';
import assert from 'node:assert/strict';
import { HandSpellGame, SPELLS, judgeSpell, ROUND_MS, ALL_SPELLS } from '../src/handSpell/core.js';
import { classifyHand, SignGate, ReleaseGate } from '../src/handSpell/tracking.js';
import { spellHands } from '../src/input/handSpellInput.js';
import { discover, readBook } from '../src/handSpell/book.js';
import { replayFrame } from '../src/handSpell/replay.js';
import { experiments } from '../src/platform/experiments.js';
import { resolveRoute } from '../src/platform/navigation.js';
import { trackForGame, musicCreditMarkup } from '../src/platform/music.js';

const advance = (g, ms) => { while (ms > 0) { const dt = Math.min(20, ms); g.step(dt); ms -= dt; } };
function hand(mask = '1000', thumb = true) {
  const p = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 })); p[0] = { x: .5, y: .85, z: 0 };
  [5, 9, 13, 17].forEach((n, i) => { const x = .36 + i * .09; p[n] = { x, y: .67, z: 0 }; p[n + 1] = { x, y: .51, z: 0 }; p[n + 2] = { x, y: .38, z: 0 }; p[n + 3] = { x, y: mask[i] === '1' ? .25 : .73, z: 0 }; });
  p[1] = { x: .43, y: .75, z: 0 }; p[2] = { x: .34, y: .65, z: 0 }; p[3] = { x: .24, y: .57, z: 0 }; p[4] = { x: thumb ? .15 : .45, y: thumb ? .47 : .72, z: 0 }; return p;
}
test('all three spells are target-specific; all seven misfires have stable priority', () => {
  for (const s of SPELLS) assert.equal(judgeSpell(s.signs, s.signs), s.id);
  const e = SPELLS[0].signs;
  assert.equal(judgeSpell(e, ['ONE', 'TWO', 'FIST']), 'TINY_FIRE');
  assert.equal(judgeSpell(e, ['THREE', 'TWO', 'ONE']), 'SELF_BLAST');
  assert.equal(judgeSpell(e, ['ONE', 'ONE', 'ONE']), 'CHICK_SWARM');
  assert.equal(judgeSpell(e, ['ONE', 'TWO']), 'POTATO');
  assert.equal(judgeSpell(e, [...e, 'FIST']), 'GIANT_HAND');
  assert.equal(judgeSpell(e, SPELLS[1].signs), 'FISH_STORM');
  assert.equal(judgeSpell(e, e, false), 'SAD_SMOKE');
  assert.equal(new Set(ALL_SPELLS.map(s => s.id)).size, 10);
});
test('15 seconds include memory, input, release, shared anticipation, reveal and reaction', () => {
  for (let i = 0; i < 3; i++) {
    const g = new HandSpellGame({ spell: i }); advance(g, 2000); assert.equal(g.scene, 'memorize');
    assert.equal(g.input('FIST'), false); advance(g, 2000); assert.equal(g.scene, 'input');
    SPELLS[i].signs.forEach(s => assert.equal(g.input(s), true)); assert.equal(g.release('tap'), true);
    assert.equal(g.input('PALM'), false); advance(g, 5000); assert.equal(g.scene, 'charge');
    advance(g, 850); assert.equal(g.scene, 'cast'); assert.equal(g.outcome, SPELLS[i].id);
    advance(g, 2150); assert.equal(g.scene, 'reaction'); advance(g, 3000);
    assert.equal(g.phase, 'result'); assert.equal(g.result.elapsed, ROUND_MS); assert.equal(g.result.perfect, true);
    assert.equal(g.log.filter(e => e.type === 'cast').length, 1);
  }
});
test('missing, repeated and extra signs are deliberate inputs; no release is always SAD SMOKE', () => {
  for (const [signs, released, outcome] of [[['ONE', 'TWO'], true, 'POTATO'], [['FIST', 'FIST', 'FIST'], true, 'CHICK_SWARM'], [['ONE', 'TWO', 'THREE', 'PALM'], true, 'GIANT_HAND'], [SPELLS[0].signs, false, 'SAD_SMOKE']]) {
    const g = new HandSpellGame(); advance(g, 4000); signs.forEach(s => g.input(s)); if (released) g.release(); advance(g, 11000); assert.equal(g.result.spell, outcome); assert.equal(g.result.perfect, false);
  }
});
test('tutorial teaches one, two, three signs and a real release without consuming round time', () => {
  const g = new HandSpellGame({ tutorial: true }); assert.equal(g.input('ONE'), false); assert.equal(g.input('TWO'), true);
  advance(g, 800); assert.equal(g.tutorialStep, 1); g.input('ONE'); g.input('TWO'); advance(g, 800);
  SPELLS[0].signs.forEach(s => g.input(s)); assert.equal(g.scene, 'tutorial-release'); g.release(); advance(g, 850); assert.equal(g.scene, 'tutorial-cast'); advance(g, 2400);
  assert.equal(g.phase, 'playing'); assert.equal(g.elapsed, 0); assert.deepEqual(g.signs, []); assert.equal(g.outcome, null);
});
test('pause freezes the tutorial and round; invalid signs and premature release cannot cast', () => {
  const g = new HandSpellGame(); assert.equal(g.release(), false); advance(g, 4000); assert.equal(g.input('INVALID'), false);
  g.pause('tracking'); advance(g, 2000); assert.equal(g.elapsed, 4000); assert.equal(g.input('ONE'), false); g.resume(); g.input('ONE'); assert.equal(g.signs.length, 1);
  const fresh = new HandSpellGame(); assert.deepEqual(fresh.signs, []); assert.equal(fresh.elapsed, 0);
});
test('joint geometry classifies five signs in mirrored, rotated and world coordinates, including both THREEs', () => {
  for (const [mask, sign] of [['0000', 'FIST'], ['1111', 'PALM'], ['1000', 'ONE'], ['1100', 'TWO'], ['1110', 'THREE'], ['1001', 'THREE']]) {
    const p = hand(mask); assert.equal(classifyHand(p).sign, sign, mask);
    assert.equal(classifyHand(p.map(p => ({ ...p, x: 1 - p.x }))).sign, sign);
    assert.equal(classifyHand(p.map(p => ({ ...p, x: p.y, y: 1 - p.x }))).sign, sign);
    assert.equal(classifyHand(p, p).sign, sign);
  }
  assert.equal(classifyHand(hand('1001', false)).sign, null);
  assert.equal(classifyHand(hand().slice(1)).sign, null);
  const bad = hand(); bad[8].x = NaN; assert.equal(classifyHand(bad).sign, null);
  assert.equal(classifyHand(hand('0010')).sign, null);
});
test('stable held signs fire once; repeats need neutral, cooldown and fresh observations', () => {
  const gate = new SignGate(), feed = (sign, at) => gate.feed({ sign, id: 'Left', confidence: .9, at }, at);
  assert.equal(feed('ONE', 0), null); assert.equal(feed('ONE', 179), null); assert.equal(feed('ONE', 180), 'ONE');
  assert.equal(feed('ONE', 700), null); assert.equal(feed(null, 710), null); feed(null, 850);
  assert.equal(feed('ONE', 860), null); assert.equal(feed('ONE', 1040), 'ONE');
  assert.equal(feed('TWO', 1100), null); assert.equal(feed('TWO', 1441), null); assert.equal(feed('TWO', 1621), 'TWO');
  assert.equal(gate.feed({ sign: 'THREE', confidence: .9, id: 'Left', at: 1621 }, 2000), null);
  assert.equal(gate.feed({ sign: 'THREE', confidence: .9, id: 'Left', at: 2000 }, 2000), null);
  assert.equal(gate.feed({ sign: 'THREE', confidence: .9, id: 'Right', at: 2180 }, 2180), null);
});
test('two open palms need forward expansion on both hands and cannot repeat or release from stale samples', () => {
  const gate = new ReleaseGate(), palms = (at, a = .1, b = .1) => [{ id: 'Left', sign: 'PALM', span: a, at }, { id: 'Right', sign: 'PALM', span: b, at }];
  assert.equal(gate.feed(palms(0), 0, true), false); assert.equal(gate.feed(palms(120), 120, true), false);
  assert.equal(gate.feed(palms(240, .12, .1), 240, true), false);
  assert.equal(gate.feed(palms(300, .12, .12), 300, true), false); assert.equal(gate.feed(palms(400, .12, .12), 400, true), true);
  assert.equal(gate.feed(palms(600, .15, .15), 600, true), false); gate.reset(); assert.equal(gate.feed(palms(0), 600, true), false);
  assert.equal(gate.feed(palms(800).slice(0, 1), 800, true), false);
});
test('camera extraction keeps one hand shape, timestamp and crop-aligned position per observation', () => {
  const result = { landmarks: [hand('1100')], handedness: [[{ categoryName: 'Left' }]] };
  const a = spellHands(result, 123, 540, 960)[0]; assert.equal(a.sign, 'TWO'); assert.equal(a.at, 123); assert.equal(a.id, 'Left'); assert.ok(a.x > 0 && a.x < 540);
  assert.deepEqual(spellHands({ landmarks: [null] }, 1, 540, 960), []);
});
test('spell book survives damaged data and denied writes; repeat discoveries are not new', () => {
  let data = '{'; const storage = { getItem: () => data, setItem: (_, next) => data = next };
  assert.deepEqual(readBook(storage), []); assert.equal(discover('POTATO', storage).isNew, true); assert.equal(discover('POTATO', storage).isNew, false);
  data = '["POTATO","POTATO","evil"]'; assert.deepEqual(readBook(storage), ['POTATO']);
  const denied = { getItem() { throw Error(); }, setItem() { throw Error(); } }; assert.deepEqual(discover('SAD_SMOKE', denied).book, ['SAD_SMOKE']);
});
test('seven-second replay includes cue, actual input, release, cast and reaction in order', () => {
  const frames = Array.from({ length: 151 }, (_, i) => ({ time: i * 100 }));
  const replay = { frames, windows: [[2000, 4000, 2000], [4000, 8000, 2000], [8000, 9850, 1000], [9850, 15000, 2000]] };
  assert.equal(replayFrame(replay, 0).time, 2000); assert.equal(replayFrame(replay, 2000).time, 4000); assert.equal(replayFrame(replay, 4000).time, 8000); assert.equal(replayFrame(replay, 5000).time, 9800); assert.equal(replayFrame(replay, 7000).time, 15000);
});
test('canonical and legacy routes use licensed lazy music and never require microphone', () => {
  const g = experiments.find(g => g.id === 'solo-hand-spell'); assert.equal(g.duration, 15); assert.equal(g.requiresMicrophone, false); assert.equal(g.visual, 'hybrid');
  assert.equal(resolveRoute('#hand-spell', experiments).experiment.id, g.id); assert.equal(trackForGame(g).id, 'handSpell'); assert.match(musicCreditMarkup(g, 'ja'), /23061/);
});
