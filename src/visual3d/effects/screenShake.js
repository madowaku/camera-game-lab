export class ScreenShake {
  constructor(camera) { this.camera = camera; this.base = camera.position.clone(); this.life = 0; this.duration = 1; this.amount = 0; this.elapsed = 0; }
  trigger({ duration = 180, amount = .045 } = {}) { this.duration = Math.max(1, duration); this.life = 1; this.elapsed = 0; this.amount = amount; }
  update(dt, reducedMotion = false) {
    if (this.life <= 0 || reducedMotion) { this.camera.position.copy(this.base); this.life = 0; return; }
    this.elapsed += Math.max(0, dt); this.life = Math.max(0, 1 - this.elapsed / this.duration);
    const envelope = this.life * this.life;
    this.camera.position.set(this.base.x + Math.sin(this.elapsed * .12) * this.amount * envelope, this.base.y + Math.cos(this.elapsed * .17) * this.amount * envelope, this.base.z);
    if (!this.life) this.camera.position.copy(this.base);
  }
  dispose() { this.camera.position.copy(this.base); this.life = 0; }
}
