import { TwoSlotIdentity } from "../input/twoSlotIdentity.js";
// Identity is geometric; noisy handedness labels never exchange the two slots.
export class PalmTracker {
  constructor() {
    this.identity = new TwoSlotIdentity({
      anchors: [{ x: .27, y: .4 }, { x: .73, y: .4 }],
      predictSeconds: .15,
      continuousMs: 220,
      velocityLimit: 3,
    });
  }
  reset() { this.identity.reset(); }
  update(result, timestamp) {
    const palms = (result.landmarks ?? []).slice(0, 2).map(points => {
      const p = [0, 5, 9, 13, 17].map(i => points[i]);
      if (p.some(v => !v || !Number.isFinite(v.x) || !Number.isFinite(v.y))) return null;
      return { x: 1 - p.reduce((s, v) => s + v.x, 0) / 5, y: p.reduce((s, v) => s + v.y, 0) / 5 };
    }).filter(Boolean);
    return this.identity.update(palms, timestamp).map((hand, slot) => ({
      ...hand,
      x: Number.isFinite(hand.x) ? hand.x : (slot ? .73 : .27),
      y: Number.isFinite(hand.y) ? hand.y : .4,
      slot,
    }));
  }
}
export function projectPalm(hand, videoAspect, stageAspect = 9 / 16) {
  const x = .5 + (hand.x - .5) * Math.max(1, videoAspect / stageAspect);
  const y = .5 + (hand.y - .5) * Math.max(1, stageAspect / videoAspect);
  return { ...hand, x, y, present: hand.present && x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}
