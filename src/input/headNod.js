export const HEAD_NOD_CONFIG = Object.freeze({
  calibrationMs: 3000, calibrationDriftDegrees: 4, maxFrameGapMs: 300,
  smoothingMs: 50, downDegrees: 12, uprightDegrees: 5,
  downHoldMs: 80, returnHoldMs: 80, armHoldMs: 120, gestureWindowMs: 1400
});

// MediaPipe's column-major transform maps the canonical face into camera space.
// Its forward axis is column 2. Camera-space Y points up, so downward pitch is
// positive. Using a direction ignores translation and uniform face scale.
export function extractHeadPitch(result) {
  if (result?.faceLandmarks?.length !== 1 || result?.facialTransformationMatrixes?.length !== 1) return null;
  const matrix = result.facialTransformationMatrixes[0];
  if (matrix.rows !== 4 || matrix.columns !== 4 || matrix.data?.length !== 16 ||
    !matrix.data.every(Number.isFinite)) return null;
  const [x, y, z] = matrix.data.slice(8, 11);
  if (Math.hypot(x, y, z) < 1e-6 || z <= 0) return null;
  return Math.atan2(-y, Math.hypot(x, z)) * 180 / Math.PI;
}

export class HeadNodTracker {
  constructor(config = {}) { this.config = { ...HEAD_NOD_CONFIG, ...config }; this.reset(); }

  reset() {
    this.basePitch = this.pitch = this.lastFrameAt = null;
    this.visible = false;
    this.samples = [];
    this.calibrationProgress = 0;
    this.nodId = 0;
    this.nodStartedAt = null;
    this.clearGesture();
  }

  clearGesture() {
    this.armed = false;
    this.armAt = this.motionAt = this.downAt = this.returnAt = null;
    this.phase = "REST";
    this.progress = 0;
  }

  loseFace() {
    this.visible = false;
    this.pitch = null;
    this.samples = [];
    if (this.basePitch === null) this.calibrationProgress = 0;
    this.clearGesture();
  }

  update(pitch, timestamp, centered = true) {
    const elapsed = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    if (elapsed > this.config.maxFrameGapMs || elapsed < 0) this.loseFace();
    this.lastFrameAt = timestamp;
    if (!Number.isFinite(pitch) || Math.abs(pitch) >= 85) { this.loseFace(); return this.sample(timestamp); }
    const blend = 1 - Math.exp(-elapsed / this.config.smoothingMs);
    this.pitch = this.pitch === null ? pitch : this.pitch + (pitch - this.pitch) * blend;
    this.visible = true;
    if (this.basePitch === null) {
      if (!centered || this.samples.some(s => Math.abs(s.pitch - pitch) > this.config.calibrationDriftDegrees)) {
        this.samples = [];
        this.calibrationProgress = 0;
      }
      if (centered) {
        this.samples.push({ pitch, timestamp });
        this.calibrationProgress = Math.min(1, (timestamp - this.samples[0].timestamp) / this.config.calibrationMs);
        if (this.calibrationProgress === 1) {
          const values = this.samples.map(s => s.pitch).sort((a, b) => a - b);
          this.basePitch = values[Math.floor(values.length / 2)];
          this.samples = [];
        }
      }
    }
    if (this.basePitch === null) return this.sample(timestamp);
    const delta = this.pitch - this.basePitch;
    const upright = Math.abs(delta) <= this.config.uprightDegrees;
    if (!centered || delta < -this.config.uprightDegrees ||
      (this.motionAt !== null && timestamp - this.motionAt > this.config.gestureWindowMs)) {
      this.clearGesture();
      return this.sample(timestamp);
    }
    if (!this.armed) {
      this.armAt = upright ? this.armAt ?? timestamp : null;
      if (this.armAt !== null && timestamp - this.armAt >= this.config.armHoldMs) this.armed = true;
      return this.sample(timestamp);
    }
    if (this.phase === "REST") {
      if (upright) this.motionAt = null;
      else this.motionAt ??= timestamp;
      this.progress = upright ? 0 : Math.min(0.5, delta / this.config.downDegrees * 0.5);
      this.downAt = delta >= this.config.downDegrees ? this.downAt ?? timestamp : null;
      if (this.downAt !== null && timestamp - this.downAt >= this.config.downHoldMs) this.phase = "RETURN";
    }
    if (this.phase === "RETURN") {
      this.progress = 0.5 + 0.5 * Math.max(0, Math.min(1,
        (this.config.downDegrees - delta) / (this.config.downDegrees - this.config.uprightDegrees)));
      this.returnAt = upright ? this.returnAt ?? timestamp : null;
      if (this.returnAt !== null && timestamp - this.returnAt >= this.config.returnHoldMs) {
        this.nodId++;
        this.nodStartedAt = this.motionAt;
        this.clearGesture();
      }
    }
    return this.sample(timestamp);
  }

  sample(timestamp) {
    if (this.lastFrameAt === null || timestamp - this.lastFrameAt > this.config.maxFrameGapMs) this.loseFace();
    const ready = this.visible && this.basePitch !== null;
    return {
      visible: this.visible, ready, calibrationProgress: this.calibrationProgress,
      upright: ready && Math.abs(this.pitch - this.basePitch) <= this.config.uprightDegrees,
      pitchDelta: ready ? this.pitch - this.basePitch : null,
      nodId: this.nodId, nodStartedAt: this.nodStartedAt,
      nodPhase: this.phase, nodProgress: this.progress
    };
  }
}
