const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Identity is geometric; noisy handedness labels never exchange the two slots.
export class PalmTracker {
  constructor() { this.reset(); }
  reset() { this.slots = [null, null]; }
  update(result, timestamp) {
    const palms = (result.landmarks ?? []).slice(0, 2).map(points => {
      const p = [0, 5, 9, 13, 17].map(i => points[i]);
      if (p.some(v => !v || !Number.isFinite(v.x) || !Number.isFinite(v.y))) return null;
      return { x: 1 - p.reduce((s, v) => s + v.x, 0) / 5, y: p.reduce((s, v) => s + v.y, 0) / 5 };
    }).filter(Boolean);
    const cost = (p, i) => {
      const s = this.slots[i]; if (!s || timestamp - s.at > 300) return Math.abs(p.x - (i ? .73 : .27));
      const dt = Math.min(.15, (timestamp - s.at) / 1000);
      return dist(p, { x: s.x + s.vx * dt, y: s.y + s.vy * dt });
    };
    const matches = palms.length === 2 ? (cost(palms[0], 0) + cost(palms[1], 1) <= cost(palms[0], 1) + cost(palms[1], 0) ? [[0, palms[0]], [1, palms[1]]] : [[1, palms[0]], [0, palms[1]]]) : palms.length ? [[cost(palms[0], 0) <= cost(palms[0], 1) ? 0 : 1, palms[0]]] : [];
    const seen = new Set();
    for (const [i, p] of matches) {
      const old = this.slots[i], dt = old ? (timestamp - old.at) / 1000 : 0;
      const limit = v => Math.max(-3, Math.min(3, v));
      this.slots[i] = { ...p, at: timestamp, vx: dt > .008 && dt < .22 ? limit((p.x - old.x) / dt) : 0, vy: dt > .008 && dt < .22 ? limit((p.y - old.y) / dt) : 0 };
      seen.add(i);
    }
    return this.slots.map((s, slot) => ({ ...(s ?? { x: slot ? .73 : .27, y: .4 }), slot, present: seen.has(slot) }));
  }
}
export function projectPalm(hand, videoAspect, stageAspect = 9 / 16) {
  const x = .5 + (hand.x - .5) * Math.max(1, videoAspect / stageAspect);
  const y = .5 + (hand.y - .5) * Math.max(1, stageAspect / videoAspect);
  return { ...hand, x, y, present: hand.present && x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}
