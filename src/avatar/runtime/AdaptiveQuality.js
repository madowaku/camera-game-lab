export const AVATAR_QUALITY = Object.freeze({
  HIGH: { face: true, pose: true, hands: true, inferenceHz: 20, maxPixelRatio: 1.5 },
  MEDIUM: { face: true, pose: true, hands: false, inferenceHz: 15, maxPixelRatio: 1 },
  LOW: { face: false, pose: true, hands: false, inferenceHz: 15, maxPixelRatio: 1 },
});
export class AdaptiveQuality {
  constructor(level = 'MEDIUM') { this.level = level in AVATAR_QUALITY ? level : 'MEDIUM'; this.reset(); }
  reset() { this.elapsed = 0; this.frames = 0; this.cooldown = 0; this.fps = 0; }
  get config() { return AVATAR_QUALITY[this.level]; }
  sample(dt) {
    if (!(dt > 0) || dt > .25) return null; // pause/visibility gaps are not slow frames
    this.cooldown = Math.max(0, this.cooldown - dt); this.elapsed += dt; this.frames++;
    if (this.elapsed < 2) return null;
    this.fps = this.frames / this.elapsed; this.elapsed = 0; this.frames = 0;
    if (this.cooldown || this.fps >= 26 || this.level === 'LOW') return null;
    this.level = this.level === 'HIGH' ? 'MEDIUM' : 'LOW'; this.cooldown = 6; return this.level;
  }
}
