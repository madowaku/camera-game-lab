import { TwoSlotIdentity } from "../input/twoSlotIdentity.js";
import { W, H, clamp } from "./core.js";
export function palmCenter(points) {
  const palm = [0, 5, 9, 13, 17].map(n => points[n]);
  if (palm.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  return { x: 1 - palm.reduce((sum, p) => sum + p.x, 0) / 5, y: palm.reduce((sum, p) => sum + p.y, 0) / 5 };
}
// Input x is already mirrored. This is exactly the renderer's cover crop;
// deliberately no coordinate clamping, so cropped hands become lost.
export function palmToCourt(p, videoAspect, courtAspect = W / H) {
  const x = ((p.x - .5) * Math.max(1, videoAspect / courtAspect) + .5) * W;
  const y = ((p.y - .5) * Math.max(1, courtAspect / videoAspect) + .5) * H;
  return { ...p, x, y, present: p.present !== false && x >= 0 && x <= W && y >= 0 && y <= H };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class PalmTracker {
  constructor() { this.reset(); }
  reset() {
    this.slots = [null, null]; this.samples = []; this.frames = 0; this.firstAt = null; this.lastAt = null;
    this.identity = new TwoSlotIdentity({
      anchors: [{ x: .28 * W, y: H / 2 }, { x: .72 * W, y: H / 2 }],
      missingCost: 4,
      predictSeconds: .15,
      continuousMs: 150,
      jumpWindowMs: 100,
      jumpDistance: .25 * W,
      velocityLimit: 24,
      ambiguityMargin: .12,
      farDistance: 4,
      farPenalty: 20,
    });
  }
  update(result, now, videoAspect = W / H) {
    const candidates = (result?.landmarks ?? []).map(palmCenter).filter(Boolean).map(p => palmToCourt(p, videoAspect)).filter(p => p.present);
    this.firstAt ??= now; this.frames++; this.lastAt = now;
    const assigned = this.identity.update(candidates, now);
    const hands = assigned.map((point, side) => {
      const old = this.slots[side];
      if (!point.present) {
        if (old) old.present = false;
        return {
          x: old?.x ?? (side ? .72 : .28) * W,
          y: old?.y ?? H / 2,
          present: false,
          continuous: false,
          uncertain: point.uncertain,
        };
      }
      const age = old ? now - old.seenAt : Infinity;
      const continuous = Boolean(point.continuous && old && old.present && age < 150);
      const dt = age / 1000;
      const alpha = continuous ? 1 - Math.exp(-dt / .06) : 1;
      const slot = {
        x: old && continuous ? old.x + (point.x - old.x) * alpha : point.x,
        y: old && continuous ? old.y + (point.y - old.y) * alpha : point.y,
        rawX: point.x,
        rawY: point.y,
        vx: point.vx,
        vy: point.vy,
        seenAt: now,
        present: true,
        continuous,
      };
      this.slots[side] = slot;
      return { x: slot.x, y: slot.y, present: true, continuous };
    });
    this.samples.push({ now, hands }); this.samples = this.samples.filter(s => now - s.now < 500).slice(-20);
    return hands;
  }
  sample(now) {
    const latest = this.samples.at(-1);
    if (!latest || now - latest.now > 100) return [0, 1].map(side => ({ x: this.slots[side]?.x ?? (side ? .72 : .28) * W, y: this.slots[side]?.y ?? H / 2, present: false, continuous: false }));
    // Short delayed interpolation uses two observed, reliable inference points,
    // never an extrapolation through a missing or discontinuous segment.
    const at = now - 40;
    const upperIndex = this.samples.findIndex(s => s.now >= at);
    const upper = upperIndex >= 0 ? this.samples[upperIndex] : latest, lower = this.samples[upperIndex >= 0 ? Math.max(0, upperIndex - 1) : Math.max(0, this.samples.length - 2)] ?? upper;
    return latest.hands.map((last, side) => {
      const a = lower.hands[side], b = upper.hands[side];
      if (!last.present || !a.present || !b.present || !b.continuous || upper.now === lower.now) return { ...last, continuous: false };
      const t = clamp((at - lower.now) / (upper.now - lower.now), 0, 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, present: true, continuous: true };
    });
  }
  get fps() { return this.lastAt > this.firstAt ? (this.frames - 1) * 1000 / (this.lastAt - this.firstAt) : 0; }
}
