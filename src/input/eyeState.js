// MediaPipe translation belongs here; games only consume this normalized state.
const clamp = (n) => Math.max(0, Math.min(1, n));
export const EYE_CONFIG = Object.freeze({ closed: 0.62, open: 0.35, closeMs: 120, openMs: 35, frames: 3, staleMs: 300 });

export function readEyes(result) {
  const face = result?.faceLandmarks?.[0];
  const scores = result?.faceBlendshapes?.[0]?.categories ?? [];
  const left = scores.find((s) => s.categoryName === "eyeBlinkLeft")?.score;
  const right = scores.find((s) => s.categoryName === "eyeBlinkRight")?.score;
  if (!face?.length || !Number.isFinite(left) || !Number.isFinite(right)) return null;
  const nose = face[1];
  return { blinkLeftScore: clamp(left), blinkRightScore: clamp(right), facePosition: nose && Number.isFinite(nose.x) && Number.isFinite(nose.y) ? { x: 1 - nose.x, y: nose.y } : { x: 0.5, y: 0.45 } };
}

export class EyeState {
  constructor(config = {}) { this.config = { ...EYE_CONFIG, ...config }; this.reset(); }
  reset() {
    this.state = "FACE_LOST"; this.present = false; this.lastAt = null;
    this.candidate = null; this.since = 0; this.frames = 0; this.blinkSince = null;
  }
  update(result, timestamp) {
    const reading = readEyes(result), events = [];
    const gap = this.lastAt === null ? 0 : timestamp - this.lastAt;
    if (!Number.isFinite(timestamp) || gap < 0 || gap > this.config.staleMs) this.reset();
    const elapsed = this.lastAt === null ? 0 : timestamp - this.lastAt;
    this.lastAt = Number.isFinite(timestamp) ? timestamp : null;
    if (!reading || !Number.isFinite(timestamp)) {
      if (this.present) events.push("FACE_LOST");
      this.present = false; this.state = "FACE_LOST"; this.candidate = null; this.frames = 0; this.blinkSince = null;
      return { present: false, ready: false, eyeState: "FACE_LOST", blinkLeftScore: 0, blinkRightScore: 0, timestamp, fps: 0, events };
    }
    if (!this.present) { events.push("FACE_PRESENT"); this.state = "UNKNOWN"; }
    this.present = true;
    const shut = reading.blinkLeftScore >= this.config.closed && reading.blinkRightScore >= this.config.closed;
    const open = reading.blinkLeftScore <= this.config.open && reading.blinkRightScore <= this.config.open;
    if (shut && this.blinkSince === null) this.blinkSince = timestamp;
    if (open && this.blinkSince !== null) {
      const duration = timestamp - this.blinkSince;
      if (duration >= 30 && duration <= 450) events.push("BLINK_BOTH");
      this.blinkSince = null;
    }
    const next = shut ? "EYES_CLOSED" : open ? "EYES_OPEN" : null;
    if (!next || next === this.state) { this.candidate = null; this.frames = 0; }
    else {
      if (this.candidate !== next) { this.candidate = next; this.since = timestamp; this.frames = 0; }
      this.frames++;
      const heldMs = next === "EYES_CLOSED" ? this.config.closeMs : this.config.openMs;
      if (this.frames >= this.config.frames && timestamp - this.since >= heldMs) {
        this.state = next; this.candidate = null; this.frames = 0; events.push(next);
      }
    }
    return { ...reading, present: true, ready: this.state === "EYES_OPEN" || this.state === "EYES_CLOSED", eyeState: this.state, timestamp, fps: elapsed > 0 ? 1000 / elapsed : 0, events };
  }
}
