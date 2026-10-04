export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const good = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= .5 && (p.presence ?? 1) >= .5;
const distance = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y, ((a.z ?? 0) - (b.z ?? 0)) * aspect);
const screenDistance = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
export function readBoxingPose(landmarks, at, aspect = 9 / 16) {
  const get = i => good(landmarks?.[i]) ? { x: 1 - landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z ?? 0 } : null;
  const nose = get(0), shoulders = [get(11), get(12)];
  if (!nose || shoulders.some(p => !p)) return null;
  const arms = shoulders.map((shoulder, i) => ({ shoulder, elbow: get(13 + i), wrist: get(15 + i) }));
  const width = screenDistance(...shoulders, aspect);
  if (width < .025) return null;
  const a = get(7), b = get(8), eyeLeft = get(2), eyeRight = get(5);
  const faceHalf = Math.max(.05, a && b ? Math.abs(a.x - b.x) * .6 : Math.abs(shoulders[0].x - shoulders[1].x) * .23);
  const face = { left: 1 - nose.x - faceHalf, right: 1 - nose.x + faceHalf, top: nose.y - faceHalf * aspect * 1.1,
    bottom: nose.y + faceHalf * aspect * 1.5,
    eyeLeft: eyeLeft && { ...eyeLeft, x: 1 - eyeLeft.x }, eyeRight: eyeRight && { ...eyeRight, x: 1 - eyeRight.x } };
  return { nose, arms, width, aspect, at, face };
}
export function boxingFraming(pose) {
  if (!pose) return 'frame';
  const sx = Math.max(1, pose.aspect / (9 / 16)), sy = Math.max(1, (9 / 16) / pose.aspect);
  const project = p => ({ x: .5 + (p.x - .5) * sx, y: .5 + (p.y - .5) * sy });
  const nose = project(pose.nose), [a, b] = pose.arms.map(a => project(a.shoulder));
  const width = Math.abs(a.x - b.x);
  if (width > .56 || (pose.face.right - pose.face.left) * sx > .31) return 'back';
  if (width < .14) return 'closer';
  if (nose.x < .15 || nose.x > .85 || nose.y < .12 || nose.y > .57) return 'frame';
  if (pose.arms.some(a => !a.elbow || !a.wrist || Object.values(a).some(p => { const q = project(p); return q.x < .015 || q.x > .985 || q.y < .05 || q.y > .98; }))) return 'hands';
  return 'ready';
}
// Units are shoulder widths and shoulder widths / second. Z movement is
// included so a straight punch toward the front camera need not move sideways.
export class BoxingMotion {
  constructor() { this.reset(); }
  reset() { this.baseline = null; this.previous = null; this.armed = [true, true]; this.lastPunch = -Infinity; }
  clearVelocity() { this.previous = null; this.armed = [false, false]; }
  calibrate(pose) {
    if (boxingFraming(pose) !== 'ready') return false;
    this.baseline = { x: pose.nose.x, width: Math.abs(pose.arms[0].shoulder.x - pose.arms[1].shoulder.x),
      reaches: pose.arms.map(a => distance(a.shoulder, a.wrist, pose.aspect) / pose.width) };
    this.previous = null; this.armed = [true, true]; return true;
  }
  sample(pose, { specialReady = false } = {}) {
    if (!pose || !this.baseline) { this.previous = null; return { tracked: false, head: 0, guard: false, charging: false, punch: null }; }
    const head = (pose.nose.x - this.baseline.x) / this.baseline.width;
    const hands = pose.arms.every(a => a.elbow && a.wrist);
    const guard = hands && pose.arms.every(a => screenDistance(a.wrist, pose.nose, pose.aspect) / pose.width < .8);
    let punch = null, retracted = false;
    const dt = this.previous ? (pose.at - this.previous.at) / 1000 : 0;
    pose.arms.forEach((arm, i) => {
      if (!arm.wrist || !arm.elbow) { this.armed[i] = false; return; }
      const reach = distance(arm.shoulder, arm.wrist, pose.aspect) / pose.width, base = this.baseline.reaches[i];
      if (reach < base + .12) { this.armed[i] = true; retracted = true; }
      const last = this.previous?.arms[i];
      // Subtract shoulder motion: a lateral dodge must not become a punch.
      const relative = a => ({ x: a.wrist.x - a.shoulder.x, y: a.wrist.y - a.shoulder.y, z: a.wrist.z - a.shoulder.z });
      const speed = last?.wrist && dt >= .025 && dt <= .2 ? distance(relative(arm), relative(last), pose.aspect) / pose.width / dt : 0;
      const growing = last?.wrist && reach - distance(last.shoulder, last.wrist, pose.aspect) / this.previous.width > .07;
      if (this.armed[i] && (specialReady || pose.at - this.lastPunch >= 650) && reach > base + .22 && speed > 1.1 && growing) {
        this.armed[i] = false; this.lastPunch = pose.at; punch = { strength: clamp(speed / 5, .15, 1), side: i };
      }
    });
    this.previous = pose;
    return { tracked: true, hands, head, guard, charging: hands && retracted && !punch, punch, framing: boxingFraming(pose) };
  }
}
