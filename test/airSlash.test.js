import test from 'node:test';
import assert from 'node:assert/strict';
import { AirSlashGame, BladeTracker, segmentDistance, intersection, ROUND_MS } from '../src/airSlash/core.js';
import { handCenters, faceCenter } from '../src/input/airSlashInput.js';
import { selectAirSlashReplay } from '../src/airSlash/creatorProfile.js';
import { experiments, validateRegistry } from '../src/platform/experiments.js';
import { trackForGame, musicAudible } from '../src/platform/music.js';
const point = (x, y = 600, at = 0, id = 'right') => ({ x, y, at, id });
const game = source => { const g = new AirSlashGame({ source }); g.phase = 'playing'; g.schedule = []; g.hitstop = 1e8; return g; };
function warm(g, x = 100, y = 600, id = 'right') { for (let at = 0; at <= 200; at += 50) g.step(50, [point(x, y, at, id)], at); }

test('geometry detects finite segment crossings and rejects parallel / extended-only intersections', () => {
  assert.equal(segmentDistance({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 20 }), 20);
  assert.equal(segmentDistance({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.deepEqual(intersection({ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 }), { x: 50, y: 50 });
  assert.equal(intersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 }), null);
  assert.equal(intersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: -10 }, { x: 20, y: 10 }), null);
});
test('blade timestamps distinguish medium trail, fast slash and power; stale frames never repeat', () => {
  const b = new BladeTracker(); b.sample([point(100)], 0); b.sample([point(100, 600, 100)], 100); b.sample([point(100, 600, 200)], 200);
  const medium = b.sample([point(115, 600, 250)], 250)[0]; assert.equal(medium.active, false);
  const fast = b.sample([point(155, 600, 300)], 300)[0]; assert.equal(fast.active, true); assert.equal(fast.power, false);
  const power = b.sample([point(255, 600, 350)], 350)[0]; assert.equal(power.power, true);
  assert.deepEqual(b.sample([point(255, 600, 350)], 360), []); assert.deepEqual(b.sample([point(255, 600, 400)], 400), []);
  assert.ok(power.trail.every(p => power.at - p.at <= 130));
});
test('reacquisition, edge entry, impossible jumps and invalid coordinates cannot cut', () => {
  const b = new BladeTracker(); b.sample([point(50)], 0); assert.deepEqual(b.sample([point(120, 600, 30)], 30), []);
  b.sample([], 50); b.sample([point(160, 600, 70)], 70); assert.deepEqual(b.sample([point(230, 600, 100)], 100), []);
  b.sample([point(230, 600, 260)], 260); assert.deepEqual(b.sample([point(530, 600, 280)], 280), []);
  assert.deepEqual(b.sample([point(440, 600, 300)], 300), []);
  assert.deepEqual(b.sample([point(NaN, 600, 400), point(200, 600, 9999)], 400), []);
});
test('speed AND hitbox crossing are required, and resting trail cannot score twice', () => {
  const g = game(); warm(g); g.spawn('fruit', { x: 110, y: 600, r: 8 }); g.step(50, [point(115, 600, 250)], 250); assert.equal(g.score, 0);
  g.fruits = []; g.spawn('fruit', { x: 350, y: 600, r: 8 }); g.step(50, [point(200, 600, 300)], 300); assert.equal(g.score, 0);
  g.fruits = []; g.spawn('fruit', { x: 240, y: 600, r: 20 }); g.step(50, [point(280, 600, 350)], 350); assert.equal(g.sliced, 1); assert.equal(g.score, 170);
  g.spawn('fruit', { x: 240, y: 600, r: 20 }); g.step(50, [point(280, 600, 400)], 400); assert.equal(g.sliced, 1);
});
test('slice angles follow vertical, horizontal and diagonal hand movement', () => {
  for (const [dx, dy, angle] of [[100, 0, 0], [0, -100, -Math.PI / 2], [80, -80, -Math.PI / 4]]) {
    const g = game(); warm(g, 200, 600); g.spawn('fruit', { x: 200 + dx / 2, y: 600 + dy / 2, r: 15 });
    g.step(50, [point(200 + dx, 600 + dy, 250)], 250); const slice = g.events.find(e => e.type === 'slice'); assert.ok(slice); assert.ok(Math.abs(slice.angle - angle) < .001);
  }
});
test('bomb subtracts 300, resets combo and preserves the round', () => {
  const g = game(); warm(g); g.combo = 8; g.score = 100; g.spawn('bomb', { x: 150, y: 600 });
  g.step(50, [point(210, 600, 250)], 250); assert.equal(g.score, -200); assert.equal(g.combo, 0); assert.equal(g.bombs, 1); assert.equal(g.phase, 'playing'); assert.ok(g.events.some(e => e.type === 'bomb'));
});
test('a missed fruit resets combo; a missed bomb does not', () => {
  const g = game(); g.hitstop = 0; g.combo = 5; g.spawn('bomb', { y: 1200, vy: 200 }); g.step(20); assert.equal(g.combo, 5); assert.equal(g.bombs, 0);
  g.spawn('fruit', { y: 1200, vy: 200 }); g.step(20); assert.equal(g.combo, 0); assert.equal(g.missed, 1);
});
test('score scales combo, power and giant separately; ten-combo storm is one-shot', () => {
  const g = game(); const stroke = { angle: 0, power: false };
  for (let i = 0; i < 10; i++) g.slash(g.spawn(), stroke);
  assert.equal(g.score, 1000 + 20 * 55); assert.equal(g.bestCombo, 10); assert.equal(g.schedule.filter(s => s.type === 'fruit').length, 6); assert.equal(g.schedule.filter(s => s.type === 'bomb').length, 1);
  g.combo = 9; g.slash(g.spawn('fruit', { giant: true }), { angle: Math.PI / 4, power: true }); assert.equal(g.powerSlashes, 1); assert.equal(g.xSlashes, 1); assert.equal(g.score, 2100 + 100 + 200 + 50 + 300); assert.equal(g.schedule.length, 7);
});
test('crossing two fast hands gives X-SLASH, giant fruit points and a cooldown', () => {
  const g = game();
  for (let at = 0; at <= 200; at += 50) g.step(50, [point(190, 500, at, 'left'), point(350, 500, at, 'right')], at);
  g.step(50, [point(350, 660, 250, 'left'), point(190, 660, 250, 'right')], 250);
  assert.equal(g.xSlashes, 1); assert.equal(g.sliced, 1); assert.equal(g.score, 470); assert.ok(g.events.some(e => e.type === 'xslash'));
  g.step(50, [point(190, 500, 300, 'left'), point(350, 500, 300, 'right')], 300); assert.equal(g.xSlashes, 1);
});
test('15-second schedule has 29 fruit and four late bombs; hitstop preserves round length', () => {
  const g = new AirSlashGame(); assert.equal(g.schedule.filter(s => s.type === 'fruit').length, 29); assert.equal(g.schedule.filter(s => s.type === 'bomb').length, 4); assert.ok(g.schedule.filter(s => s.type === 'bomb').every(s => s.at >= 6000));
  for (let i = 0; i < 6; i++) g.step(100); assert.equal(g.phase, 'playing'); g.hitstop = 50;
  for (let i = 0; i < 150; i++) g.step(100);
  assert.equal(g.phase, 'result'); assert.equal(g.elapsed, ROUND_MS); assert.equal(g.result.elapsed, ROUND_MS); assert.ok(g.log.some(e => e.type === 'storm' && e.final));
});
test('pause freezes time and physics; tracking recovery requires stable observations and re-arms', () => {
  const g = game('camera'); warm(g); const elapsed = g.elapsed; g.pause(); g.step(100, [], 350); assert.equal(g.elapsed, elapsed); g.resume();
  for (let i = 0; i < 5; i++) g.step(100, [], 450 + i * 100); assert.equal(g.pauseReason, 'tracking'); const lostAt = g.elapsed;
  for (let i = 0; i < 3; i++) g.step(100, [point(100, 600, 1000 + i * 100)], 1000 + i * 100); assert.equal(g.paused, true); assert.equal(g.elapsed, lostAt);
  g.step(100, [point(100, 600, 1300)], 1300); assert.equal(g.paused, false); g.spawn('fruit', { x: 180, y: 600 }); g.step(50, [point(240, 600, 1350)], 1350); assert.equal(g.sliced, 0);
});
test('hand extraction uses only palm centers, mirrors camera crop and rejects duplicate labels', () => {
  const landmarks = Array.from({ length: 21 }, () => ({ x: .3, y: .6 })); landmarks[4] = null; landmarks[8] = null;
  const p = handCenters({ landmarks: [landmarks], handedness: [[{ categoryName: 'Left' }]] }, 10, 540, 960)[0]; assert.equal(p.id, 'right'); assert.equal(p.x, 378); assert.equal(p.y, 576);
  assert.equal(handCenters({ landmarks: [landmarks, landmarks], handedness: [[{ categoryName: 'Left' }], [{ categoryName: 'Left' }]] }, 10, 540, 960).length, 1);
  const f = faceCenter({ detections: [{ boundingBox: { originX: 100, originY: 150, width: 100, height: 200 } }] }, 540, 960);
  for (const [key, value] of Object.entries({ x: 390, y: 250, width: 100, height: 200 })) assert.ok(Math.abs(f[key] - value) < .001);
});
test('auto director chooses X-SLASH with lead-in and reaction, and preserves source', () => {
  const frames = Array.from({ length: 120 }, (_, i) => ({ at: i * 125, blob: i })), snapshot = { frames, faceMode: 'HIDE', events: [{ type: 'FIRST', at: 1000 }, { type: 'XSLASH', at: 7500, label: 'X-SLASH!' }, { type: 'STORM', at: 13000 }] };
  const clip = selectAirSlashReplay(snapshot, { source: 'demo' }); assert.equal(clip.heroAt, 7500); assert.equal(clip.heroLabel, 'X-SLASH!'); assert.equal(clip.from, 5700); assert.equal(clip.source, 'demo'); assert.equal(clip.faceMode, 'HIDE'); assert.ok(clip.frames.length >= 47);
});
test('AIR SLASH registry, aliases, lazy music and paused music integrate with platform', () => {
  assert.deepEqual(validateRegistry(experiments), []); const g = experiments.find(g => g.id === 'solo-air-slash'); assert.equal(g.duration, 15); assert.ok(g.aliases.includes('#air-slash')); assert.equal(trackForGame(g, 'demo').id, 'airSlash'); assert.equal(musicAudible({ phase: 'playing', paused: true }), false);
});
