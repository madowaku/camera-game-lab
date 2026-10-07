import { smoothVec2, FEEL_PRESETS } from '../inputFeel/index.js';

// Court units. Truth inputs never pass through this presentation-only follower.
export class PaddleFeel {
  constructor({ variant = 'A', ...options } = {}) {
    this.variant = variant === 'B' ? 'B' : 'A';
    this.options = { ...FEEL_PRESETS.sport, ...options }; this.reset();
  }
  reset() { this.points = [null, null]; }
  update(points, dt) {
    for (let side = 0; side < 2; side++) {
      const target = points[side], old = this.points[side];
      if (!target?.present || target.reliable === false || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
        if (old) { old.present = false; old.continuous = false; }
        continue;
      }
      const next = old ?? (this.points[side] = {});
      if (this.variant === 'A' || !old?.present || target.continuous === false) {
        next.x = target.x; next.y = target.y;
      } else if (dt > 0 && Number.isFinite(dt)) {
        smoothVec2(next, target, dt, this.options.tau, next);
        // A small fixed spatial bound keeps the visible face close to collision
        // truth even on quick swings. No velocity prediction/adaptive filter.
        const dx = next.x - target.x, dy = next.y - target.y, offset = Math.hypot(dx, dy);
        if (offset > this.options.maxOffset) {
          next.x = target.x + dx * this.options.maxOffset / offset;
          next.y = target.y + dy * this.options.maxOffset / offset;
        }
      }
      next.present = true; next.continuous = target.continuous;
    }
    return this.points;
  }
}
