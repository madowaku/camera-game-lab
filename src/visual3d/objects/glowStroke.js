import * as THREE from 'three';
import { disposeObject3D } from '../disposeScene.js';

// Reusable spline/tube primitive. The caller owns input coordinates and sound.
export function createGlowStroke(points, { colorAt = () => '#ff9bc8', radiusAt = () => .018, segments = 160, glow = true } = {}) {
  if (points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  segments = Math.max(8, Math.min(192, segments));
  const radial = 8, radius = .018;
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const positions = geometry.attributes.position, colors = new Float32Array(positions.count * 3);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, center = curve.getPointAt(t), scale = radiusAt(t) / radius;
    const color = new THREE.Color(colorAt(t));
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      const p = new THREE.Vector3().fromBufferAttribute(positions, index).sub(center).multiplyScalar(scale).add(center);
      positions.setXYZ(index, p.x, p.y, p.z); color.toArray(colors, index * 3);
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 85, specular: 0xffffff, transparent: true, opacity: .94 });
  group.add(new THREE.Mesh(geometry, material));
  if (glow) {
    const halo = geometry.clone(), hp = halo.attributes.position;
    for (let i = 0; i <= segments; i++) {
      const center = curve.getPointAt(i / segments);
      for (let j = 0; j <= radial; j++) {
        const index = i * (radial + 1) + j;
        const p = new THREE.Vector3().fromBufferAttribute(hp, index).sub(center).multiplyScalar(2.7).add(center);
        hp.setXYZ(index, p.x, p.y, p.z);
      }
    }
    halo.computeBoundingSphere();
    group.add(new THREE.Mesh(halo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending })));
  }
  for (const t of [0, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radiusAt(t), 8, 6), new THREE.MeshPhongMaterial({ color: colorAt(t), shininess: 80 }));
    cap.position.copy(curve.getPointAt(t)); group.add(cap);
  }
  return { group, curve, dispose() { group.removeFromParent(); disposeObject3D(group); } };
}
