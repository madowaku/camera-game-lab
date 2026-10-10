// Visual-only A/B ink path. Never feed points from this module back into scoring.
import { exponentialSmooth, smoothVec2 } from '../inputFeel/index.js';

export const MARU_VISUAL_PRESETS = Object.freeze({
  A: Object.freeze({ tau: .028 }),
  B: Object.freeze({ minCutoffHz: 1.7, beta: .006, derivativeCutoffHz: 1.8, maxOffsetPx: 16 }),
});
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);

export class MaruVisualFeel {
  constructor(variant = 'A', options = {}) {
    if (variant !== 'A' && variant !== 'B') throw new RangeError('unknown MARU visual variant');
    this.variant = variant;
    this.options = { ...MARU_VISUAL_PRESETS[variant], ...options };
    this.reset();
  }
  reset(point = null, atMs = null) {
    this.position = valid(point) ? { x: point.x, y: point.y } : null;
    this.atMs = Number.isFinite(atMs) ? atMs : null;
    this.derivative = { x: 0, y: 0 };
    return this.position ? { ...this.position } : null;
  }
  update(point, atMs) {
    if (!valid(point) || !Number.isFinite(atMs)) return null;
    if (!this.position || this.atMs === null) return this.reset(point, atMs);
    if (atMs <= this.atMs) return { ...this.position };
    // Existing game clamped input-frame dt into this interval. Both variants use it.
    const dt = Math.min(.15, Math.max(.001, (atMs - this.atMs) / 1000));
    const prev = this.position;
    let next;
    if (this.variant === 'A') next = smoothVec2(prev, point, dt, this.options.tau);
    else {
      const { minCutoffHz, beta, derivativeCutoffHz, maxOffsetPx } = this.options;
      if (![minCutoffHz, beta, derivativeCutoffHz, maxOffsetPx].every(Number.isFinite) ||
          minCutoffHz <= 0 || derivativeCutoffHz <= 0 || beta < 0 || maxOffsetPx <= 0)
        throw new RangeError('invalid visual filter parameters');
      const derivativeTau = 1 / (2 * Math.PI * derivativeCutoffHz);
      const dx = exponentialSmooth(this.derivative.x, (point.x - prev.x) / dt, dt, derivativeTau);
      const dy = exponentialSmooth(this.derivative.y, (point.y - prev.y) / dt, dt, derivativeTau);
      this.derivative = { x: dx, y: dy };
      const cutoff = minCutoffHz + beta * Math.hypot(dx, dy);
      next = smoothVec2(prev, point, dt, 1 / (2 * Math.PI * cutoff));
      const offset = Math.hypot(next.x - point.x, next.y - point.y);
      if (offset > maxOffsetPx) {
        const fraction = maxOffsetPx / offset;
        next = { x: point.x + (next.x - point.x) * fraction, y: point.y + (next.y - point.y) * fraction };
      }
    }
    this.atMs = atMs;
    this.position = next;
    return { ...next };
  }
}
export function createMaruVisualFeel(variant = 'A', options) {
  return new MaruVisualFeel(variant, options);
}
