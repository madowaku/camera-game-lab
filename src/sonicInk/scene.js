import * as THREE from 'three';
import { createThreeVisualLayer } from '../visual3d/createThreeVisualLayer.js';
import { createGlowStroke } from '../visual3d/objects/glowStroke.js';
import { ImpactBurst } from '../visual3d/effects/impactBurst.js';
import { ParticleTrail } from '../visual3d/effects/particleTrail.js';
import { INKS, sampleStroke, noteAt } from './core.js';

export class SonicInkScene {
  constructor(host, onError) {
    this.visual = createThreeVisualLayer({ host, depthRange: 1.4, className: 'si-three', onError });
    this.objects = new Map(); this.flashes = new Map(); this.lastBuild = 0; this.size = ''; this.dirty = false; this.lastTrail = 0;
    this.unsubscribeQuality = this.visual.onQualityChange(() => { this.dirty = true; });
    this.group = new THREE.Group(); this.visual.scene.add(this.group);
    this.visual.scene.add(new THREE.HemisphereLight(0xffffff, 0x9c658e, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-2, 4, 6); this.visual.scene.add(light);
    this.cursor = new THREE.Mesh(new THREE.SphereGeometry(.038, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(.067, .006, 6, 24), new THREE.MeshBasicMaterial({ color: INKS[0], transparent: true, opacity: .85, depthTest: false }));
    this.group.add(this.cursor, this.ring); this.burst = new ImpactBurst(this.group, { count: this.visual.quality.trailLength });
    this.trail = new ParticleTrail(this.group, { maxPoints: 36, color: INKS[0], size: .025 });
  }
  world(p) { return this.visual.normalizedToWorld(p, .5 - p.z); }
  sync(game, now, force = false) {
    if (this.dirty) { force = true; this.dirty = false; }
    const size = `${this.visual.camera.aspect}`;
    if (size !== this.size) { this.size = size; force = true; }
    for (const [id, object] of this.objects) if (!game.strokes.some(s => s.id === id)) { object.dispose(); this.objects.delete(id); }
    for (const s of game.strokes) {
      const old = this.objects.get(s.id);
      if (!force && old?.count === s.points.length) continue;
      if (!force && !s.complete && now - this.lastBuild < 80) continue;
      old?.dispose(); this.objects.delete(s.id);
      if (s.points.length < 2) continue;
      const object = createGlowStroke(s.points.map(p => this.world(p)), {
        segments: Math.min(this.visual.quality.id === 'low' ? 80 : 192, Math.max(16, s.points.length * 2)), glow: this.visual.quality.id !== 'low',
        colorAt: t => { const p = sampleStroke(s,t*s.length); return new THREE.Color(INKS[p.note%5]).lerp(new THREE.Color('#ffffff'), Math.min(1.5,p.speed)*.12); },
        radiusAt: t => .015 + Math.min(1.5, sampleStroke(s, t * s.length).speed) * .007,
      });
      object.count = s.points.length; this.group.add(object.group); this.objects.set(s.id, object); this.lastBuild = now;
    }
  }
  spark(p, color) { if (p && !this.visual.reducedMotion) this.burst.burst(this.world(p), { color, intensity: .65 }); }
  flash(stroke, now) { if (!this.visual.reducedMotion) this.flashes.set(stroke.id, now + 650); }
  clearEffects() { this.trail.clear(); this.burst.life = 0; this.burst.points.visible = false; this.flashes.clear(); }
  draw(game, tip, now, dt, yaw = 0) {
    this.sync(game, now); this.group.rotation.y = yaw;
    this.group.position.set(Math.sin(yaw)*.7,0,-.7+Math.cos(yaw)*.7);
    for (const [id, object] of this.objects) {
      const strength = game.paused ? 0 : Math.max(0, ((this.flashes.get(id) ?? 0) - now) / 650);
      object.group.traverse(o => { if (o.material?.isMeshPhongMaterial) { o.material.emissive.set('#ffffff'); o.material.emissiveIntensity = strength * .7; } });
      if (!strength) this.flashes.delete(id);
    }
    const head = game.cursor, p = head ?? tip;
    this.cursor.visible = this.ring.visible = !!p;
    if (p) {
      const object = head && this.objects.get(head.stroke.id);
      const position = object ? object.curve.getPointAt(Math.min(1, head.progress)) : this.world(p);
      this.cursor.position.copy(position); this.ring.position.copy(position);
      this.ring.material.color.set(INKS[(p.note ?? game.current?.points.at(-1)?.note ?? noteAt(p.y)) % 5]);
      this.cursor.scale.setScalar(head ? 1.15 : .8);
      const speed = head?.speed ?? game.current?.points.at(-1)?.speed ?? 0;
      if (!game.paused && !this.visual.reducedMotion && speed > .18 && now - this.lastTrail > 90 / (1 + speed * 2)) {
        this.trail.setBudget(Math.min(this.visual.quality.trailLength, 4 + Math.floor(speed * 16))); this.trail.setColor(INKS[(p.note ?? game.current?.points.at(-1)?.note ?? 0)%5]);
        this.trail.push(position.clone().add(new THREE.Vector3(Math.sin(now*.09)*.022, Math.cos(now*.07)*.022, .02))); this.trail.material.opacity = .6; this.lastTrail = now;
      }
    }
    if (!game.paused && now - this.lastTrail > 150) { this.trail.material.opacity = Math.max(0, this.trail.material.opacity - dt / 700); if (!this.trail.material.opacity) this.trail.clear(); }
    if (!game.paused) this.burst.update(dt);
    this.visual.render(now);
  }
  dispose() { this.unsubscribeQuality(); for (const o of this.objects.values()) o.dispose(); this.objects.clear(); this.burst.dispose(); this.trail.dispose(); this.visual.dispose(); }
}
