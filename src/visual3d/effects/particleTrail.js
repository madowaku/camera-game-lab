import * as THREE from 'three';

export class ParticleTrail {
  constructor(scene, { maxPoints = 40, color = 0xd5ff78, size = .055 } = {}) {
    this.maxPoints = maxPoints; this.visiblePoints = maxPoints; this.cursor = 0; this.count = 0;
    this.positions = new Float32Array(maxPoints * 3);
    this.geometry = new THREE.BufferGeometry();
    this.attribute = new THREE.BufferAttribute(this.positions, 3); this.attribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.attribute); this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({ color, size, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.points = new THREE.Points(this.geometry, this.material); this.points.frustumCulled = false; scene.add(this.points);
  }
  setColor(color) { this.material.color.set(color); }
  setBudget(count) { this.visiblePoints = Math.max(4, Math.min(this.maxPoints, count)); }
  push(point) {
    if (!point) return;
    const i = this.cursor * 3; this.positions[i] = point.x; this.positions[i + 1] = point.y; this.positions[i + 2] = point.z;
    this.cursor = (this.cursor + 1) % this.maxPoints; this.count = Math.min(this.count + 1, this.maxPoints);
    if (this.count === this.maxPoints && this.cursor) {
      const copy = this.positions.slice();
      let dst = 0;
      for (let n = 0; n < this.maxPoints; n++) {
        const src = ((this.cursor + n) % this.maxPoints) * 3;
        this.positions[dst++] = copy[src]; this.positions[dst++] = copy[src + 1]; this.positions[dst++] = copy[src + 2];
      }
      this.cursor = 0;
    }
    const visible = Math.min(this.count, this.visiblePoints);
    if (this.count > visible) this.positions.copyWithin(0, (this.count - visible) * 3, this.count * 3);
    this.count = visible; this.cursor = this.count % this.maxPoints;
    this.attribute.needsUpdate = true; this.geometry.setDrawRange(0, this.count);
  }
  clear() { this.count = 0; this.cursor = 0; this.geometry.setDrawRange(0, 0); }
  dispose() { this.points.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
}
