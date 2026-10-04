import test from 'node:test';
import assert from 'node:assert/strict';
import { CounterCamGame, ENEMY_HP } from '../src/counterCam/core.js';
import { BoxingMotion, readBoxingPose, boxingFraming } from '../src/counterCam/pose.js';
import { selectCounterHighlight } from '../src/counterCam/creatorProfile.js';
const advance = (g, ms, input = {}) => { while (ms > 0) { const dt = Math.min(50, ms); g.step(dt, input); ms -= dt; } };
const dodge = g => {
  if (g.stage === 'idle') advance(g, 500);
  assert.equal(g.stage, 'telegraph'); advance(g, 900, { head: g.targetHead + .4 });
  assert.equal(g.stage, 'counter'); advance(g, 150);
};
function landmarks() {
  const lm = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1, presence: 1 }));
  lm[0] = { ...lm[0], x: .5, y: .32 }; lm[7].x = .45; lm[8].x = .55;
  for (const [i, x, y] of [[11, .35, .48], [12, .65, .48], [13, .32, .60], [14, .68, .60], [15, .38, .49], [16, .62, .49]]) lm[i] = { ...lm[i], x, y };
  return lm;
}
test('900ms warning before a hit; three undefended punches end the round', () => {
  const g = new CounterCamGame(); g.start(); advance(g, 1399); assert.equal(g.lives, 3);
  advance(g, 1); assert.equal(g.lives, 2); assert.equal(g.history.find(e => e.type === 'HIT').at - g.history.find(e => e.type === 'WINDUP').at, 900);
  advance(g, 6000); assert.equal(g.result.title, 'DOWN'); assert.equal(g.result.damageTaken, 3);
});
test('guard absorbs a punch without creating a counter', () => {
  const g = new CounterCamGame(); g.start(); advance(g, 1400, { guard: true });
  assert.equal(g.lives, 3); assert.equal(g.guards, 1); assert.equal(g.justDodges, 0); assert.equal(g.stage, 'strike');
});
test('dodge → 150ms freeze → buffered perfect counter deals 80; late counter deals 40', () => {
  const g = new CounterCamGame(); g.start(); advance(g, 500); advance(g, 900, { head: -.4 });
  assert.equal(g.freezeMs, 150); assert.equal(g.justDodges, 1);
  advance(g, 150, { punch: { strength: .8 } }); assert.equal(g.enemyHp, ENEMY_HP);
  advance(g, 50); assert.equal(g.enemyHp, ENEMY_HP - 80); assert.equal(g.perfectCounters, 1);
  advance(g, 950); dodge(g); advance(g, 350); g.punch();
  assert.equal(g.enemyHp, ENEMY_HP - 120); assert.equal(g.counters, 2); assert.equal(g.perfectCounters, 1);
});
test('ordinary punches deal 10; cooldown prevents spam winning inside 30 seconds', () => {
  const g = new CounterCamGame(); g.start();
  advance(g, 30000, { guard: true, punch: { strength: 1 } });
  assert.equal(g.result.title, 'TIME UP'); assert.ok(g.result.enemyHp > 0); assert.equal(g.perfectCounters, 0);
  assert.equal(ENEMY_HP - g.enemyHp, g.hits * 10);
});
test('four counters unlock charge; 500ms charge produces 240 damage and consumes gauge', () => {
  const g = new CounterCamGame(); g.start();
  for (let i = 0; i < 4; i++) { dodge(g); g.punch({ strength: .9 }); if (i < 3) advance(g, 950); }
  assert.equal(g.special, 100); advance(g, 500, { charging: true }); const hp = g.enemyHp;
  g.punch(); assert.equal(g.enemyHp, hp - 240); assert.equal(g.special, 0); assert.equal(g.history.at(-1).type, 'MEGA PUNCH');
});
test('perfect KO gives S+ with measured result; pause and recovery freeze all clocks', () => {
  const g = new CounterCamGame(); g.start(); g.enemyHp = 80; dodge(g); g.punch();
  assert.equal(g.result.rank, 'S+'); assert.equal(g.result.title, 'KO'); assert.equal(g.result.perfectCounters, 1);
  const p = new CounterCamGame(); p.start(); advance(p, 700); p.paused = true; advance(p, 2000, { punch: {} });
  assert.equal(p.elapsed, 700); assert.equal(p.enemyHp, ENEMY_HP); p.paused = false; p.recoverInput();
  advance(p, 1300); assert.equal(p.lives, 3); advance(p, 100); assert.equal(p.lives, 2);
});
test('tracking checks distance, framing and missing wrists before calibration', () => {
  const lm = landmarks(), p = readBoxingPose(lm, 0); assert.equal(boxingFraming(p), 'ready');
  const m = new BoxingMotion(); assert.ok(m.calibrate(p));
  lm[15].visibility = 0; const missing = readBoxingPose(lm, 50); assert.equal(boxingFraming(missing), 'hands');
  assert.equal(m.sample(missing).hands, false); assert.equal(m.sample(null).tracked, false);
  const near = landmarks(); near[11].x = .12; near[12].x = .88; assert.equal(boxingFraming(readBoxingPose(near, 100)), 'back');
  const noFace = landmarks(); noFace[0].visibility = 0; assert.equal(readBoxingPose(noFace, 100), null);
});
test('forward-depth punch detects once, needs retraction, and reacquisition has no velocity hit', () => {
  const lm = landmarks(), m = new BoxingMotion(); m.calibrate(readBoxingPose(lm, 0)); m.sample(readBoxingPose(lm, 0));
  lm[15].z = -.4; const hit = m.sample(readBoxingPose(lm, 50)); assert.ok(hit.punch); assert.ok(hit.punch.strength > .5);
  assert.equal(m.sample(readBoxingPose(lm, 100)).punch, null); assert.equal(m.sample(readBoxingPose(lm, 800)).punch, null);
  lm[15].z = 0; m.sample(readBoxingPose(lm, 850)); lm[15].z = -.4; assert.ok(m.sample(readBoxingPose(lm, 900)).punch);
  m.sample(null); lm[15].z = -.8; assert.equal(m.sample(readBoxingPose(lm, 950)).punch, null);
});
test('whole-body sway moves head without a false punch; both cheeks make guard', () => {
  const lm = landmarks(), m = new BoxingMotion(); m.calibrate(readBoxingPose(lm, 0)); m.sample(readBoxingPose(lm, 0));
  lm.forEach(p => p.x += .12); const sway = m.sample(readBoxingPose(lm, 50)); assert.ok(sway.head < -.28); assert.equal(sway.punch, null);
  lm[15].x = .57; lm[16].x = .67; lm[15].y = lm[16].y = .32;
  assert.equal(m.sample(readBoxingPose(lm, 100)).guard, true);
});
test('special-ready pose can report a retracted 500ms follow-up; game still owns damage cooldown', () => {
  const lm = landmarks(), m = new BoxingMotion(); m.calibrate(readBoxingPose(lm, 0)); m.sample(readBoxingPose(lm, 0));
  lm[15].z = -.4; assert.ok(m.sample(readBoxingPose(lm, 50)).punch);
  lm[15].z = 0; m.sample(readBoxingPose(lm, 100)); m.sample(readBoxingPose(lm, 500));
  lm[15].z = -.4; assert.ok(m.sample(readBoxingPose(lm, 550), { specialReady: true }).punch);
  assert.equal(m.sample(readBoxingPose(lm, 600), { specialReady: true }).punch, null);
});
test('creator chooses a 6s sequence around the KO and includes its lead-in', () => {
  const frames = Array.from({ length: 241 }, (_, i) => ({ at: i * 125, blob: {} }));
  const clip = selectCounterHighlight(frames, [{ type: 'PERFECT COUNTER', at: 9000 }, { type: 'KO', at: 28000 }]);
  assert.ok(clip.frames.some(f => f.at === 28000)); assert.ok(clip.frames[0].at <= 24000); assert.equal(clip.duration, 7000);
  assert.ok(clip.frames.at(-1).at - clip.frames[0].at <= 6000);
});
