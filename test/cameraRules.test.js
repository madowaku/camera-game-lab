import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuleState, updateRule, anchorVisible } from '../src/camera/rules.js';
import { CameraIsItGame } from '../src/games/cameraIsIt.js';
import { stages, VIEW } from '../src/camera/stages.js';
const run = (rule) => { const state = createRuleState(); return [state, (visible, dt, count) => updateRule({ rule }, state, visible, dt, count)]; };
test('VISIBLE enters and exits', () => { const [s, tick] = run('VISIBLE'); tick(true, 16); assert.ok(s.solid); tick(false, 16); assert.equal(s.solid, false); });
test('FOCUS completes, tolerates jitter, resets after grace', () => {
  const [s, tick] = run('FOCUS_HOLD'); tick(true, 300); tick(false, 180); assert.equal(s.focusMs, 300);
  tick(true, 200); assert.ok(s.solid); tick(false, 181); assert.equal(s.focusMs, 0); assert.equal(s.solid, false);
});
test('AFTERIMAGE starts, fades and expires', () => { const [s, tick] = run('AFTERIMAGE'); tick(true, 16); tick(false, 750); assert.ok(s.solid); assert.equal(s.opacity, .5); tick(false, 750); assert.equal(s.solid, false); });
test('OVEREXPOSE accumulates, breaks, requires full recovery', () => {
  const [s, tick] = run('OVEREXPOSE'); tick(true, 600); assert.ok(s.solid); assert.equal(s.overexposeMs, 600);
  tick(true, 600); assert.equal(s.solid, false); tick(false, 699); assert.equal(s.solid, false); tick(false, 1); assert.ok(s.solid);
  tick(true, 1199); assert.ok(s.solid); tick(true, 1); assert.equal(s.solid, false);
});
test('LINKED one, all, and lost member', () => { const [s, tick] = run('LINKED'); tick(true, 16, 1); assert.equal(s.solid, false); tick(false, 16, 2); assert.ok(s.solid); tick(true, 16, 1); assert.equal(s.solid, false); });
test('anchor margin accepts small framing error', () => { assert.ok(anchorVisible({ x: 854, y: 870, width: 0 }, { x: 400, y: 870 }, VIEW)); assert.equal(anchorVisible({ x: 860, y: 870, width: 0 }, { x: 400, y: 870 }, VIEW), false); });
test('focus can compose with afterimage in finale', () => { const s = createRuleState(), p = { rule: 'FOCUS_HOLD', memoryMs: 1500 }; updateRule(p, s, true, 500); updateRule(p, s, false, 1000); assert.ok(s.solid); updateRule(p, s, false, 500); assert.equal(s.solid, false); });
test('failure holds cause for 500ms and resumes within 1500ms', () => { const g = new CameraIsItGame(); g.loadStage(7); g.phase = 'playing'; g.failStage(g.platforms[1]); const r = { ...g.runner }; g.step(499); assert.deepEqual(g.runner, r); assert.equal(g.phase, 'failing'); g.step(1); g.step(600); assert.equal(g.phase, 'playing'); assert.equal(g.index, 7); });
test('all five new stages have a camera-only solution', () => {
  for (let index = 5; index < stages.length; index++) {
    const g = new CameraIsItGame(); g.start(); g.loadStage(index);
    for (let i = 0; i < 2000 && g.phase !== 'stage-clear' && g.phase !== 'result'; i++) {
      const r = g.runner, next = g.platforms[Math.min(r.support + 1, g.platforms.length - 1)];
      let x = r.x + 200, y = (r.y + next.y) / 2 - 50;
      if (index === 5 && r.support <= 1) x = 555;
      if (index === 7) x = r.x - 370;
      if (index === 6 && r.support === 1 && r.x > 615) x = 1300;
      if (next.rule === 'LINKED' || g.platforms[r.support].rule === 'LINKED') {
        const group = next.rule === 'LINKED' ? next.linkedGroup : g.platforms[r.support].linkedGroup;
        const a = g.anchors.filter(a => a.linkedGroup === group); x = (a[0].x + a[1].x) / 2; y = index === 9 && r.x > 1100 ? 1050 : 650;
      }
      const hot = g.platforms.find(p => p.rule === 'OVEREXPOSE' && p.ruleState.overexposeMs > 600);
      if (hot && index !== 7) x = hot.x + hot.width / 2 + 490;
      g.setCamera({ x, y }, true); g.step(16);
    }
    assert.ok(g.phase === 'stage-clear' || g.result?.clear, `stage ${index + 1}: ${g.phase} ${JSON.stringify(g.attempts)}`);
    assert.equal(g.attempts?.length ?? 0, 0, `stage ${index + 1} should be solvable without death`);
  }
});
test('006 requires intentional center framing and stops to teach the action', () => {
  const g = new CameraIsItGame(); g.loadStage(5);
  g.step(9000);
  assert.equal(g.phase, 'playing');
  assert.equal(g.platforms[1].active, false);
  assert.ok(g.runner.x < 430, 'walker waits before inactive focus platform');
  g.setCamera({ x: 555, y: 870 }, true); g.step(550);
  assert.ok(g.platforms[1].active, 'filling the focus ring activates the bridge');
});
test('007 grants a safe edge stop and visible afterimage before the landing', () => {
  const g = new CameraIsItGame(); g.loadStage(6);
  g.step(9000);
  assert.equal(g.phase, 'playing');
  assert.ok(g.runner.x < 690, 'walker waits for the landing to be framed');
  g.setCamera({ x: 1100, y: 870 }, true); g.step(16);
  assert.ok(g.platforms[2].active, 'far landing visible');
  assert.ok(g.platforms[1].active, 'launch platform remembered');
  assert.equal(g.platforms[1].ruleState.visible, false);
});
test('007 needs the remembered launch surface when framing the distant landing', () => {
  const g = new CameraIsItGame(); g.start(); g.loadStage(6); g.phase = 'playing';
  g.runner.support = 1; g.runner.x = 650;
  g.setCamera({ x: 600, y: 870 }, true); g.updateExistence(16);
  g.setCamera({ x: 1300, y: 870 }, true); g.updateExistence(16);
  assert.equal(g.platforms[1].ruleState.visible, false); assert.ok(g.platforms[1].active); assert.ok(g.platforms[2].active);
  g.platforms[1].rule = 'VISIBLE'; g.step(16); assert.equal(g.phase, 'failing');
});
test('001–010 play continuously and produce ten receipts', () => {
  const g = new CameraIsItGame(); g.start();
  for (let i = 0; i < 15000 && g.phase !== 'result'; i++) {
    const r = g.runner, next = g.platforms[Math.min(r.support + 1, g.platforms.length - 1)];
    let x = r.x + 200, y = (r.y + next.y) / 2 - 50;
    if (g.index === 5 && r.support <= 1) x = 555;
    if (g.index === 7) x = r.x - 370;
    if (g.index === 6 && r.support === 1 && r.x > 615) x = 1300;
    if (next.rule === 'LINKED' || g.platforms[r.support].rule === 'LINKED') {
      const group = next.rule === 'LINKED' ? next.linkedGroup : g.platforms[r.support].linkedGroup;
      const a = g.anchors.filter(a => a.linkedGroup === group); x = (a[0].x + a[1].x) / 2; y = g.index === 9 && r.x > 1100 ? 1050 : 650;
    }
    const hot = g.platforms.find(p => p.rule === 'OVEREXPOSE' && p.ruleState.overexposeMs > 600);
    if (hot && g.index !== 7) x = hot.x + hot.width / 2 + 490;
    g.setCamera({ x, y }); g.step(16);
    if (g.phase === 'stage-clear') g.nextStage();
  }
  assert.ok(g.result?.clear, JSON.stringify({ index:g.index, phase:g.phase, attempts:g.attempts })); assert.equal(g.result.receipts.length, 10); assert.equal(g.completed, 10);
});
