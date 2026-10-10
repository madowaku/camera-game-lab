import test from "node:test";
import assert from "node:assert/strict";
import { GuardianSpiritGame, GUARDIAN_RULES } from "../src/games/guardianSpirit.js";
import { GuardianGestures, demoGuardianPose, extractGuardianPose } from "../src/input/guardianGestures.js";
import { coverTransform } from "../src/guardian/renderer.js";
import { playerTransform, guardianFraming, followGuardianArm } from "../src/guardian/composition.js";

function advance(game, ms, present = true) {
  for (let left = ms; left > 0; left -= 100) game.step(Math.min(100, left), { present });
}
function playing() {
  const game = new GuardianSpiritGame({ random: () => 0.25 });
  game.start(); advance(game, 5200); assert.equal(game.phase, "playing"); return game;
}
const imp = (id, x = 0.2) => ({ id, x, y: 0.45, age: 0, attackAt: 5000, side: -1 });

test("summoning waits for a present player and opens the eyes before combat", () => {
  const game = new GuardianSpiritGame(); game.start(); advance(game, 6000, false);
  assert.equal(game.phase, "align"); assert.equal(game.elapsedMs, 0);
  advance(game, 700); assert.equal(game.phase, "countdown");
  advance(game, 3000); assert.equal(game.phase, "awakening"); assert.equal(game.enemies.length, 0);
  advance(game, 1500); assert.equal(game.phase, "playing");
});
test("loss freezes enemies, clock and shield, with a full three-second recovery", () => {
  const game = playing(); advance(game, 500); game.act({ type: "shield" });
  const before = JSON.stringify({ enemies: game.enemies, elapsed: game.elapsedMs, shield: game.shieldMs });
  advance(game, 3000, false);
  assert.equal(JSON.stringify({ enemies: game.enemies, elapsed: game.elapsedMs, shield: game.shieldMs }), before);
  assert.equal(game.losses, 1); assert.equal(game.act({ type: "punch" }), false);
  advance(game, 2900); assert.equal(game.paused, true); assert.equal(game.elapsedMs, 500);
  advance(game, 100); assert.equal(game.paused, false); assert.equal(game.elapsedMs, 500);
  advance(game, 100); assert.equal(game.elapsedMs, 600);
});
test("another loss during recovery restarts the countdown", () => {
  const game = playing(); advance(game, 100, false); advance(game, 2500); advance(game, 100, false);
  assert.equal(game.resumeMs, 3000); advance(game, 2900); assert.equal(game.paused, true);
});
test("punch hits only its side, shot assists aim, combos and gauge accumulate", () => {
  const game = playing(); game.enemies = [imp(1), imp(2, 0.8), imp(3, 0.25)];
  game.act({ type: "punch", side: "left" }); assert.equal(game.defeated, 2); assert.equal(game.enemies[0].id, 2);
  game.act({ type: "shot", direction: { x: 0.7, y: 0.5 } }); assert.equal(game.defeated, 3);
  assert.equal(game.score, 300); assert.equal(game.maxCombo, 3); assert.equal(game.gauge, 3 / GUARDIAN_RULES.gaugeKills);
  game.receiveAttack(); assert.equal(game.score, 200); assert.equal(game.combo, 0); assert.equal(game.maxCombo, 3);
});
test("shield negates hits for one second, grants block points, and cannot be spammed", () => {
  const game = playing(); assert.equal(game.act({ type: "shield" }), true);
  game.receiveAttack(); assert.equal(game.blocks, 1); assert.equal(game.score, 200); assert.equal(game.hits, 0);
  assert.equal(game.act({ type: "shield" }), false); advance(game, 1000); game.enemies = [];
  game.receiveAttack(); assert.equal(game.hits, 1); assert.equal(game.score, 100);
});
test("boss arrives with eight seconds remaining and ordinary attacks never kill it", () => {
  const game = playing(); advance(game, 21900); assert.equal(game.boss, false);
  advance(game, 100); assert.equal(game.boss, true); assert.equal(game.remainingSeconds, 8);
  game.act({ type: "punch" }); game.act({ type: "shot" }); assert.equal(game.boss, true);
  assert.equal(game.act({ type: "ascend" }), false); game.gauge = 1;
  assert.equal(game.act({ type: "ascend" }), true); assert.equal(game.phase, "ascension");
  advance(game, 1900); assert.equal(game.phase, "victory"); assert.equal(game.boss, false); assert.equal(game.enemies.length, 0);
  advance(game, 4000); assert.equal(game.phase, "result"); assert.equal(game.result.victory, true); assert.equal(game.captureRequested, true);
});
test("five idle rounds complete at thirty seconds without fabricating a victory", () => {
  for (let i = 0; i < 5; i++) {
    const game = playing(); advance(game, 30000);
    assert.equal(game.result.durationMs, 30000); assert.equal(game.result.victory, false);
    assert.equal(game.captureRequested, false); assert.equal(game.running, false);
  }
});
test("delayed frames cannot teleport enemies or skip an entire round", () => {
  const game = playing(); game.step(20000, { present: true }); assert.equal(game.elapsedMs, 100);
  game.step(NaN, { present: true }); assert.equal(game.elapsedMs, 100);
});
test("poses validate head and shoulders but missing wrists do not lose the person", () => {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  landmarks[0] = { x: 0.6, y: 0.3, visibility: 0.99 };
  landmarks[11] = { x: 0.4, y: 0.5, visibility: 0.99 }; landmarks[12] = { x: 0.7, y: 0.5, visibility: 0.99 };
  const pose = extractGuardianPose(landmarks, 0.75); assert.equal(pose.head.x, 0.4);
  assert.ok(pose.arms.every((arm) => !arm.wrist));
  landmarks[0].visibility = 0.2; assert.equal(extractGuardianPose(landmarks), null);
});
test("both raised hands take precedence and holding the pose emits only one edge", () => {
  const detector = new GuardianGestures(), pose = demoGuardianPose();
  pose.arms.forEach((arm) => { arm.wrist.y = 0.25; });
  assert.deepEqual(detector.update(pose, 0), []);
  assert.deepEqual(detector.update(pose, 200), [{ type: "ascend" }]);
  for (let t = 300; t < 2000; t += 100) assert.deepEqual(detector.update(pose, t), []);
});
test("spread arms trigger shield rather than shots and must be released before rearming", () => {
  const detector = new GuardianGestures(), pose = demoGuardianPose();
  pose.arms.forEach((arm, index) => { arm.wrist = { x: index ? 0.95 : 0.05, y: 0.54 }; arm.elbow = { x: index ? 0.8 : 0.2, y: 0.54 }; });
  detector.update(pose, 0); assert.deepEqual(detector.update(pose, 160), [{ type: "shield" }]);
  for (let t = 200; t < 2000; t += 100) assert.deepEqual(detector.update(pose, t), []);
  detector.update(demoGuardianPose(), 2100); detector.update(pose, 2200);
  assert.deepEqual(detector.update(pose, 2400), [{ type: "shield" }]);
});
test("a held extended arm fires once, while a bent quick sweep punches", () => {
  const detector = new GuardianGestures(), pose = demoGuardianPose();
  pose.arms[1].elbow = { x: 0.76, y: 0.55 }; pose.arms[1].wrist = { x: 0.95, y: 0.56 };
  detector.update(pose, 0); assert.equal(detector.update(pose, 200)[0]?.type, "shot");
  assert.deepEqual(detector.update(pose, 400), []);
  detector.reset(); const sweep = demoGuardianPose(); detector.update(sweep, 0);
  sweep.arms[0].wrist.x += 0.13;
  assert.equal(detector.update(sweep, 100)[0]?.type, "punch");
});
test("body movement and reacquisition cannot generate false punches", () => {
  const detector = new GuardianGestures(), pose = demoGuardianPose(); detector.update(pose, 0);
  const moved = demoGuardianPose(); moved.arms.forEach((arm) => { for (const part of ["shoulder", "elbow", "wrist"]) arm[part].x += 0.15; });
  assert.deepEqual(detector.update(moved, 100), []);
  detector.update(null, 200); assert.deepEqual(detector.update(pose, 300), []);
});
test("a foreshortened forward thrust can shoot using coarse arm depth", () => {
  const detector = new GuardianGestures(), pose = demoGuardianPose();
  pose.arms[1].shoulder.z = 0;
  pose.arms[1].elbow = { x: 0.65, y: 0.55, z: -0.15 };
  pose.arms[1].wrist = { x: 0.66, y: 0.54, z: -0.4 };
  detector.update(pose, 0); assert.equal(detector.update(pose, 200)[0]?.type, "shot");
});
test("camera and person mask use the same centered cover crop", () => {
  const cover = coverTransform(1280, 720, 390, 520);
  assert.equal(cover.height, 520); assert.ok(cover.width > 390);
  assert.equal(cover.x + cover.width * 0.5, 195); assert.equal(cover.y, 0);
});

