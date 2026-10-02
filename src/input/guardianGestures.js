const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const valid = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
  (point.visibility ?? 1) >= 0.55;

// Mirrored camera coordinates. No game rules depend on MediaPipe indices.
export function extractGuardianPose(landmarks, aspect = 1) {
  if (!landmarks || ![0, 11, 12].every((i) => valid(landmarks[i]))) return null;
  const point = (i) => valid(landmarks[i]) ? {
    x: 1 - landmarks[i].x, y: landmarks[i].y, z: landmarks[i].z ?? 0
  } : null;
  const head = point(0), leftShoulder = point(11), rightShoulder = point(12);
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  if (shoulderWidth < 0.06 || head.x < 0 || head.x > 1 || head.y < 0 || head.y > 1) return null;
  return {
    head, center: { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 },
    shoulderWidth, aspect,
    arms: [
      { side: "left", shoulder: leftShoulder, elbow: point(13), wrist: point(15) },
      { side: "right", shoulder: rightShoulder, elbow: point(14), wrist: point(16) }
    ]
  };
}

export class GuardianGestures {
  constructor() { this.reset(); }
  reset() {
    this.history = new Map();
    this.held = new Map();
    this.latched = new Set();
    this.cooldowns = new Map();
    this.lastTimestamp = null;
  }
  update(pose, timestamp) {
    if (!pose || (this.lastTimestamp !== null && timestamp - this.lastTimestamp > 500)) this.reset();
    this.lastTimestamp = timestamp;
    if (!pose) return [];
    const events = [], width = pose.shoulderWidth * pose.aspect;
    const distance = (a, b) => Math.hypot((a.x - b.x) * pose.aspect, a.y - b.y);
    const distance3D = (a, b) => Math.hypot((a.x - b.x) * pose.aspect, a.y - b.y, ((a.z ?? 0) - (b.z ?? 0)) * pose.aspect);
    const arms = pose.arms.filter((arm) => arm.elbow && arm.wrist);
    const raised = arms.length === 2 && arms.every((arm) => arm.wrist.y < pose.head.y - 0.035);
    const spread = !raised && arms.length === 2 && arms.every((arm) =>
      Math.abs(arm.wrist.x - pose.center.x) > pose.shoulderWidth * 0.9 &&
      Math.abs(arm.wrist.y - arm.shoulder.y) < width * 0.55);
    const edge = (name, active, dwell, cooldown, event) => {
      if (!active) { this.held.delete(name); this.latched.delete(name); return; }
      if (!this.held.has(name)) this.held.set(name, timestamp);
      if (!this.latched.has(name) && timestamp - this.held.get(name) >= dwell &&
        timestamp >= (this.cooldowns.get(name) ?? 0)) {
        this.latched.add(name); this.cooldowns.set(name, timestamp + cooldown); events.push(event);
      }
    };
    edge("ascend", raised, 180, 1200, { type: "ascend" });
    edge("shield", spread, 140, 1300, { type: "shield" });
    for (const side of ["left", "right"]) {
      const arm = arms.find((value) => value.side === side);
      if (!arm) { this.history.delete(side); edge(`shot-${side}`, false); continue; }
      const { shoulder, elbow, wrist } = arm;
      const reach = distance(shoulder, wrist);
      const length = distance(shoulder, elbow) + distance(elbow, wrist);
      const forward = (wrist.z ?? 0) < (shoulder.z ?? 0) - 0.22;
      const depthLength = distance3D(shoulder, elbow) + distance3D(elbow, wrist);
      const extended = !raised && !spread && (
        length > width * 0.45 && reach / length > 0.9 && reach > width * 0.85 ||
        forward && depthLength > width * 0.7 && distance3D(shoulder, wrist) / depthLength > 0.9);
      const direction = { x: clamp(wrist.x + (wrist.x - elbow.x) * 0.55, 0.08, 0.92),
        y: clamp(wrist.y + (wrist.y - elbow.y) * 0.55, 0.15, 0.83) };
      edge(`shot-${side}`, extended, 150, 650, { type: "shot", side, direction });
      const relativeX = (wrist.x - shoulder.x) / pose.shoulderWidth;
      const history = (this.history.get(side) ?? []).filter((sample) => timestamp - sample.t <= 220);
      const previous = history.find((sample) => timestamp - sample.t >= 60);
      if (!raised && !spread && !extended && previous && timestamp >= (this.cooldowns.get(`punch-${side}`) ?? 0)) {
        const movement = Math.abs(relativeX - previous.x);
        if (movement >= 0.38 && movement / ((timestamp - previous.t) / 1000) > 2.6) {
          events.push({ type: "punch", side, screenSide: wrist.x < pose.center.x ? -1 : 1 });
          this.cooldowns.set(`punch-${side}`, timestamp + 450);
          history.length = 0;
        }
      }
      history.push({ t: timestamp, x: relativeX }); this.history.set(side, history);
    }
    return events;
  }
}

export function demoGuardianPose(timestamp = 0) {
  const sway = Math.sin(timestamp / 2300) * 0.018;
  return {
    head: { x: 0.5 + sway, y: 0.38 }, center: { x: 0.5 + sway, y: 0.54 },
    shoulderWidth: 0.25, aspect: 0.75,
    arms: [
      { side: "left", shoulder: { x: 0.375 + sway, y: 0.54 }, elbow: { x: 0.32 + sway, y: 0.65 }, wrist: { x: 0.35 + sway, y: 0.73 } },
      { side: "right", shoulder: { x: 0.625 + sway, y: 0.54 }, elbow: { x: 0.68 + sway, y: 0.65 }, wrist: { x: 0.65 + sway, y: 0.73 } }
    ]
  };
}
