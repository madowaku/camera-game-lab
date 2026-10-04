import * as THREE from 'three';
import { ParticleTrail } from '../visual3d/effects/particleTrail.js';
import { ImpactBurst } from '../visual3d/effects/impactBurst.js';
import { disposeObject3D } from '../visual3d/disposeScene.js';
import { projectFlightRing } from './visualLayout.js';

// A consumer of the shared visual layer, with no renderer, RAF, recognition,
// grading or quality governor of its own.
export class BodyWingsThreeScene {
  constructor(visual) {
    this.visual = visual;
    this.root = new THREE.Group(); visual.scene.add(this.root);
    this.time = null; this.disposed = false;
    this.root.add(new THREE.HemisphereLight(0xffffff, 0x3a81ad, 2.5));
    const sun = new THREE.DirectionalLight(0xfff1c6, 2.2);
    sun.position.set(-3, 5, 8); this.root.add(sun);

    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 skyUV; void main() { skyUV = uv; gl_Position = vec4(position.xy, .999, 1.0); }',
      fragmentShader: `varying vec2 skyUV;
        void main() {
          vec3 color = mix(vec3(.89,.97,.98), vec3(.07,.56,.88), smoothstep(0.,1.,skyUV.y));
          float glow = exp(-length((skyUV-vec2(.83,.88))*vec2(1.,1.5))*5.);
          color = mix(color, vec3(1.,.96,.75), glow*.5);
          gl_FragColor = vec4(color,1.);
        }`,
    }));
    sky.frustumCulled = false; sky.renderOrder = -10; this.root.add(sky);

    const cloudGeometry = new THREE.SphereGeometry(1, 12, 8);
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.clouds = Array.from({ length: 8 }, (_, i) => {
      const cloud = new THREE.Group();
      for (const [x, y, scale] of [[0,0,1],[-.8,-.1,.7],[.7,-.05,.8],[.2,.3,.7]]) {
        const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
        puff.position.set(x, y, 0); puff.scale.set(scale, scale * .48, scale * .6); cloud.add(puff);
      }
      cloud.userData.offset = i / 8; this.root.add(cloud); return cloud;
    });

    const ringGeometry = new THREE.TorusGeometry(1, .075, 10, 64);
    const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xffbb29, specular: 0xfff4c4, shininess: 70 });
    const accentMaterial = new THREE.MeshPhongMaterial({ color: 0xfff3b0, shininess: 70 });
    const markerGeometry = new THREE.BoxGeometry(.11, .20, .12);
    this.rings = Array.from({ length: 4 }, () => {
      const group = new THREE.Group(); group.add(new THREE.Mesh(ringGeometry, ringMaterial));
      for (let i = 0; i < 4; i++) {
        const marker = new THREE.Mesh(markerGeometry, accentMaterial), angle = i * Math.PI / 2;
        marker.position.set(Math.cos(angle), Math.sin(angle), .025); marker.rotation.z = angle;
        group.add(marker);
      }
      group.visible = false; this.root.add(group); return group;
    });
    this.trails = [-1, 1].map(() => new ParticleTrail(this.root, { maxPoints: 40, color: 0x64f5ff, size: .065 }));
    this.impact = new ImpactBurst(this.root, { count: 32, color: 0xffe796 });
    this.removeQuality = visual.onQualityChange(() => this.applyBudget());
    this.applyBudget();
  }

  applyBudget() {
    const { quality, reducedMotion } = this.visual;
    this.trails.forEach(trail => trail.setBudget(reducedMotion ? 4 : quality.trailLength));
    this.impact.geometry.setDrawRange(0, reducedMotion ? 8 : Math.min(32, Math.floor(quality.particles / 4)));
    this.clouds.forEach((cloud, i) => { cloud.visible = i < (quality.id === 'low' ? 4 : 8); });
  }

  handleEvent(event, game) {
    if (this.disposed || !['PERFECT', 'GOOD', 'BOOST', 'TUTORIAL_PASS', 'FINISH'].includes(event.type)) return;
    this.impact.burst(this.visual.normalizedToWorld({ x: game.x, y: .69 }, 0), {
      color: event.type === 'BOOST' ? 0x56eaff : 0xffe796,
      intensity: this.visual.reducedMotion ? .25 : event.type === 'BOOST' ? 1.5 : .8,
    });
  }

  update({ game, now = performance.now() }) {
    if (this.disposed) return false;
    const { visual } = this, reduced = visual.reducedMotion;
    const frameKey = `${game.time}:${visual.canvas?.width}:${visual.canvas?.height}:${reduced}`;
    if (game.paused && frameKey === this.frameKey) return true;
    this.frameKey = frameKey;
    const dt = this.time === null ? 0 : Math.min(50, Math.max(0, game.time - this.time));
    this.time = game.time;
    this.applyBudget();
    // ResizeObserver updates projection on rotation, including while paused.
    visual.camera.updateMatrixWorld();
    this.clouds.forEach((cloud, i) => {
      const p = (cloud.userData.offset + (reduced ? 0 : game.time / 16000)) % 1;
      const side = i % 2 ? 1 : -1;
      cloud.position.copy(visual.normalizedToWorld({ x: .5 + side * (.31 + .18 * p), y: .16 + .8 * p }, .95 * (1 - p)));
      cloud.scale.setScalar(.28 + p * .5);
    });
    const ahead = game.ringsAhead;
    this.rings.forEach((mesh, i) => {
      const ring = ahead[i]; mesh.visible = !!ring;
      if (!ring) return;
      const p = projectFlightRing(ring), center = visual.normalizedToWorld(p, p.depth);
      const edge = visual.normalizedToWorld({ x: p.x + p.radius, y: p.y }, p.depth);
      const radius = edge.x - center.x;
      mesh.position.copy(center); mesh.scale.set(radius, radius * .86, radius);
      mesh.userData.ringId = ring.id;
    });
    const flying = ['tutorial', 'playing'].includes(game.phase);
    this.trails.forEach((trail, i) => {
      if (!flying || !game.boosted || reduced) { trail.clear(); return; }
      if (!dt || game.paused) return;
      // Screen-space positions are already canonical; never mirror game.x.
      const side = i === 0 ? -1 : 1;
      const point = visual.normalizedToWorld({ x: Math.max(.02, Math.min(.98, game.x + side * .32)), y: .72 + side * game.tilt * .16 }, .02);
      // Move stored exhaust toward the viewer without affecting the game.
      for (let n = 0; n < trail.count; n++) {
        trail.positions[n * 3 + 1] -= dt * .0015;
        trail.positions[n * 3 + 2] += dt * .002;
      }
      trail.push(point);
    });
    if (!game.paused && dt > 0) this.impact.update(dt);
    return visual.render(now, { force: game.paused });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.removeQuality();
    this.trails.forEach(trail => trail.dispose()); this.impact.dispose();
    disposeObject3D(this.root); this.root.removeFromParent(); this.root.clear();
  }
}
