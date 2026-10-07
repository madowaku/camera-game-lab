import { idleMotionFrame, clamp, unit } from './MotionFrame.js';
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (!('z' in p) || Number.isFinite(p.z));
const visible = (p, confidence) => valid(p) && (p.visibility ?? 1) >= confidence && (p.presence ?? 1) >= confidence;
const distance = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
const point = p => ({ x: clamp((p.x - .5) * 2), y: clamp((.5 - p.y) * 2), z: clamp(-(p.z ?? 0) * 2) });
const angle = (a, b, aspect) => Math.atan2((b.x - a.x) * aspect, b.y - a.y) / Math.PI;
const dead = (n, zone) => Math.abs(n) < zone ? 0 : n;

// Accepts existing Camera Input Layer results; never invokes a recognizer.
export class MotionNormalizer {
  constructor({ confidence = .5, deadZone = .025 } = {}) { Object.assign(this, { confidence, deadZone }); this.reset(); }
  reset() { this.previous = null; }
  normalize({ face = null, pose = null, hands = null, aspect = 1 } = {}, timestamp = 0) {
    const f = idleMotionFrame(timestamp); aspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const facePoints = face?.faceLandmarks?.length === 1 ? face.faceLandmarks[0] : null;
    if (facePoints && [1, 33, 263, 13, 14, 61, 291, 159, 145, 386, 374].every(i => valid(facePoints[i])) &&
      (face.confidence ?? 1) >= this.confidence) {
      f.tracking.face = true;
      const scores = Object.fromEntries((face.faceBlendshapes?.[0]?.categories ?? []).map(c => [c.categoryName, unit(c.score)]));
      const p = facePoints, width = distance(p[61], p[291], aspect);
      f.face.mouthOpen = scores.jawOpen ?? unit((distance(p[13], p[14], aspect) / Math.max(width, .001) - .035) / .4);
      f.face.smile = unit(((scores.mouthSmileLeft ?? 0) + (scores.mouthSmileRight ?? 0)) / 2);
      f.face.blinkLeft = scores.eyeBlinkLeft ?? unit(1 - distance(p[386], p[374], aspect) / Math.max(width * .2, .001));
      f.face.blinkRight = scores.eyeBlinkRight ?? unit(1 - distance(p[159], p[145], aspect) / Math.max(width * .2, .001));
      const matrix = face.facialTransformationMatrixes?.[0], m = matrix?.data;
      if (matrix?.rows === 4 && matrix.columns === 4 && m?.length === 16 && Array.from(m).every(Number.isFinite) && Math.hypot(m[8], m[9], m[10]) > .001) {
        const range = Math.PI / 3;
        f.head = { yaw: clamp(Math.atan2(m[8], m[10]) / range), pitch: clamp(Math.atan2(-m[9], Math.hypot(m[8], m[10])) / range), roll: clamp(Math.atan2(m[1], m[0]) / range) };
      } else {
        // Coarse fallback for experiments that did not request face matrices.
        const eyeWidth = Math.max(distance(p[33], p[263], aspect), .001);
        f.head.yaw = clamp((p[1].x - (p[33].x + p[263].x) / 2) * aspect / eyeWidth * 3);
        f.head.roll = clamp(-Math.atan2(p[263].y - p[33].y, (p[263].x - p[33].x) * aspect) / (Math.PI / 3));
      }
      f.body.leanX = clamp((p[1].x - .5) * 2);
      f.body.leanY = clamp((.45 - p[1].y) * 2);
    }
    const p = pose?.landmarks?.length === 1 ? pose.landmarks[0] : null;
    if (p && [11, 12].every(i => visible(p[i], this.confidence))) {
      f.tracking.pose = true;
      f.body.leanX = clamp((p[11].x + p[12].x - 1) * 2);
      f.body.leanY = clamp((1.1 - p[11].y - p[12].y) * 2);
      for (const [side, indices] of [['left', [11, 13, 15]], ['right', [12, 14, 16]]]) {
        const [s, e, w] = indices;
        if (visible(p[e], this.confidence)) {
          f.body[`${side}Shoulder`].z = angle(p[s], p[e], aspect);
          if (visible(p[w], this.confidence)) {
            f.body[`${side}Elbow`].z = clamp(((angle(p[e], p[w], aspect) - f.body[`${side}Shoulder`].z + 3) % 2) - 1);
            f.hands[side].position = point(p[w]); f.hands[side].source = 'pose'; f.tracking[`${side}Hand`] = true;
          }
        }
      }
    }
    const handPoints = hands?.landmarks ?? [], labels = hands?.handedness ?? hands?.handednesses ?? [];
    const assigned = new Set();
    handPoints.forEach((p, i) => {
      const label = labels[i]?.[0], side = label?.categoryName?.toLowerCase();
      if (!['left', 'right'].includes(side) || assigned.has(side) || (label.score ?? 0) < this.confidence ||
        ![0, 4, 5, 8, 9, 12, 16, 20].every(j => visible(p[j], this.confidence))) return;
      assigned.add(side); const span = Math.max(distance(p[0], p[9], aspect), .001);
      const direction = { x: clamp((p[8].x - p[5].x) * aspect / span), y: clamp((p[5].y - p[8].y) / span), z: clamp(((p[5].z ?? 0) - (p[8].z ?? 0)) / span) };
      f.hands[side] = { position: point(p[0]), direction,
        open: unit(([8, 12, 16, 20].reduce((sum, j) => sum + distance(p[0], p[j], aspect) / span, 0) / 4 - .8) / 1.2),
        pinch: unit(1 - distance(p[4], p[8], aspect) / (span * .65)), source: 'hand' };
      f.tracking[`${side}Hand`] = true;
    });
    for (const key of Object.keys(f.head)) f.head[key] = dead(f.head[key], this.deadZone);
    for (const key of ['leanX', 'leanY']) f.body[key] = dead(f.body[key], this.deadZone);
    // Do not turn tracking re-acquisition or a long frame gap into a speed spike.
    const dt = this.previous ? (timestamp - this.previous.timestamp) / 1000 : 0;
    if (dt > 0 && dt < .25) {
      const changes = [];
      if (f.tracking.face && this.previous.tracking.face) changes.push(...Object.keys(f.head).map(k => Math.abs(f.head[k] - this.previous.head[k])));
      if (f.tracking.pose && this.previous.tracking.pose) changes.push(Math.abs(f.body.leanX - this.previous.body.leanX));
      for (const side of ['left', 'right']) if (f.tracking[`${side}Hand`] && this.previous.tracking[`${side}Hand`]) changes.push(Math.hypot(...['x', 'y'].map(k => f.hands[side].position[k] - this.previous.hands[side].position[k])));
      const delta = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
      f.energy = { movement: unit(delta * 4), speed: unit(delta / dt / 3) };
    }
    if (!this.previous || timestamp > this.previous.timestamp) this.previous = structuredClone(f);
    return f;
  }
}
