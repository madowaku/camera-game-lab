import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { disposeObject3D } from '../../visual3d/disposeScene.js';
import { idleMotionFrame } from '../motion/MotionFrame.js';
import { HUMAN } from '../profiles/index.js';
import { interpretMotion } from './interpretMotion.js';
export class VRMPuppetDriver {
  constructor(scene, { loader } = {}) {
    this.scene = scene; this.loader = loader ?? new GLTFLoader().register(parser => new VRMLoaderPlugin(parser));
    this.root = new THREE.Group(); this.generation = 0;
  }
  async load(config = {}) {
    const token = ++this.generation; this.config = { profile: HUMAN, cameraMode: 'MIRROR', modelUrl: '/models/puppet-test.vrm', ...config };
    const gltf = await this.loader.loadAsync(this.config.modelUrl), vrm = gltf.userData.vrm;
    if (token !== this.generation) { disposeObject3D(gltf.scene); return; }
    if (!vrm) { disposeObject3D(gltf.scene); throw new Error('The model has no VRM humanoid.'); }
    this.vrm = vrm; VRMUtils.rotateVRM0(vrm);
    VRMUtils.removeUnnecessaryVertices(vrm.scene); VRMUtils.combineSkeletons(vrm.scene);
    const bounds = new THREE.Box3().setFromObject(vrm.scene), height = Math.max(.01, bounds.max.y - bounds.min.y);
    vrm.scene.scale.setScalar(1.9 / height); vrm.scene.position.y = -.95 - bounds.min.y * 1.9 / height;
    this.root.add(vrm.scene); this.scene.add(this.root);
    this.rest = new Map();
    for (const name of ['head', 'spine', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm']) {
      const bone = vrm.humanoid.getNormalizedBoneNode(name); if (bone) this.rest.set(name, bone.quaternion.clone());
    }
    // No auto look-at target or hair physics in v0.1.
    if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
    this.reset();
  }
  rotate(name, x, y, z) {
    const bone = this.vrm?.humanoid.getNormalizedBoneNode(name), rest = this.rest?.get(name);
    if (bone && rest) bone.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ')));
  }
  update(frame, dt = 0) {
    if (!this.vrm) return;
    const m = interpretMotion(frame, this.config.profile, this.config.cameraMode);
    this.motion = m; const size = m.miniature ? .38 : 1;
    this.root.scale.set(m.mirror ? -size : size, size, size);
    this.root.position.set((m.miniature ? .85 : 0) + m.x, (m.miniature ? -.65 : 0) + m.y, 0);
    const native = interpretMotion(frame, this.config.profile, 'STAGE');
    this.rotate('head', native.pitch, native.yaw, native.roll); this.rotate('spine', 0, 0, native.lean);
    // VRM normalized rest is a T-pose. Map camera-down zero to relaxed arms.
    this.rotate('leftUpperArm', 0, 0, -Math.PI / 2 + native.leftArm);
    this.rotate('rightUpperArm', 0, 0, Math.PI / 2 + native.rightArm);
    this.rotate('leftLowerArm', 0, 0, native.leftElbow);
    this.rotate('rightLowerArm', 0, 0, native.rightElbow);
    const expressions = this.vrm.expressionManager;
    expressions?.setValue('aa', m.mouth); expressions?.setValue('happy', m.smile);
    expressions?.setValue('blinkLeft', m.blinkLeft); expressions?.setValue('blinkRight', m.blinkRight);
    if (this.vrm.lookAt) { this.vrm.lookAt.yaw = m.yaw * 180 / Math.PI * .3; this.vrm.lookAt.pitch = m.pitch * 180 / Math.PI * .3; }
    this.vrm.update(Math.max(0, Math.min(.1, dt)));
  }
  setVisible(value) { this.root.visible = value; }
  reset() { this.vrm?.humanoid.resetNormalizedPose(); this.update(idleMotionFrame(), 0); }
  dispose() { ++this.generation; this.root.removeFromParent(); disposeObject3D(this.root); this.root.clear(); this.vrm = null; this.rest?.clear(); }
}
