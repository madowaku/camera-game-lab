const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Match identity before smoothing. In particular, a missing hand never lends
// its character to the other hand, and screen order does not change on crossing.
export class TwoHandTracker {
  constructor() { this.reset(); }
  reset() { this.slots = [null, null]; }
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
    const cost = (candidate, slot, i) => {
      if (!slot) return Math.abs(candidate.x - (i === 0 ? .28 : .72));
      const age = clamp((now - slot.seenAt) / 1000, 0, .2);
      const predicted = { x: slot.x + slot.vx * age, y: slot.y + slot.vy * age };
      return distance(candidate, predicted) + (slot.label && candidate.label && slot.label !== candidate.label ? 1.5 : 0);
    };
    let matches = [];
    if (candidates.length === 2) {
      const straight = cost(candidates[0], this.slots[0], 0) + cost(candidates[1], this.slots[1], 1);
      const reverse = cost(candidates[1], this.slots[0], 0) + cost(candidates[0], this.slots[1], 1);
      matches = straight <= reverse ? [[0, candidates[0]], [1, candidates[1]]] : [[0, candidates[1]], [1, candidates[0]]];
    } else if (candidates.length === 1) {
      const p = candidates[0], i = cost(p, this.slots[0], 0) <= cost(p, this.slots[1], 1) ? 0 : 1;
      matches = [[i, p]];
    }
    const seen = new Set();
    for (const [i, point] of matches) {
      const old = this.slots[i], dt = Math.max(.016, (now - (old?.seenAt ?? now)) / 1000);
      this.slots[i] = { ...point, label: point.label ?? old?.label, seenAt: now,
        vx: old && dt < .3 ? clamp((point.x - old.x) / dt, -3, 3) : 0,
        vy: old && dt < .3 ? clamp((point.y - old.y) / dt, -3, 3) : 0 };
      seen.add(i);
    }
    return this.slots.map((slot, i) => slot ? { ...slot, present: seen.has(i), slot: i } : { x: i ? .72 : .28, y: .7, present: false, slot: i });
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
