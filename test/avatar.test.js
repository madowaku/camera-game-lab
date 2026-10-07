import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { idleMotionFrame, blendValues } from '../src/avatar/motion/MotionFrame.js';
import { MotionNormalizer } from '../src/avatar/motion/MotionNormalizer.js';
import { MotionSmoother } from '../src/avatar/motion/MotionSmoother.js';
import { TrackingRecovery } from '../src/avatar/runtime/TrackingRecovery.js';
import { AdaptiveQuality } from '../src/avatar/runtime/AdaptiveQuality.js';
import { AvatarLayer } from '../src/avatar/AvatarLayer.js';
import { SimplePuppetDriver } from '../src/avatar/drivers/SimplePuppetDriver.js';
import { MascotPuppetDriver } from '../src/avatar/drivers/MascotPuppetDriver.js';
import { VRMPuppetDriver } from '../src/avatar/drivers/VRMPuppetDriver.js';
import { interpretMotion } from '../src/avatar/drivers/interpretMotion.js';
import { HUMAN, MONSTER, BIRD } from '../src/avatar/profiles/index.js';
import { drawFaceMode, normalizeFaceMode } from '../src/creator/FaceMode.js';
import { demoMotion } from '../src/avatar/test/demoMotion.js';

function pose() {
  const p = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .99 }));
  p[11] = { ...p[11], x: .65, y: .4 }; p[12] = { ...p[12], x: .35, y: .4 };
  p[13] = { ...p[13], x: .8, y: .4 }; p[15] = { ...p[15], x: .9, y: .4 };
  p[14] = { ...p[14], x: .2, y: .4 }; p[16] = { ...p[16], x: .1, y: .4 };
  return { landmarks: [p] };
}
function face() {
  const p = Array.from({ length: 478 }, () => ({ x: .5, y: .4, z: 0 }));
  p[33].x = .4; p[263].x = .6; p[61].x = .42; p[291].x = .58;
  p[13].y = .52; p[14].y = .56;
  p[159].y = p[386].y = .35; p[145].y = p[374].y = .38;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.2, .3, .1, 'YXZ'));
  return { faceLandmarks: [p], faceBlendshapes: [{ categories: [
    { categoryName: 'jawOpen', score: .8 }, { categoryName: 'eyeBlinkLeft', score: .9 }, { categoryName: 'eyeBlinkRight', score: .2 },
    { categoryName: 'mouthSmileLeft', score: .3 }, { categoryName: 'mouthSmileRight', score: .7 },
  ] }], facialTransformationMatrixes: [{ rows: 4, columns: 4, data: rotation.elements }] };
}
test('normalizer combines one camera result into bounded anatomical motion and coarse wrists', () => {
  const f = new MotionNormalizer().normalize({ pose: pose(), face: face(), aspect: 4 / 3 }, 100);
  assert.deepEqual(f.tracking, { face: true, pose: true, leftHand: true, rightHand: true });
  assert.equal(f.face.mouthOpen, .8); assert.equal(f.face.smile, .5); assert.equal(f.face.blinkLeft, .9);
  assert.ok(Math.abs(f.head.yaw - .3 / (Math.PI / 3)) < 1e-5);
  assert.equal(f.body.leftShoulder.z, .5); assert.equal(f.body.rightShoulder.z, -.5);
  assert.equal(f.hands.left.source, 'pose'); assert.ok(f.hands.left.position.x > 0);
  function numbers(o) { return Object.values(o).flatMap(v => typeof v === 'object' ? numbers(v) : typeof v === 'number' ? [v] : []); }
  assert.ok(numbers({ ...f, timestamp: 0 }).every(n => Number.isFinite(n) && Math.abs(n) <= 1));
});
test('normalizer rejects multiple/non-finite faces and gates low-confidence joints', () => {
  const n = new MotionNormalizer(), ambiguous = face(); ambiguous.faceLandmarks.push(ambiguous.faceLandmarks[0]);
  assert.equal(n.normalize({ face: ambiguous }, 0).tracking.face, false);
  const broken = face(); broken.faceLandmarks[0][1].x = NaN;
  assert.equal(n.normalize({ face: broken }, 50).tracking.face, false);
  const occluded = pose(); occluded.landmarks[0][11].visibility = .1;
  assert.equal(n.normalize({ pose: occluded }, 100).tracking.pose, false);
  const wristLost = pose(); wristLost.landmarks[0][15].visibility = .1;
  const f = n.normalize({ pose: wristLost }, 150); assert.equal(f.tracking.pose, true); assert.equal(f.tracking.leftHand, false); assert.equal(f.tracking.rightHand, true);
});
test('hand signals use handedness and confidence; finger inputs remain optional', () => {
  const p = Array.from({ length: 21 }, (_, i) => ({ x: .5 + i * .004, y: .7 - i * .013, z: 0 }));
  const n = new MotionNormalizer(), f = n.normalize({ hands: { landmarks: [p], handedness: [[{ categoryName: 'Left', score: .9 }]] } }, 0);
  assert.equal(f.tracking.leftHand, true); assert.equal(f.tracking.rightHand, false); assert.equal(f.hands.left.source, 'hand');
  assert.ok(f.hands.left.open >= 0 && f.hands.left.open <= 1);
  assert.equal(n.normalize({ hands: { landmarks: [p], handedness: [[{ categoryName: 'Left', score: .1 }]] } }, 50).tracking.leftHand, false);
});
test('movement energy does not spike on reacquisition or stale results', () => {
  const n = new MotionNormalizer(), p = pose(); n.normalize({}, 0); assert.equal(n.normalize({ pose: p }, 1000).energy.speed, 0);
  const moving = pose(); moving.landmarks[0].forEach(q => q.x += .15); assert.ok(n.normalize({ pose: moving }, 1050).energy.speed > 0);
  n.normalize({}, 1100); assert.equal(n.normalize({ pose: moving }, 1150).energy.speed, 0);
});
test('tracking loss holds 200ms, eases to idle by 700ms, blends recovery and ignores stale tracking', () => {
  const r = new TrackingRecovery({ staleMs: 100 }), live = demoMotion({ roll: 1, mouth: 1, leftArm: .5 }, 0);
  r.sample(live, 0); const full = r.sample({ ...live, timestamp: 200 }, 200); assert.equal(full.head.roll, 1);
  const hold = r.sample(idleMotionFrame(250), 250); assert.equal(hold.head.roll, 1); assert.equal(hold.tracking.face, false); assert.equal(r.status.face, 'KEEP');
  const fading = r.sample(idleMotionFrame(650), 650); assert.ok(fading.head.roll > 0 && fading.head.roll < 1);
  const idle = r.sample(idleMotionFrame(900), 900); assert.equal(idle.head.roll, 0); assert.equal(r.status.face, 'IDLE');
  const first = r.sample({ ...live, timestamp: 950 }, 950); assert.equal(first.head.roll, 0); assert.equal(r.status.face, 'RECOVER');
  assert.equal(r.sample({ ...live, timestamp: 1150 }, 1150).head.roll, 1);
  r.sample({ ...live, timestamp: 1150 }, 1500); assert.equal(r.frame.tracking.face, false);
});
test('one lost hand does not stop live face/pose/other hand', () => {
  const r = new TrackingRecovery(), f = demoMotion({ mouth: .8 }, 0); r.sample(f, 0); r.sample({ ...f, timestamp: 200 }, 200);
  const partial = { ...f, timestamp: 250, tracking: { ...f.tracking, leftHand: false } }; r.sample(partial, 250);
  assert.equal(r.status.face, 'LIVE'); assert.equal(r.status.pose, 'LIVE'); assert.equal(r.status.leftHand, 'KEEP'); assert.equal(r.status.rightHand, 'LIVE');
});
test('face-only lean uses loss recovery too, without claiming pose tracking', () => {
  const r = new TrackingRecovery(), f = idleMotionFrame(0); f.tracking.face = true; f.body.leanX = .8;
  r.sample(f, 0); const live = r.sample({ ...f, timestamp: 200 }, 200); assert.equal(live.tracking.pose, false); assert.equal(live.body.leanX, .8);
  assert.equal(r.sample(idleMotionFrame(300), 300).body.leanX, .8);
  assert.equal(r.sample(idleMotionFrame(900), 900).body.leanX, 0);
});
test('smoothing is time-based across render FPS and joint angles take the shorter arc', () => {
  function run(fps) { const s = new MotionSmoother('GAME_NORMAL'); s.update(idleMotionFrame(), 0); const target = demoMotion({ roll: 1 }, 0); for (let i = 0; i < fps; i++) s.update(target, 1 / fps); return s.frame.head.roll; }
  assert.ok(Math.abs(run(30) - run(60)) < 1e-10);
  const a = idleMotionFrame(), b = idleMotionFrame(); a.body.leftShoulder.z = .98; b.body.leftShoulder.z = -.98;
  a.hands.left.position.z = 1; b.hands.left.position.z = -1;
  const halfway = blendValues(a, b, .5); assert.ok(Math.abs(halfway.body.leftShoulder.z) > .99); assert.equal(halfway.hands.left.position.z, 0);
});
test('quality degrades after sustained low FPS, with cooldown and no visibility-gap penalty', () => {
  const q = new AdaptiveQuality('HIGH'); for (let i = 0; i < 21; i++) q.sample(.1); assert.equal(q.level, 'MEDIUM');
  for (let i = 0; i < 30; i++) q.sample(1); assert.equal(q.level, 'MEDIUM');
  for (let i = 0; i < 81; i++) q.sample(.1); assert.equal(q.level, 'LOW'); assert.equal(q.config.face, false);
});
test('avatar ingestion rejects stale/out-of-order timestamps and owns no recognition or RAF', () => {
  const layer = new AvatarLayer(); assert.equal(layer.ingest({ pose: pose() }, 100), true); assert.equal(layer.ingest({}, 99), false); assert.equal(layer.ingest({}, 100), false);
  assert.equal(layer.normalized.timestamp, 100); layer.update(100, .03); layer.update(850, .03); assert.equal(layer.frame.tracking.pose, false);
  layer.dispose(); assert.equal(layer.normalized, null); assert.equal(layer.canvas, null);
});
test('profiles and MIRROR/STAGE alter interpretation without changing the source frame', () => {
  const f = demoMotion({ yaw: .3, roll: .2, leftArm: .2, lean: .2 }, 0), before = structuredClone(f);
  const a = interpretMotion(f, HUMAN), stage = interpretMotion(f, HUMAN, 'STAGE'), monster = interpretMotion(f, MONSTER);
  assert.equal(a.yaw, -stage.yaw); assert.equal(a.leftArm, -stage.leftArm); assert.ok(Math.abs(monster.roll) > Math.abs(a.roll)); assert.deepEqual(f, before);
});
test('same MotionFrame drives primitive and mascot expression, arms and visibility; disposal releases geometry', async () => {
  const scene = new THREE.Scene(), simple = new SimplePuppetDriver(scene), mascot = new MascotPuppetDriver(scene);
  await simple.load({ profile: HUMAN }); await mascot.load({ profile: BIRD }); const f = demoMotion({ mouth: .9, leftArm: .4, roll: .3 }, 0);
  simple.update(f, .03); mascot.update(f, .03); assert.ok(simple.mouth.scale.y > 1); assert.equal(mascot.roar.visible, true); assert.ok(simple.rightArm.rotation.z < 0);
  simple.setVisible(false); assert.equal(simple.root.visible, false);
  let disposed = 0; simple.root.traverse(o => o.geometry?.addEventListener('dispose', () => disposed++)); simple.dispose(); simple.dispose(); mascot.dispose(); assert.ok(disposed > 0); assert.equal(scene.children.length, 0);
});
test('AVATAR never composites the real camera, even without an avatar or face, and accepts the common hook', () => {
  const video = { readyState: 3, videoWidth: 640, videoHeight: 480 }, calls = [], c = { drawImage(source) { calls.push(source); } }, canvas = { width: 1, height: 1 };
  drawFaceMode(c, video, 'AVATAR', null, { width: 270, height: 480 }); assert.equal(calls.length, 0);
  drawFaceMode(c, video, 'AVATAR', { left: .2 }, { width: 270, height: 480, avatarCanvas: canvas }); assert.deepEqual(calls, [canvas]); assert.equal(normalizeFaceMode('AVATAR'), 'AVATAR');
});
test('bundled VRM 1.0 actually loads, retargets normalized bones and morph expressions, then disposes', async () => {
  const old = globalThis.ProgressEvent; globalThis.ProgressEvent ??= class { constructor(type, props) { Object.assign(this, { type }, props); } };
  try {
    const loader = new GLTFLoader().register(parser => new VRMLoaderPlugin(parser));
    const fixture = readFileSync(new URL('../public/models/puppet-test.vrm', import.meta.url), 'utf8');
    const scene = new THREE.Scene(), driver = new VRMPuppetDriver(scene, { loader: { loadAsync: () => loader.parseAsync(fixture, '') } });
    await driver.load(); assert.equal(driver.vrm.meta.metaVersion, '1');
    const f = demoMotion({ mouth: .7, blink: .8, leftArm: .5, yaw: .4 }, 0); driver.update(f, .03);
    assert.equal(driver.vrm.expressionManager.getValue('aa'), .7); assert.equal(driver.vrm.expressionManager.getValue('blinkLeft'), .8);
    assert.ok(Math.abs(driver.vrm.humanoid.getNormalizedBoneNode('head').rotation.y) > .1);
    const mouth = driver.vrm.scene.getObjectByName('mouth-aa'); assert.ok(mouth.morphTargetInfluences[0] > .6);
    driver.dispose(); assert.equal(scene.children.length, 0); assert.equal(driver.vrm, null);
  } finally { if (old === undefined) delete globalThis.ProgressEvent; else globalThis.ProgressEvent = old; }
});
test('VRM loading cancelled during exit never attaches its late scene', async () => {
  let resolve; const scene = new THREE.Scene(), model = new THREE.Group(); let released = 0;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); model.add(mesh); mesh.geometry.addEventListener('dispose', () => released++);
  const driver = new VRMPuppetDriver(scene, { loader: { loadAsync: () => new Promise(r => resolve = r) } });
  const pending = driver.load(); driver.dispose(); resolve({ scene: model, userData: {} }); await pending;
  assert.equal(scene.children.length, 0); assert.equal(released, 1);
});
