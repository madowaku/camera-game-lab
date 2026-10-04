import { W, H, clamp, normalizeAngle, signedAngle } from './core.js';
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
const visible = p => valid(p) && (p.visibility ?? 1) >= .5 && (p.presence ?? 1) >= .5;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function videoRect(aspect = W / H) {
  const width = Math.min(W, H * aspect), height = width / aspect;
  return { x: (W - width) / 2, y: (H - height) / 2, width, height };
}
export function projectPoint(p, aspect) {
  const r = videoRect(aspect); return { x: r.x + (1 - p.x) * r.width, y: r.y + p.y * r.height };
}
export const vectorAngle = (center, tip) => normalizeAngle(Math.atan2(tip.y - center.y, tip.x - center.x) * 180 / Math.PI);
export function clockCenter(pose, aspect) {
  if (![0,11,12].every(i => visible(pose?.[i]))) return null;
  const left = projectPoint(pose[11], aspect), right = projectPoint(pose[12], aspect), nose = projectPoint(pose[0], aspect);
  const span = distance(left, right);
  if (span < W * .12 || span > W * .85) return null;
  const center = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 - span * .28 };
  if (center.x < W * .18 || center.x > W * .82 || center.y < H * .28 || center.y > H * .72 || nose.y > center.y + span * .25) return null;
  return { ...center, span, nose, shoulders: [left, right] };
}
// Ownership comes from anatomical Pose wrists, never a hand's screen-side or
// its order in the result. This remains true when the player crosses their arms.
export function assignHands(handResult, pose, aspect) {
  const wrists = [15,16].map(i => visible(pose?.[i]) ? projectPoint(pose[i], aspect) : null);
  const candidates = (handResult?.landmarks ?? []).filter(p => p?.length === 21 && [0,5,6,7,8].every(i => valid(p[i]))).map(p => {
    const joints = [5,6,7,8].map(i => projectPoint(p[i], aspect)), base = joints[0], tip = joints[3];
    const path = joints.slice(1).reduce((sum, joint, i) => sum + distance(joints[i], joint), 0);
    // Bent or end-on fingers have no reliable projected direction.
    const pointing = distance(base, tip) >= 14 && path > 0 && distance(base, tip) / path >= .84;
    return { wrist: projectPoint(p[0], aspect), base, tip, pointing };
  });
  const assignments = [];
  for (let a = -1; a < candidates.length; a++) for (let b = -1; b < candidates.length; b++) {
    if (a >= 0 && a === b) continue;
    const pair = [a,b]; let cost = 0;
    for (let side = 0; side < 2; side++) {
      const c = candidates[pair[side]], wrist = wrists[side];
      cost += !c ? 180 : !wrist ? 10000 : distance(c.wrist, wrist);
    }
    assignments.push({ pair, cost });
  }
  assignments.sort((a,b) => a.cost - b.cost);
  const best = assignments[0], ambiguous = best && assignments[1] && assignments[1].cost - best.cost < 12 && best.pair.some(i => i >= 0);
  return [0,1].map(side => {
    const c = candidates[best?.pair[side]];
    return !ambiguous && c && wrists[side] && distance(c.wrist, wrists[side]) < H * .17 ? { ...c.tip, base: c.base, wrist: c.wrist, pointing: c.pointing } : null;
  });
}
export class ClockTracker {
  constructor() { this.reset(); }
  reset() { this.previous = null; this.lastAt = null; }
  update(result, at, aspect) {
    const pose = result?.pose?.landmarks?.[0], rawCenter = clockCenter(pose, aspect);
    const gap = this.lastAt == null || at - this.lastAt > 150 || at < this.lastAt; this.lastAt = at;
    const old = gap ? null : this.previous;
    if (!rawCenter) { this.previous = null; return { at, center: null, hands: { hour: null, minute: null }, ready: false, hint: 'frame', continuous: false }; }
    const alpha = old ? .62 : 1;
    const center = { ...rawCenter, x: old?.center ? old.center.x + (rawCenter.x - old.center.x) * alpha : rawCenter.x, y: old?.center ? old.center.y + (rawCenter.y - old.center.y) * alpha : rawCenter.y };
    const tips = assignHands(result.hand, pose, aspect), hands = {};
    ['hour','minute'].forEach((side, i) => {
      const tip = tips[i], previous = old?.hands?.[side];
      if (!tip?.pointing) { hands[side] = null; return; }
      const rawAngle = vectorAngle(tip.base, tip), angle = previous?.present ? normalizeAngle(previous.angle + signedAngle(previous.angle, rawAngle) * .7) : rawAngle;
      hands[side] = { ...tip, angle, rawAngle, present: true };
    });
    const ready = !!hands.hour?.present && !!hands.minute?.present;
    const sample = { at, center, hands, ready, hint: !hands.hour ? 'leftMissing' : !hands.minute ? 'rightMissing' : 'ready', continuous: ready && !!old?.ready };
    this.previous = sample; return sample;
  }
}
export function demoSample(hour = 215, minute = 325) {
  const center = { x: W / 2, y: H * .56, span: 180 };
  const hand = (angle, radius) => {
    const dx = Math.cos(angle * Math.PI / 180), dy = Math.sin(angle * Math.PI / 180), x = center.x + dx * radius, y = center.y + dy * radius;
    return { x, y, base: { x: x - dx * (radius === 175 ? 62 : 86), y: y - dy * (radius === 175 ? 62 : 86) }, angle: normalizeAngle(angle), rawAngle: normalizeAngle(angle), pointing: true, present: true };
  };
  return { center, hands: { hour: hand(hour, 175), minute: hand(minute, 250) }, ready: true, continuous: true, hint: 'ready' };
}
