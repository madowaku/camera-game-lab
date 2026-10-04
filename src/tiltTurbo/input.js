export const DEAD_ZONE = 5;
export const MAX_TILT = 25;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Work in camera pixels, then mirror the angle just like the selfie preview.
// Positive = the player's head leans toward screen-right.
export function headRoll(points, width = 1, height = 1) {
  const eyes = [33, 133, 362, 263].map(i => points?.[i]);
  if (eyes.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return null;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const [a, b] = [mid(eyes[0], eyes[1]), mid(eyes[2], eyes[3])].sort((p, q) => p.x - q.x);
  if (Math.hypot((b.x - a.x) * width, (b.y - a.y) * height) < Math.min(width, height) * .035) return null;
  const roll = -Math.atan2((b.y - a.y) * height, (b.x - a.x) * width) * 180 / Math.PI;
  return Math.abs(roll) <= 55 ? roll : null;
}
export function steeringForRoll(roll) {
  if (!Number.isFinite(roll) || Math.abs(roll) <= DEAD_ZONE) return 0;
  return Math.sign(roll) * Math.pow(clamp((Math.abs(roll) - DEAD_ZONE) / (MAX_TILT - DEAD_ZONE), 0, 1), .85);
}
export class TiltSignal {
  constructor() { this.reset(); }
  reset() { this.neutral = null; this.samples = []; this.filtered = 0; this.lastAt = null; this.progress = 0; }
  sample(raw, at) {
    if (raw === null || !Number.isFinite(raw)) { this.samples = []; if (this.neutral === null) this.progress = 0; this.lastAt = null; return { tracked: false, roll: 0, steering: 0, ready: this.neutral !== null, progress: this.progress }; }
    const dt = this.lastAt === null ? 0 : at - this.lastAt;
    if (dt > 250 || dt < 0) this.samples = [];
    this.lastAt = at;
    if (this.neutral === null) {
      if (this.samples.some(s => Math.abs(s.raw - raw) > 4)) this.samples = [];
      this.samples.push({ raw, at });
      this.progress = Math.min(1, (at - this.samples[0].at) / 650, (this.samples.length - 1) / 5);
      if (this.progress === 1) { const sorted = this.samples.map(s => s.raw).sort((a,b) => a-b); this.neutral = sorted[Math.floor(sorted.length / 2)]; this.samples = []; }
    }
    const roll = clamp(raw - (this.neutral ?? raw), -45, 45);
    this.filtered += (roll - this.filtered) * (1 - Math.exp(-Math.max(dt, 16) / 70));
    return { tracked: true, ready: this.neutral !== null, progress: this.progress, roll: this.filtered, steering: steeringForRoll(this.filtered) };
  }
}
