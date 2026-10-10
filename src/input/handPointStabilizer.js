// Camera-only experimental position stabilization. Pixel coordinates and
// timestamps (milliseconds); independent of recognition, DOM and rendering.
// Never extrapolate or hide a missing hand behind a stale position.
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
export class HandPointStabilizer {
  constructor({ jitterPx = 3, slowTauMs = 24, fastTauMs = 8, fastAtPxPerMs = 0.6, staleMs = 180 } = {}) {
    this.config = { jitterPx, slowTauMs, fastTauMs, fastAtPxPerMs, staleMs };
    this.reset();
  }
  reset() { this.value = null; this.lastAt = null; }
  update(point, at) {
    if (!valid(point) || !Number.isFinite(at)) { this.reset(); return null; }
    const dt = this.lastAt === null ? null : at - this.lastAt;
    if (dt !== null && (dt <= 0 || dt > this.config.staleMs)) this.reset();
    if (!this.value) {
      this.value = { x: point.x, y: point.y }; this.lastAt = at;
      return { ...this.value };
    }
    const elapsed = at - this.lastAt;
    this.lastAt = at;
    const d = Math.hypot(point.x - this.value.x, point.y - this.value.y);
    if (d <= this.config.jitterPx) return { ...this.value };
    const speedRatio = Math.min(1, Math.max(0, d / elapsed / this.config.fastAtPxPerMs));
    const tau = this.config.slowTauMs + (this.config.fastTauMs - this.config.slowTauMs) * speedRatio;
    const a = tau > 0 ? 1 - Math.exp(-elapsed / tau) : 1;
    this.value = {
      x: this.value.x + (point.x - this.value.x) * a,
      y: this.value.y + (point.y - this.value.y) * a,
    };
    return { ...this.value };
  }
}
