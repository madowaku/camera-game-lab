const validPoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
const clamp = (n) => Math.max(0, Math.min(1, n));
export const PINCH_CONFIG = Object.freeze({ enter: 0.30, leave: 0.42, frames: 2, staleMs: 300 });

export function readPinch(result, aspect = 1) {
  const points = result?.landmarks?.[0];
  if (!points || ![0, 4, 8, 9].every((i) => validPoint(points[i])) || !Number.isFinite(aspect) || aspect <= 0) return null;
  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const scale = distance(points[0], points[9]);
  if (scale < 0.025) return null;
  const thumbTip = { x: 1 - points[4].x, y: points[4].y }, indexTip = { x: 1 - points[8].x, y: points[8].y };
  const pinchRatio = distance(points[4], points[8]) / scale;
  return { thumbTip, indexTip, pinchPosition: { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 }, pinchRatio, pinchAmount: clamp(1 - pinchRatio / 0.65) };
}

export class PinchState {
  constructor(config = {}) { this.config = { ...PINCH_CONFIG, ...config }; this.reset(); }
  reset() { this.present = false; this.pinching = false; this.armed = false; this.candidate = null; this.frames = 0; this.lastAt = null; this.lostAt = null; }
  update(result, timestamp, aspect = 1) {
    if (!Number.isFinite(timestamp)) { this.reset(); return { present: false, pinching: false, events: ["HAND_LOST"] }; }
    const gap = this.lastAt === null ? 0 : timestamp - this.lastAt;
    if (gap < 0 || gap > this.config.staleMs) this.reset();
    this.lastAt = timestamp;
    const reading = readPinch(result, aspect), events = [];
    if (!reading) {
      if (this.present) events.push("HAND_LOST");
      this.present = false; this.candidate = null; this.frames = 0;
      this.lostAt ??= timestamp;
      if (timestamp - this.lostAt >= this.config.staleMs) { this.pinching = false; this.armed = false; }
      return { present: false, pinching: this.pinching, pinchPosition: null, thumbTip: null, indexTip: null, pinchRatio: null, pinchAmount: 0, events, timestamp, fps: 0 };
    }
    if (!this.present) events.push("HAND_PRESENT");
    this.present = true; this.lostAt = null;
    const candidate = reading.pinchRatio <= this.config.enter ? true : reading.pinchRatio >= this.config.leave ? false : null;
    if (candidate === null) { this.candidate = null; this.frames = 0; }
    else {
      if (this.candidate !== candidate) { this.candidate = candidate; this.frames = 0; }
      this.frames++;
      if (this.frames >= this.config.frames) {
        if (!candidate) {
          this.armed = true;
          if (this.pinching) { this.pinching = false; events.push("PINCH_END"); }
        } else if (!this.pinching) {
          this.pinching = true;
          if (this.armed) events.push("PINCH_START");
          this.armed = false;
        }
      }
    }
    if (this.pinching && !events.includes("PINCH_START")) events.push("PINCH_MOVE");
    return { ...reading, present: true, pinching: this.pinching, armed: this.armed, events, timestamp, fps: gap > 0 ? 1000 / gap : 0 };
  }
}

// Input points are already mirrored. Apply the same centered cover crop as video.
export function projectPinch(frame, videoWidth, videoHeight, width, height) {
  if (!frame?.present || ![videoWidth, videoHeight, width, height].every((v) => Number.isFinite(v) && v > 0)) return { ...frame, present: false, events: [] };
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const project = (point) => point && ({ x: (point.x * videoWidth * scale - (videoWidth * scale - width) / 2) / width, y: (point.y * videoHeight * scale - (videoHeight * scale - height) / 2) / height });
  const pinchPosition = project(frame.pinchPosition);
  if (!validPoint(pinchPosition)) return { ...frame, present: false, events: [] };
  return { ...frame, pinchPosition, thumbTip: project(frame.thumbTip), indexTip: project(frame.indexTip) };
}
