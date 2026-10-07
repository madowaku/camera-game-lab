import { ObjectPool } from '../objects/ObjectPool.js';
import { STANDARD } from '../performance/PerformanceTier.js';

export class GameFX {
  constructor(scene, { reducedMotion = false } = {}) {
    this.scene = scene; this.reducedMotion = reducedMotion; this.pool = new ObjectPool(); this.live = new Set();
    this.pool.register('spark', { max: STANDARD.maxParticles, create: () => scene.add.circle(0, 0, 3, 0xffcf3f).setDepth(20),
      reset: (o, x, y, color) => o.setPosition(x, y).setFillStyle(color).setAlpha(1).setScale(1).setActive(true).setVisible(true) });
    this.pool.register('text', { max: STANDARD.maxPopups, create: () => scene.add.text(0, 0, '', { fontFamily: 'Arial, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#243c33', stroke: '#fffaf0', strokeThickness: 4 }).setOrigin(.5).setDepth(30),
      reset: (o, x, y, text) => o.setPosition(x, y).setText(text).setAlpha(1).setScale(1).setActive(true).setVisible(true) });
    this.pool.register('ring', { max: 12, create: () => scene.add.circle(0, 0, 12).setStrokeStyle(3, 0xffcf3f).setDepth(19),
      reset: (o, x, y) => o.setPosition(x, y).setAlpha(1).setScale(1).setActive(true).setVisible(true) });
    this.lastTrailAt = -Infinity;
  }
  animate(object, config) {
    if (!object) return;
    this.live.add(object);
    this.scene.tweens.add({ targets: object, ...config, onComplete: () => { this.live.delete(object); this.pool.release(object); } });
  }
  hit(x, y, { count = 8, color = 0xffcf3f } = {}) {
    if (this.reducedMotion) return;
    this.animate(this.pool.acquire('ring', x, y), { scale: 3, alpha: 0, duration: 230 });
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      this.animate(this.pool.acquire('spark', x, y, color), { x: x + Math.cos(angle) * 42, y: y + Math.sin(angle) * 42, alpha: 0, scale: .3, duration: 300 });
    }
  }
  score(x, y, amount) { this.animate(this.pool.acquire('text', x, y, `+${amount}`), { y: y - (this.reducedMotion ? 0 : 35), alpha: 0, duration: 600 }); }
  combo(x, y, count) { this.animate(this.pool.acquire('text', x, y, count >= 10 ? `FEVER! ×${count}` : `NICE! ×${count}`), { scale: this.reducedMotion ? 1 : 1.2, alpha: 0, duration: 800 }); }
  shake(size = 'small') { if (!this.reducedMotion) this.scene.cameras.main.shake(100, { small: .002, medium: .004, big: .008 }[size] ?? .002); }
  flash() { if (!this.reducedMotion) this.scene.cameras.main.flash(90, 255, 249, 220); }
  bigHit(x, y) { this.hit(x, y, { count: 16 }); this.shake('medium'); this.flash(); }
  confetti(x, y) { this.hit(x, y, { count: 24, color: 0x2c9b7a }); }
  explode(x, y) { this.bigHit(x, y); }
  trail(object, color = 0xffcf3f) {
    if (this.reducedMotion || !object || this.scene.time.now - this.lastTrailAt < 35) return;
    this.lastTrailAt = this.scene.time.now;
    const spark = this.pool.acquire('spark', object.x, object.y, color);
    this.animate(spark, { alpha: 0, scale: .2, duration: 220 });
  }
  impact(target, { preset = 'normal', score } = {}) {
    this.hit(target.x, target.y, { count: preset === 'soft' ? 3 : 8 });
    if (preset !== 'soft') this.shake();
    if (preset === 'juicy') { this.flash(); this.hitStop(55); }
    if (score != null) this.score(target.x, target.y, score);
  }
  // FX clocks keep running so they can restore physics after a hit stop.
  hitStop(ms = 55) {
    if (this.reducedMotion) return;
    this.restoreTimer?.remove();
    this.wasPhysicsPaused ??= this.scene.physics.world.isPaused;
    this.scene.physics.world.pause();
    this.restoreTimer = this.scene.time.delayedCall(ms, () => {
      if (!this.wasPhysicsPaused) this.scene.physics.world.resume();
      this.wasPhysicsPaused = undefined; this.restoreTimer = null;
    });
  }
  slowMotion(ms = 120, scale = .45) {
    if (this.reducedMotion) return;
    this.slowTimer?.remove(); this.slowScale ??= this.scene.physics.world.timeScale;
    this.scene.physics.world.timeScale = Math.max(.1, Math.min(1, scale));
    this.slowTimer = this.scene.time.delayedCall(ms, () => {
      this.scene.physics.world.timeScale = this.slowScale; this.slowScale = undefined; this.slowTimer = null;
    });
  }
  destroy() {
    this.restoreTimer?.remove();
    this.slowTimer?.remove();
    if (this.wasPhysicsPaused === false) this.scene.physics.world.resume();
    if (this.slowScale != null) this.scene.physics.world.timeScale = this.slowScale;
    for (const object of this.live) this.scene.tweens.killTweensOf(object);
    this.live.clear(); this.pool.destroy();
  }
}
