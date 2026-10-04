import * as THREE from 'three';

export class ImpactBurst {
  constructor(scene, { count = 28, color = 0xffffff } = {}) {
    this.count = count; this.positions = new Float32Array(count * 3); this.velocities = Array.from({ length: count }, () => new THREE.Vector3());
    this.geometry = new THREE.BufferGeometry(); this.attribute = new THREE.BufferAttribute(this.positions, 3); this.attribute.setUsage(THREE.DynamicDrawUsage); this.geometry.setAttribute('position', this.attribute);
    this.material = new THREE.PointsMaterial({ color, size: .075, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(this.geometry, this.material); this.points.visible = false; scene.add(this.points); this.life = 0;
  }
  burst(point, { color = 0xffffff, intensity = 1 } = {}) {
    this.material.color.set(color); this.material.opacity = .95; this.points.visible = true; this.life = 1;
    for (let i = 0; i < this.count; i++) {
      const angle = i / this.count * Math.PI * 2, lift = ((i * 37) % 11) / 10 - .5, speed = (.55 + (i % 5) * .13) * intensity;
      this.velocities[i].set(Math.cos(angle) * speed, Math.sin(angle) * speed, lift * .7 * intensity);
      const o = i * 3; this.positions[o] = point.x; this.positions[o + 1] = point.y; this.positions[o + 2] = point.z;
    }
    this.attribute.needsUpdate = true;
  }
  update(dt) {
    if (this.life <= 0) return;
    const seconds = Math.min(.05, Math.max(0, dt) / 1000); this.life = Math.max(0, this.life - seconds * 1.9);
    for (let i = 0; i < this.count; i++) {
      const o = i * 3, v = this.velocities[i]; this.positions[o] += v.x * seconds; this.positions[o + 1] += v.y * seconds; this.positions[o + 2] += v.z * seconds; v.multiplyScalar(.94);
    }
    this.material.opacity = this.life * .9; this.attribute.needsUpdate = true; if (!this.life) this.points.visible = false;
  }
  dispose() { this.points.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
}
