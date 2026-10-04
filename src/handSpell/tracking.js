const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
function straight(a, b, c) {
  const u = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)], v = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
  return -(u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
}
// Joint angles and tip-to-knuckle ratios survive mirrored, rotated and sideways hands.
export function classifyHand(landmarks, world = null) {
  if (landmarks?.length !== 21 || landmarks.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z ?? 0))) return { sign: null, confidence: 0, reason: 'missing' };
  const p = world?.length === 21 && world.every(p => p && [p.x, p.y, p.z].every(Number.isFinite)) ? world : landmarks;
  const scores = [5, 9, 13, 17].map(i => {
    const extension = straight(p[i], p[i + 1], p[i + 3]);
    const ratio = distance(p[i + 3], p[0]) / Math.max(.0001, distance(p[i + 1], p[0]));
    return { open: extension > .68 && ratio > 1.14, closed: extension < .48 || ratio < 1.02 };
  });
  if (scores.some(f => !f.open && !f.closed)) return { sign: null, confidence: .35, reason: 'angle' };
  const mask = scores.map(f => +f.open).join('');
  const thumbOpen = straight(p[1], p[2], p[4]) > .6 && distance(p[4], p[9]) > distance(p[2], p[9]) * 1.14;
  const sign = { '0000': 'FIST', '1111': 'PALM', '1000': 'ONE', '1100': 'TWO', '1110': 'THREE' }[mask] ?? (mask === '1001' && thumbOpen ? 'THREE' : null);
  const span = distance(landmarks[0], landmarks[9]);
  if (span < .035) return { sign: null, confidence: .25, reason: 'small' };
  return { sign, confidence: sign ? .9 : .3, reason: sign ? 'ready' : 'shape', span };
}

export class SignGate {
  constructor() { this.reset(); }
  reset(blocked = null) { this.blocked = blocked; this.candidate = null; this.since = null; this.neutralAt = null; this.lastAccepted = -Infinity; this.lastFrame = -Infinity; this.progress = 0; }
  feed(hand, now) {
    if (!hand || now - hand.at > 200) { this.candidate = null; this.since = null; this.progress = 0; return null; }
    if (hand.at <= this.lastFrame) return null;
    this.lastFrame = hand.at;
    const sign = hand.sign;
    if (!sign || hand.confidence < .7) {
      this.neutralAt ??= now; if (now - this.neutralAt >= 120) this.blocked = null;
      this.candidate = null; this.since = null; this.progress = 0; return null;
    }
    this.neutralAt = null;
    if (sign === this.blocked || now - this.lastAccepted < 400) { this.progress = 0; return null; }
    if (this.candidate !== sign || this.handId !== hand.id) { this.candidate = sign; this.handId = hand.id; this.since = now; }
    this.progress = Math.min(1, (now - this.since) / 180);
    if (this.progress < 1) return null;
    this.blocked = sign; this.lastAccepted = now; this.candidate = null; this.since = null; this.progress = 0; return sign;
  }
}

export class ReleaseGate {
  reset() { this.baseline = null; this.since = null; this.movedAt = null; this.fired = false; this.lastFrame = -Infinity; }
  constructor() { this.reset(); }
  feed(hands, now, enabled) {
    if (!enabled || hands.length !== 2 || hands.some(h => h.sign !== 'PALM' || now - h.at > 200 || !Number.isFinite(h.span) || h.span <= 0) || hands[0].id === hands[1].id) { this.baseline = null; this.since = null; this.movedAt = null; return false; }
    if (this.fired || Math.min(...hands.map(h => h.at)) <= this.lastFrame) return false;
    this.lastFrame = Math.min(...hands.map(h => h.at));
    if (!this.baseline) { this.since ??= now; if (now - this.since >= 120) this.baseline = new Map(hands.map(h => [h.id, h.span])); return false; }
    const bothMoved = hands.every(h => h.span / (this.baseline.get(h.id) ?? Infinity) >= 1.16);
    if (!bothMoved) { this.movedAt = null; return false; }
    this.movedAt ??= now;
    if (now - this.movedAt < 100) return false;
    this.fired = true; return true;
  }
}
