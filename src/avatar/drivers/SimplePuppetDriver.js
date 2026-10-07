import * as THREE from 'three';
import { disposeObject3D } from '../../visual3d/disposeScene.js';
import { idleMotionFrame } from '../motion/MotionFrame.js';
import { HUMAN } from '../profiles/index.js';
import { interpretMotion } from './interpretMotion.js';

export class SimplePuppetDriver {
  constructor(scene) { this.scene = scene; this.root = new THREE.Group(); this.root.name = 'Puppet'; this.disposed = false; }
  async load(config = {}) {
    this.config = { profile: HUMAN, cameraMode: 'MIRROR', ...config };
    this.materials = { body: new THREE.MeshStandardMaterial({ color: '#abd5ff', roughness: .7 }),
      head: new THREE.MeshStandardMaterial({ color: '#f5e6ca', roughness: .7 }),
      ink: new THREE.MeshStandardMaterial({ color: '#213343' }), accent: new THREE.MeshStandardMaterial({ color: '#ff9369' }) };
    this.rig = new THREE.Group(); this.root.add(this.rig);
    this.makeBody(); this.scene.add(this.root); this.reset();
  }
  sphere(parent, radius, material, position = [0, 0, 0], scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
    mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  limb(parent, length, radius, material, position = [0, 0, 0]) {
    const pivot = new THREE.Group(); pivot.position.set(...position); parent.add(pivot);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
    mesh.position.y = -length / 2; pivot.add(mesh); return pivot;
  }
  makeBody() {
    this.sphere(this.rig, .38, this.materials.body, [0, -.06, 0], [.9, 1.3, .8]);
    this.head = new THREE.Group(); this.head.position.y = .57; this.rig.add(this.head);
    this.sphere(this.head, .35, this.materials.head);
    this.eyeLeft = this.sphere(this.head, .047, this.materials.ink, [.12, .07, .32], [1, 1.3, .4]);
    this.eyeRight = this.sphere(this.head, .047, this.materials.ink, [-.12, .07, .32], [1, 1.3, .4]);
    this.mouth = this.sphere(this.head, .08, this.materials.ink, [0, -.12, .33], [1, .15, .25]);
    this.leftArm = this.limb(this.rig, .4, .06, this.materials.body, [.38, .25, 0]);
    this.rightArm = this.limb(this.rig, .4, .06, this.materials.body, [-.38, .25, 0]);
    this.leftElbow = this.limb(this.leftArm, .35, .05, this.materials.head, [0, -.4, 0]);
    this.rightElbow = this.limb(this.rightArm, .35, .05, this.materials.head, [0, -.4, 0]);
    this.limb(this.rig, .45, .07, this.materials.body, [.17, -.48, 0]);
    this.limb(this.rig, .45, .07, this.materials.body, [-.17, -.48, 0]);
  }
  update(frame, dt = 0) {
    if (this.disposed || !this.head) return;
    this.motion = interpretMotion(frame, this.config.profile, this.config.cameraMode);
    const m = this.motion; this.age = (this.age ?? 0) + Math.min(.1, Math.max(0, dt));
    const bounce = this.reducedMotion ? 0 : Math.sin(this.age * 9) * m.speed * m.spring * .08;
    this.root.scale.setScalar(m.miniature ? .38 : 1);
    this.root.position.set((m.miniature ? .85 : 0) + m.x * (m.miniature ? .2 : 1), (m.miniature ? -.65 : 0) + m.y + bounce, 0);
    this.rig.rotation.z = m.lean; this.head.rotation.set(m.pitch, m.yaw, m.roll, 'YXZ');
    const left = m.mirror ? this.rightArm : this.leftArm, right = m.mirror ? this.leftArm : this.rightArm;
    const le = m.mirror ? this.rightElbow : this.leftElbow, re = m.mirror ? this.leftElbow : this.rightElbow;
    left.rotation.z = m.leftArm; right.rotation.z = m.rightArm; le.rotation.z = m.leftElbow; re.rotation.z = m.rightElbow;
    this.mouth.scale.y = .12 + m.mouth * 1.6;
    const eyeL = m.mirror ? this.eyeRight : this.eyeLeft, eyeR = m.mirror ? this.eyeLeft : this.eyeRight;
    eyeL.scale.y = Math.max(.06, 1.3 * (1 - m.blinkLeft)); eyeR.scale.y = Math.max(.06, 1.3 * (1 - m.blinkRight));
  }
  setVisible(value) { this.root.visible = value; }
  reset() { this.age = 0; this.update(idleMotionFrame(), 0); }
  dispose() { if (this.disposed) return; this.disposed = true; this.root.removeFromParent(); disposeObject3D(this.root); this.root.clear(); }
}
