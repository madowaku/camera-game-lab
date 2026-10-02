import { WATERMELON_RULES } from './watermelonRules.js';

// Use a short motion window so a 60 fps camera does not need 5.5% travel
// in a single frame. Score where the hand crosses the target's height.
export class SwingTracker {
  reset() { this.samples = []; this.target = null; }
  constructor() { this.reset(); }
  update(point, timestamp, target) {
    if (!point || !target || !Number.isFinite(timestamp) ||
        !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      this.reset();
      return null;
    }
    const last = this.samples.at(-1);
    if (target !== this.target || (last && (timestamp <= last.t || timestamp - last.t > 220))) this.reset();
    this.target = target;
    const previous = this.samples.at(-1);
    this.samples = this.samples.filter(sample => timestamp - sample.t <= 140);
    this.samples.push({ ...point, t: timestamp });
    if (!previous || previous.y >= target.y || point.y < target.y) return null;
    const first = this.samples[0];
    const dy = point.y - first.y;
    const elapsed = timestamp - first.t;
    if (elapsed <= 0 || dy < WATERMELON_RULES.swingMinTravel ||
        dy / (elapsed / 1000) < WATERMELON_RULES.swingMinSpeed ||
        Math.abs(point.x - first.x) >= 0.28) return null;
    const fraction = (target.y - previous.y) / (point.y - previous.y);
    return { x: previous.x + (point.x - previous.x) * fraction, y: target.y };
  }
}