test("near-camera players stay compact with room above for their guardian", () => {
  for (const [sw, sh, w, h] of [[1280, 720, 390, 520], [720, 1280, 375, 500], [1280, 720, 600, 450]]) {
    for (const shoulderWidth of [0.15, 0.3, 0.6]) {
      const pose = { ...demoGuardianPose(), shoulderWidth };
      const fit = playerTransform(pose, sw, sh, w, h);
      assert.ok(fit.width * shoulderWidth <= w * 0.24 + 0.001);
      assert.ok(fit.width <= w && fit.height <= h * 0.55 + 0.001);
      assert.ok(Math.abs(fit.x + pose.head.x * fit.width - w / 2) < 0.001);
      assert.ok(Math.abs(fit.y + pose.head.y * fit.height - h * 0.53) < 0.001);
      assert.ok(fit.y + fit.height <= h * 0.96 + 0.001);
    }
  }
});

test("display size changes composition without changing body input", () => {
  const pose = demoGuardianPose(), before = structuredClone(pose);
  const small = playerTransform(pose, 720, 1280, 390, 520, 0.35);
  const large = playerTransform(pose, 720, 1280, 390, 520, 0.75);
  assert.ok(small.width < large.width); assert.deepEqual(pose, before);
});

test("framing guidance permits comfortable proximity and helps with cropped arms", () => {
  assert.equal(guardianFraming(null), "findBody");
  const pose = demoGuardianPose(); assert.equal(guardianFraming(pose), "bodyReady");
  pose.shoulderWidth = 0.5; assert.equal(guardianFraming(pose), "bodyReady");
  pose.arms[0].wrist = null; assert.equal(guardianFraming(pose), "showHands");
  pose.head.y = 0.02; assert.equal(guardianFraming(pose), "bodyCropped");
});

