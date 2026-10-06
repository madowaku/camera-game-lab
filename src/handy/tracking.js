import { TwoSlotIdentity } from "../input/twoSlotIdentity.js";
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Match identity before smoothing. In particular, a missing hand never lends
// its character to the other hand, and screen order does not change on crossing.
export class TwoHandTracker {
  constructor() {
    this.identity = new TwoSlotIdentity({
      anchors: [{ x: .28, y: .7 }, { x: .72, y: .7 }],
      labelPenalty: 1.5,
      continuousMs: 300,
      predictSeconds: .2,
      velocityLimit: 3,
    });
  }
  reset() { this.identity.reset(); }
  update(result, now) {
    const candidates = (result?.landmarks ?? []).slice(0, 2).map((points, i) => {
      const palm = [0, 5, 9, 13, 17].map(n => points[n]);
      if (palm.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
      const x = 1 - palm.reduce((sum, p) => sum + p.x, 0) / 5;
      const y = palm.reduce((sum, p) => sum + p.y, 0) / 5;
      const wrist = points[0], span = Math.max(.025, distance(points[5], points[17]));
      const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]];
      const open = fingers.filter(([tip, joint]) => points[tip] && points[joint] && distance(points[tip], wrist) > distance(points[joint], wrist) + span * .2).length >= 3;
      const handedness = result.handedness?.[i]?.[0];
      return { x, y, open, angle: Math.atan2(points[9].x - wrist.x, wrist.y - points[9].y), label: handedness?.score >= .6 ? handedness.categoryName : null };
    }).filter(Boolean);
    return this.identity.update(candidates, now).map((slot, i) => ({
      ...slot,
      x: Number.isFinite(slot.x) ? slot.x : (i ? .72 : .28),
      y: Number.isFinite(slot.y) ? slot.y : .7,
    }));
  }
}

// Same cover crop as the renderer, after horizontal mirroring. Do not count
// hands that are detected in the part of a landscape camera frame cropped off.
export function handToStage(hand, videoAspect, stageAspect = .8) {
  const xScale = Math.max(1, videoAspect / stageAspect);
  const yScale = Math.max(1, stageAspect / videoAspect);
  const x = (hand.x - .5) * xScale + .5, y = (hand.y - .5) * yScale + .5;
  return { ...hand, x: clamp(x, .04, .96), y: clamp(y, .26, .9), present: hand.present && x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}
