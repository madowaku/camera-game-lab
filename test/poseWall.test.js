import test from 'node:test';
import assert from 'node:assert/strict';
import { POSES, makePose, scorePose, PoseTracker, projectPose, framingHint, targetForPlayer, W, H } from '../src/poseWall/poses.js';
import { PoseWallGame, heldScore, rankFor } from '../src/poseWall/core.js';
import { experiments, validateRegistry } from '../src/platform/experiments.js';
import { resolveRoute } from '../src/platform/navigation.js';
import { trackForGame } from '../src/platform/music.js';
const landmarksFor = p => {
  const lm = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: 0 }));
  lm[0] = { ...p.nose, x: 1 - p.nose.x, visibility: 1 };
  p.arms.forEach((a, i) => ['shoulder', 'elbow', 'wrist'].forEach((joint, j) => { lm[[11, 13, 15][j] + i] = { ...a[joint], x: 1 - a[joint].x, visibility: 1 }; }));
  return lm;
};
test('five distinct upper-body poses match their target at every video aspect', () => {
  assert.equal(POSES.length, 5);
  for (const aspect of [.5625, .6, 1, 16 / 9]) for (const target of POSES) {
    assert.equal(scorePose(makePose(target.angles, { aspect }), target).score, 100, target.name);
    for (const other of POSES) if (other !== target) assert.ok(scorePose(makePose(other.angles, { aspect }), target).score < 90, other.name + ' versus ' + target.name);
  }
});
test('direction scoring absorbs arm length, shoulder width and position differences', () => {
  for (const target of POSES) for (const scale of [.65, 1.15, 1.4]) {
    const p = makePose(target.angles, { cx: .43, cy: .6, width: .18 });
    p.arms.forEach(a => { const fore = { x: a.wrist.x - a.elbow.x, y: a.wrist.y - a.elbow.y }; a.elbow = { x: a.shoulder.x + (a.elbow.x - a.shoulder.x) * scale, y: a.shoulder.y + (a.elbow.y - a.shoulder.y) * scale }; a.wrist = { x: a.elbow.x + fore.x * scale, y: a.elbow.y + fore.y * scale }; });
    assert.equal(scorePose(p, target).score, 100);
  }
});
test('shoulder tilt is corrected in physical image pixels', () => {
  const p = makePose(POSES[0].angles, { aspect: 16 / 9 }), theta = .15, cx = .5, cy = .65;
  const rotate = q => { const x = (q.x - cx) * p.aspect, y = q.y - cy; return { x: cx + (x * Math.cos(theta) - y * Math.sin(theta)) / p.aspect, y: cy + x * Math.sin(theta) + y * Math.cos(theta) }; };
  p.nose = rotate(p.nose); p.arms = p.arms.map(a => Object.fromEntries(Object.entries(a).map(([k, q]) => [k, rotate(q)])));
  assert.equal(scorePose(p, POSES[0]).score, 100);
});
test('landmark tracking consumes only seven points, mirrors once, and preserves arm identity', () => {
  const p = makePose(POSES[2].angles), lm = landmarksFor(p), tracker = new PoseTracker();
  const got = tracker.update(lm, 100, W / H);
  assert.equal(scorePose(got, POSES[2]).score, 100);
  lm[15].x = .1; lm[16].x = .9; // Cross wrists; keep them with their original shoulders.
  const crossed = tracker.update(lm, 110, W / H);
  assert.ok(crossed.arms[0].wrist.x > crossed.arms[1].wrist.x);
  lm.slice(17).forEach(q => { q.x = NaN; q.y = NaN; });
  assert.ok(tracker.update(lm, 120, W / H));
});
test('missing and offscreen wrists retain at most 150ms and cannot give perfect scores', () => {
  const p = makePose(POSES[0].angles), lm = landmarksFor(p), tracker = new PoseTracker();
  tracker.update(lm, 0, .6); lm[15].visibility = 0; lm[16].x = -1;
  assert.equal(scorePose(tracker.update(lm, 150, .6), POSES[0]).score, 100);
  const expired = tracker.update(lm, 151, .6);
  assert.equal(expired.arms[0].wrist, null); assert.equal(expired.arms[1].wrist, null);
  assert.equal(rankFor(scorePose(expired, POSES[0]).score), 'SQUEEZE');
  assert.equal(tracker.update(null, 310, .6), null);
  tracker.reset(); assert.equal(tracker.update(null, 320, .6), null);
});
test('invalid input and degenerate segments do not produce NaN or a false pass', () => {
  assert.equal(scorePose(null, POSES[0]).score, 0);
  const p = makePose(POSES[0].angles); p.arms.forEach(a => { a.elbow = a.shoulder; a.wrist = a.shoulder; });
  assert.equal(rankFor(scorePose(p, POSES[0]).score), 'CRASH');
  assert.equal(new PoseTracker().update([], 0, NaN), null);
});
test('framing uses the same center-cover crop as the mirrored video', () => {
  assert.equal(framingHint(makePose()), 'ready');
  assert.equal(framingHint(makePose(undefined, { width: .35 })), 'farther');
  assert.equal(framingHint(makePose(undefined, { width: .1 })), 'closer');
  assert.equal(framingHint(makePose(undefined, { cx: .2 })), 'frame');
  const p = projectPose(makePose(POSES[0].angles, { aspect: 1 }));
  assert.ok(Math.abs(p.arms[0].shoulder.x - (.5 - .11 / .6)) < 1e-8);
  for (const target of POSES) for (const a of makePose(target.angles).arms) for (const p of [a.elbow, a.wrist]) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  const offset = makePose(POSES[1].angles, { cx: .43 }), fitted = targetForPlayer(offset, POSES[1].angles);
  assert.equal(framingHint(offset), 'ready'); assert.ok(Math.abs(fitted.arms[0].shoulder.x - offset.arms[0].shoulder.x) < .01);
  fitted.arms.forEach(a => assert.ok(a.wrist.x >= .025 && a.wrist.x <= .975));
});
test('rank thresholds exactly follow the four design bands', () => {
  assert.deepEqual([0,49,50,69,70,89,90,100].map(rankFor), ['CRASH','CRASH','SQUEEZE','SQUEEZE','CLEAR','CLEAR','PERFECT','PERFECT']);
});
test('hold grading is time-weighted over 300ms, not a frame-count or best-frame score', () => {
  assert.equal(heldScore([{ at: 1.7, score: 0 }, { at: 1.999, score: 100 }], 2), 0);
  assert.equal(heldScore([{ at: 1.7, score: 60 }, { at: 1.85, score: 100 }], 2), 80);
  assert.equal(heldScore([{ at: 1.95, score: 100 }], 2), 17);
});
test('15-second round records every verdict once and crashes never end it early', () => {
  const g = new PoseWallGame(); g.start();
  for (const score of [98, 80, 60, 20, 94]) { g.step(2, score); g.step(1, score); }
  assert.equal(g.phase, 'result'); assert.equal(g.elapsed, 15);
  assert.deepEqual(g.result.counts, { PERFECT: 2, CLEAR: 1, SQUEEZE: 1, CRASH: 1 });
  assert.equal(g.result.score, 70); assert.equal(g.result.best.index, 0); assert.equal(g.result.bestCombo, 3);
  assert.equal(g.takeEvents().filter(e => e.type === 'judge').length, 5);
  g.step(4, 100); assert.equal(g.result.walls.length, 5);
});
test('pauses freeze the active clock and reset/retry discards prior results', () => {
  const g = new PoseWallGame(); g.start(); g.step(1.5, 100); g.paused = true; g.step(30, 0); assert.equal(g.elapsed, 1.5);
  g.paused = false; g.step(.5, 100); assert.equal(g.walls[0].rank, 'PERFECT');
  g.reset(); assert.equal(g.walls.length, 0); assert.equal(g.result, null); assert.equal(g.combo, 0);
  g.start(); g.step(15, 100); assert.equal(g.result.score, 100); assert.equal(g.perfectStreak, 5);
});
test('last-moment matching cannot overwrite earlier mismatch', () => {
  const g = new PoseWallGame(); g.start(); g.step(1.95, 0); g.step(.05, 100);
  assert.equal(g.walls[0].rank, 'CRASH'); assert.equal(g.walls[0].score, 17);
});
test('registry, alias and licensed music integrate without the duplicate EXP number colliding', () => {
  const game = experiments.find(g => g.id === 'solo-pose-wall');
  assert.deepEqual(validateRegistry(experiments), []); assert.equal(resolveRoute('#pose-wall', experiments).experiment.id, game.id);
  assert.equal(game.duration, 15); assert.equal(game.requiresMicrophone, false); assert.deepEqual(game.input, ['BODY']);
  assert.equal(trackForGame(game, 'camera').creator, 'いまたく');
  assert.notEqual(game.id, experiments.find(g => g.id === 'duo-palm-pong').id);
  const g = new PoseWallGame(); g.start(); g.step(15, 100); g.result.source = 'demo';
  assert.match(game.resultShare(g.result, 'ja'), /練習.*100%/);
});