test("guardian limbs follow real arm direction with fixed, amplified lengths", () => {
  const pose = demoGuardianPose(), arm = pose.arms[0];
  let rig = followGuardianArm(arm, pose.aspect, -1);
  assert.ok(Math.abs(Math.hypot(rig.elbow.x - rig.shoulder.x, rig.elbow.y - rig.shoulder.y) - 90) < 0.001);
  arm.elbow = { x: arm.shoulder.x, y: arm.shoulder.y - 0.1 };
  arm.wrist = { x: arm.shoulder.x, y: arm.shoulder.y - 0.2 };
  rig = followGuardianArm(arm, pose.aspect, -1);
  assert.ok(rig.wrist.y < rig.elbow.y && rig.elbow.y < rig.shoulder.y);
  assert.ok(Number.isFinite(followGuardianArm(null, 0.75, 1).wrist.x));
});

test("smash feedback matches each kill's combo multiplier and total reward", () => {
  const game = playing(), effects = []; game.onEffect = (event) => effects.push(event);
  game.combo = 2; game.enemies = [imp(1), imp(2), imp(3)];
  game.act({ type: "punch", side: "left" });
  const event = effects.at(-1);
  assert.equal(event.scoreGain, 500); assert.equal(event.combo, 5);
  assert.deepEqual(event.targets.map((target) => target.score), [100, 200, 200]);
});
