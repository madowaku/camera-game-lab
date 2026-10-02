export const FACE_ZONE_CONFIG = Object.freeze({
  threshold: 0.12, hysteresis: 0.02, neutralRadius: 0.045,
  calibrationMs: 3000, calibrationDrift: 0.04, maxFrameGapMs: 300, smoothingMs: 65
});

// Pure signal tracker. Coordinates use the mirrored camera's screen direction.
export class FaceZoneTracker {
  constructor(config = {}) { this.config = { ...FACE_ZONE_CONFIG, ...config }; this.reset(); }

  reset() {
    this.baseFaceX = null;
    this.faceX = null;
    this.lastFrameAt = null;
    this.zone = "NEUTRAL";
    this.samples = [];
    this.calibrationProgress = 0;
    this.visible = false;
  }

  loseFace() {
    this.visible = false;
    this.faceX = null;
    this.zone = "NEUTRAL";
    this.samples = [];
    if (this.baseFaceX === null) this.calibrationProgress = 0;
  }

  update(faceXs, timestamp) {
    const elapsed = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    if (elapsed > this.config.maxFrameGapMs || elapsed < 0) this.loseFace();
    this.lastFrameAt = timestamp;
    if (faceXs.length !== 1 || !Number.isFinite(faceXs[0]) || faceXs[0] < 0 || faceXs[0] > 1) {
      this.loseFace();
      return this.sample(timestamp);
    }
    const x = faceXs[0];
    const blend = 1 - Math.exp(-elapsed / this.config.smoothingMs);
    this.faceX = this.faceX === null ? x : this.faceX + (x - this.faceX) * blend;
    this.visible = true;
    if (this.baseFaceX === null) {
      if (x < 0.25 || x > 0.75 || this.samples.some((s) => Math.abs(s.x - x) > this.config.calibrationDrift)) {
        this.samples = [];
        this.calibrationProgress = 0;
      }
      if (x >= 0.25 && x <= 0.75) {
        this.samples.push({ x, timestamp });
        this.calibrationProgress = Math.min(1, (timestamp - this.samples[0].timestamp) / this.config.calibrationMs);
        if (this.calibrationProgress === 1) {
          const values = this.samples.map((s) => s.x).sort((a, b) => a - b);
          this.baseFaceX = values[Math.floor(values.length / 2)];
          this.samples = [];
        }
      }
    }
    if (this.baseFaceX !== null) {
      const dx = this.faceX - this.baseFaceX;
      const edge = this.config.threshold;
      const exit = edge - this.config.hysteresis;
      this.zone = dx < -edge || (this.zone === "LEFT" && dx < -exit) ? "LEFT"
        : dx > edge || (this.zone === "RIGHT" && dx > exit) ? "RIGHT"
          : Math.abs(dx) <= this.config.neutralRadius ? "NEUTRAL" : "CENTER";
    }
    return this.sample(timestamp);
  }

  sample(timestamp) {
    if (this.lastFrameAt === null || timestamp - this.lastFrameAt > this.config.maxFrameGapMs) this.loseFace();
    const ready = this.visible && this.baseFaceX !== null;
    return {
      presence: this.visible ? "FACE_PRESENT" : "FACE_LOST", visible: this.visible, ready,
      zone: ready ? this.zone : "NEUTRAL", neutral: ready && this.zone === "NEUTRAL",
      faceX: this.faceX, baseFaceX: this.baseFaceX,
      dx: ready ? this.faceX - this.baseFaceX : null,
      calibrationProgress: this.calibrationProgress
    };
  }
}
