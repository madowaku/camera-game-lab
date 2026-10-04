// Angles are in mirrored screen space, clockwise from the right, in pixels.
export const POSES = Object.freeze([
  { id: 'y', name: 'Y', color: '#f56850', angles: [-130, -130, -50, -50] },
  { id: 't', name: 'T', color: '#56c5b1', angles: [180, 180, 0, 0] },
  { id: 'one-up', name: 'ONE UP', color: '#f4c442', angles: [-110, -100, 0, 0] },
  { id: 'muscle', name: 'MUSCLE', color: '#659de5', angles: [180, -90, 0, -90] },
  { id: 'hero', name: 'HERO', color: '#ec87ab', angles: [-130, -130, 45, 45] },
]);
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const W = 360, H = 600;
const point = (x, y) => ({ x, y });
export function makePose(angles = [110, 90, 70, 90], { cx = .5, cy = .65, width = .22, aspect = W / H } = {}) {
  const shoulders = [point(cx - width / 2, cy), point(cx + width / 2, cy)];
  const arms = shoulders.map((shoulder, side) => {
    const reach = width * .66;
    const move = (p, angle) => point(p.x + Math.cos(angle * Math.PI / 180) * reach, p.y + Math.sin(angle * Math.PI / 180) * reach * aspect);
    const elbow = move(shoulder, angles[side * 2]), wrist = move(elbow, angles[side * 2 + 1]);
    return { shoulder, elbow, wrist };
  });
  return { nose: point(cx, cy - width * aspect * .95), arms, aspect };
}
export function coverGeometry(aspect, targetAspect = W / H) {
  return aspect > targetAspect ? { sx: aspect / targetAspect, sy: 1 } : { sx: 1, sy: targetAspect / aspect };
}
export function projectPose(pose, targetAspect = W / H) {
  if (!pose) return null;
  const { sx, sy } = coverGeometry(pose.aspect, targetAspect);
  const map = p => p ? point(.5 + (p.x - .5) * sx, .5 + (p.y - .5) * sy) : null;
  return { ...pose, aspect: targetAspect, nose: map(pose.nose), arms: pose.arms.map(a => Object.fromEntries(Object.entries(a).map(([k, p]) => [k, map(p)]))) };
}
export function targetForPlayer(pose, angles) {
  if (!pose?.arms.every(a => a.shoulder)) return makePose(angles);
  const [l, r] = pose.arms.map(a => a.shoulder);
  // Visual fit is generous. Scoring never uses this fitted geometry.
  const cx = clamp((l.x + r.x) / 2, .39, .61);
  const width = Math.min(clamp(Math.abs(r.x - l.x), .14, .245), (Math.min(cx, 1 - cx) - .025) / 1.82);
  const cy = clamp((l.y + r.y) / 2, .56, .75);
  const target = makePose(angles, { width, cx, cy });
  if (pose.nose) target.nose = { x: cx + clamp(pose.nose.x - cx, -.035, .035), y: clamp(pose.nose.y, cy - .17, cy - .055) };
  return target;
}
function segmentScore(a, b, target, aspect, tilt) {
  if (!a || !b) return 0;
  const dx = (b.x - a.x) * aspect, dy = b.y - a.y;
  if (Math.hypot(dx, dy) < .008) return 0;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI - tilt;
  const error = Math.abs(((angle - target + 540) % 360) - 180);
  return 100 * (1 - clamp((error - 12) / 85, 0, 1));
}
export function scorePose(pose, target) {
  if (!pose?.nose || !pose.arms?.every(a => a.shoulder)) return { score: 0, parts: [0, 0, 0, 0], head: 0 };
  const [l, r] = pose.arms.map(a => a.shoulder), aspect = pose.aspect;
  const width = Math.hypot((r.x - l.x) * aspect, r.y - l.y);
  if (width < .025) return { score: 0, parts: [0, 0, 0, 0], head: 0 };
  const tilt = Math.atan2(r.y - l.y, (r.x - l.x) * aspect) * 180 / Math.PI;
  const parts = pose.arms.flatMap((arm, i) => [segmentScore(arm.shoulder, arm.elbow, target.angles[i * 2], aspect, tilt), segmentScore(arm.elbow, arm.wrist, target.angles[i * 2 + 1], aspect, tilt)]);
  const headX = Math.abs((pose.nose.x - (l.x + r.x) / 2) * aspect) / width;
  const headY = ((l.y + r.y) / 2 - pose.nose.y) / width;
  const head = headY > .1 && headY < 1.8 ? 100 * (1 - clamp((headX - .15) / .55, 0, 1)) : 0;
  return { score: Math.round(parts.reduce((a, b) => a + b, 0) * .2375 + head * .05), parts, head };
}
const good = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= .5 && (p.presence ?? 1) >= .5 && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
export class PoseTracker {
  constructor() { this.reset(); }
  reset() { this.last = new Map(); }
  update(landmarks, at, aspect = W / H) {
    if (!Number.isFinite(aspect) || aspect <= 0) return null;
    const get = index => {
      const p = landmarks?.[index];
      if (good(p)) { const q = { x: 1 - p.x, y: p.y }; this.last.set(index, { q, at }); return q; }
      const saved = this.last.get(index); return saved && at - saved.at <= 150 ? saved.q : null;
    };
    const nose = get(0), arms = [11, 12].map((id, i) => ({ shoulder: get(id), elbow: get(13 + i), wrist: get(15 + i) }));
    if (!nose || arms.some(a => !a.shoulder)) return null;
    // Keep each elbow and wrist attached to its shoulder, even if arms cross.
    arms.sort((a, b) => a.shoulder.x - b.shoulder.x);
    return { nose, arms, aspect, at };
  }
}
export function framingHint(pose) {
  if (!pose) return 'frame';
  const p = projectPose(pose), width = p.arms[1].shoulder.x - p.arms[0].shoulder.x, cx = (p.arms[1].shoulder.x + p.arms[0].shoulder.x) / 2;
  if (Math.abs(p.nose.x - .5) > .11 || Math.abs(cx - .5) > .09 || p.nose.y < .42 || p.nose.y > .69) return 'frame';
  if (width > Math.min(.28, (Math.min(cx, 1 - cx) - .025) / (1.82 * .85))) return 'farther';
  if (width < .14) return 'closer';
  return 'ready';
}
