import * as THREE from 'three';
import { SimplePuppetDriver } from './SimplePuppetDriver.js';
import { MONSTER } from '../profiles/index.js';
export class MascotPuppetDriver extends SimplePuppetDriver {
  async load(config = {}) { await super.load({ profile: MONSTER, ...config }); }
  makeBody() {
    super.makeBody(); const bird = this.config.profile.id === 'bird';
    this.materials.body.color.set(bird ? '#ffd26e' : '#8dcab0'); this.materials.head.color.set(bird ? '#ffd26e' : '#8dcab0');
    this.head.scale.set(1.3, 1.1, 1); this.rig.children[0].scale.set(1.25, 1.4, 1);
    for (const sign of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.08, .2, 8), this.materials.accent);
      horn.position.set(sign * .19, .3, -.03); horn.rotation.z = sign * -.25; this.head.add(horn);
      this.sphere(this.head, .065, this.materials.accent, [sign * .2, -.08, .3], [1.2, .45, .2]);
    }
    this.tail = this.sphere(this.rig, .2, this.materials.body, [0, -.38, -.38], [.8, .8, 2]);
    if (bird) {
      this.sphere(this.head, .1, this.materials.accent, [0, -.07, .39], [1.1, .6, 1.5]);
      this.leftArm.visible = this.rightArm.visible = false;
      this.wings = [-1, 1].map(sign => {
        const wing = new THREE.Group(); wing.position.set(sign * .3, .18, 0); this.rig.add(wing);
        this.sphere(wing, .25, this.materials.accent, [sign * .21, 0, 0], [1.4, .45, .7]); return wing;
      });
    }
    this.roar = new THREE.Group(); this.roar.position.set(0, -.13, .4); this.head.add(this.roar);
    for (let i = 0; i < 3; i++) this.sphere(this.roar, .09, this.materials.accent, [0, 0, .15 + i * .18], [1 - i * .18, 1 - i * .18, 1.5]);
  }
  update(frame, dt) {
    super.update(frame, dt); if (!this.motion || !this.roar) return;
    this.roar.visible = this.motion.mouth > .45;
    this.roar.scale.setScalar(Math.max(.05, this.motion.mouth));
    this.tail.rotation.y = this.motion.x * .5;
    if (this.wings) {
      const m = this.motion;
      this.wings[0].rotation.z = Math.PI / 2 + (m.mirror ? m.leftArm : m.rightArm);
      this.wings[1].rotation.z = -Math.PI / 2 + (m.mirror ? m.rightArm : m.leftArm);
    }
  }
}
