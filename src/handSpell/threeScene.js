import * as THREE from 'three';
import { W, H, ALL_SPELLS } from './core.js';
import { normalizePixels } from '../visual3d/projection.js';
import { ParticleTrail } from '../visual3d/effects/particleTrail.js';
import { ImpactBurst } from '../visual3d/effects/impactBurst.js';
import { MagicCircle } from '../visual3d/effects/magicCircle.js';
import { ScreenShake } from '../visual3d/effects/screenShake.js';

function spellColor(game) {
  return ALL_SPELLS.find(spell => spell.id === game.outcome)?.color ?? game.target?.color ?? '#d5ff78';
}

export class HandSpellThreeScene {
  constructor(visual) {
    this.visual = visual; this.scene = visual.scene;
    this.trail = new ParticleTrail(this.scene, { maxPoints: 40 });
    this.impact = new ImpactBurst(this.scene, { count: 28 });
    this.circle = new MagicCircle(this.scene);
    this.shake = new ScreenShake(visual.camera);
    const material = new THREE.MeshBasicMaterial({ color: 0xd5ff78, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(.085, 18, 12), material); this.orb.visible = false; this.scene.add(this.orb);
    this.projectile = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 14), material.clone()); this.projectile.visible = false; this.scene.add(this.projectile);
    this.cast = null; this.lastHand = null; this.removeQuality = visual.onQualityChange(q => this.trail.setBudget(q.trailLength));
    this.trail.setBudget(visual.quality.trailLength);
  }
  handleEvent(event, game) {
    const color = spellColor(game); this.orb.material.color.set(color); this.projectile.material.color.set(color); this.trail.setColor(color); this.circle.setColor(color);
    if (event.type === 'lock' && this.orb.visible) this.impact.burst(this.orb.position, { color, intensity: .45 });
    if (event.type === 'charge' || event.type === 'tutorial-charge') this.circle.show(this.visual.normalizedToWorld({ x: .5, y: .66 }, .1), .88);
    if (event.type === 'cast' || event.type === 'tutorial-cast') {
      const from = this.lastHand?.clone?.() ?? this.visual.normalizedToWorld({ x: .5, y: .7 }, .05);
      const to = this.visual.normalizedToWorld({ x: .5, y: .28 }, .88);
      this.cast = { elapsed: 0, duration: this.visual.reducedMotion ? 260 : 520, from, to, impacted: false, color };
      this.projectile.position.copy(from); this.projectile.visible = true;
      if (!this.visual.reducedMotion) this.shake.trigger({ duration: 170, amount: .04 });
    }
    if (event.type === 'reaction' || event.type === 'finish') this.circle.hide();
  }
  update({ game, hands = [], now = performance.now(), dt = 16, reducedMotion = false } = {}) {
    const hand = hands[0], normalized = hand ? normalizePixels(hand, W, H) : null;
    const acceptsHand = ['tutorial', 'input', 'release'].includes(game.scene) && !game.released && !game.paused;
    if (normalized && acceptsHand) {
      const point = this.visual.normalizedToWorld(normalized, .03); this.lastHand = point.clone(); this.orb.position.copy(point); this.orb.visible = true;
      if (!reducedMotion) this.trail.push(point); else this.trail.clear();
    } else this.orb.visible = false;
    const color = spellColor(game); this.orb.material.color.set(color); this.projectile.material.color.set(color); this.trail.setColor(color); this.circle.setColor(color);
    if (['charge', 'tutorial-charge', 'cast', 'tutorial-cast'].includes(game.scene)) {
      this.circle.show(this.visual.normalizedToWorld({ x: .5, y: .66 }, .1), game.scene.includes('cast') ? 1.08 : .88);
      this.circle.update(now, { reducedMotion });
    } else if (game.scene !== 'reaction') this.circle.hide();
    if (this.cast) {
      this.cast.elapsed += Math.max(0, dt); const p = Math.min(1, this.cast.elapsed / this.cast.duration), eased = 1 - (1 - p) ** 3;
      this.projectile.position.lerpVectors(this.cast.from, this.cast.to, eased); this.projectile.scale.setScalar(1 + Math.sin(p * Math.PI) * 1.7);
      if (p >= 1 && !this.cast.impacted) { this.cast.impacted = true; this.impact.burst(this.cast.to, { color: this.cast.color, intensity: reducedMotion ? .5 : 1 }); this.projectile.visible = false; }
      if (p >= 1) this.cast = null;
    }
    this.impact.update(dt); this.shake.update(dt, reducedMotion); this.visual.render(now);
  }
  dispose() {
    this.removeQuality?.(); this.trail.dispose(); this.impact.dispose(); this.circle.dispose(); this.shake.dispose();
    this.orb.removeFromParent(); this.orb.geometry.dispose(); this.orb.material.dispose();
    this.projectile.removeFromParent(); this.projectile.geometry.dispose(); this.projectile.material.dispose();
  }
}
