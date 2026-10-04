import * as THREE from 'three';

export class MagicCircle {
  constructor(scene, { color = 0xd5ff78 } = {}) {
    this.group = new THREE.Group(); this.group.visible = false; this.materials = [];
    for (const [inner, outer, z, opacity] of [[.72, .76, 0, .78], [.98, 1.01, -.012, .55], [1.2, 1.225, -.025, .32]]) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), material); mesh.position.z = z; this.group.add(mesh); this.materials.push(material);
    }
    const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .45, blending: THREE.AdditiveBlending });
    const vertices = [];
    for (let i = 0; i <= 6; i++) { const a = (i % 6) * Math.PI / 3; vertices.push(Math.cos(a) * .87, Math.sin(a) * .87, .01); }
    const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)), lineMaterial);
    this.group.add(line); this.materials.push(lineMaterial); scene.add(this.group);
  }
  setColor(color) { this.materials.forEach(material => material.color.set(color)); }
  show(point, scale = 1) { this.group.position.copy(point); this.group.scale.setScalar(scale); this.group.visible = true; }
  hide() { this.group.visible = false; }
  update(now, { reducedMotion = false } = {}) {
    if (!this.group.visible) return;
    const t = now / 1000; this.group.rotation.z = reducedMotion ? 0 : t * .55;
    if (this.group.children[1]) this.group.children[1].rotation.z = reducedMotion ? 0 : -t * .9;
  }
  dispose() {
    this.group.removeFromParent();
    this.group.traverse(object => object.geometry?.dispose?.());
    this.materials.forEach(material => material.dispose());
  }
}
