const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
export const GRIP_CONFIG = Object.freeze({ confidence: .6, holdMs: 80, staleMs: 300 });

export function readGrip(result, confidence = GRIP_CONFIG.confidence) {
  const points = result?.landmarks?.[0], palm = [0, 5, 9, 13, 17];
  if (!points || !palm.every(i => validPoint(points[i]))) return null;
  const position = { x: 1 - palm.reduce((sum, i) => sum + points[i].x, 0) / palm.length,
    y: palm.reduce((sum, i) => sum + points[i].y, 0) / palm.length };
  const top = result?.gestures?.[0]?.[0];
  const gesture = top?.score >= confidence && ["Closed_Fist", "Open_Palm"].includes(top.categoryName) ? top.categoryName : null;
  return { gripPosition: position, gesture };
}

export class GripState {
  constructor(config = {}) { this.config = { ...GRIP_CONFIG, ...config }; this.reset(); }
  reset() { this.present = false; this.grabbing = false; this.open = false; this.armed = false; this.candidate = null; this.since = null; this.lastAt = null; this.lostAt = null; }
  update(result, timestamp) {
    if (!Number.isFinite(timestamp)) { this.reset(); return { present: false, grabbing: false, open: false, events: [] }; }
    const gap = this.lastAt === null ? 0 : timestamp - this.lastAt;
    if (gap < 0 || gap > this.config.staleMs) this.reset();
    this.lastAt = timestamp;
    const reading = readGrip(result, this.config.confidence), events = [];
    if (!reading) {
      if (this.present) events.push("HAND_LOST");
      this.present = false; this.open = false; this.candidate = null; this.since = null; this.lostAt ??= timestamp;
      if (timestamp - this.lostAt >= this.config.staleMs) { this.grabbing = false; this.armed = false; }
      return { present: false, grabbing: this.grabbing, open: false, gripPosition: null, events };
    }
    if (!this.present) events.push("HAND_PRESENT");
    this.present = true; this.lostAt = null;
    if (reading.gesture !== this.candidate) { this.candidate = reading.gesture; this.since = timestamp; }
    const qualified = reading.gesture && timestamp - this.since >= this.config.holdMs;
    this.open = qualified && reading.gesture === "Open_Palm";
    if (qualified) {
      if (this.open) {
        this.armed = true;
        if (this.grabbing) { this.grabbing = false; events.push("GRIP_END"); }
      } else if (!this.grabbing) {
        this.grabbing = true;
        if (this.armed) events.push("GRIP_START");
        this.armed = false;
      }
    }
    // An unknown pose keeps the last grip state, never fabricating a release.
    if (this.grabbing && !events.includes("GRIP_START")) events.push("GRIP_MOVE");
    return { ...reading, present: true, grabbing: this.grabbing, open: !!this.open, armed: this.armed, events, fps: gap > 0 ? 1000 / gap : 0 };
  }
}

// Palm center is already mirrored; project into centered object-fit:cover.
export function projectGrip(frame, videoWidth, videoHeight, width, height) {
  if (!frame?.present || ![videoWidth, videoHeight, width, height].every(v => Number.isFinite(v) && v > 0)) return { ...frame, present: false, events: [] };
  const scale = Math.max(width / videoWidth, height / videoHeight), p = frame.gripPosition;
  if (!validPoint(p)) return { ...frame, present: false, events: [] };
  const gripPosition = { x: (p.x * videoWidth * scale - (videoWidth * scale - width) / 2) / width,
    y: (p.y * videoHeight * scale - (videoHeight * scale - height) / 2) / height };
  return validPoint(gripPosition) ? { ...frame, gripPosition } : { ...frame, present: false, events: [] };
}
