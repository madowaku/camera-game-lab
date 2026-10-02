import { BodyInput } from "../input/bodyInput.js";
import { WATERMELON_RULES, detectDownwardSwing } from "./watermelonRules.js";

function projectPoint(point, video, stage) {
  const rect = stage.getBoundingClientRect();
  const sourceWidth = video.videoWidth || rect.width || 1;
  const sourceHeight = video.videoHeight || rect.height || 1;
  const scale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: Math.max(0, Math.min(1, (point.x * width - (width - rect.width) / 2) / rect.width)),
    y: Math.max(0, Math.min(1, (point.y * height - (height - rect.height) / 2) / rect.height))
  };
}

export class RearHandInput extends BodyInput {
  constructor(video, stage, { onStatus, onHand, onSwing } = {}) {
    super(video, { onStatus });
    this.stage = stage;
    this.onHand = onHand ?? (() => {});
    this.onSwing = onSwing ?? (() => {});
    this.lastPoint = null;
    this.lastFrameAt = null;
    this.lastSwingAt = -Infinity;
  }

  get cameraConstraints() {
    return {
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    };
  }

  async openCamera(mediaDevices, constraints, checkActive) {
    const stream = await mediaDevices.getUserMedia(constraints);
    checkActive();
    return stream;
  }

  processResult(result, timestamp) {
    const landmarks = result?.landmarks?.[0];
    if (!landmarks?.length) {
      this.lastPoint = null;
      this.lastFrameAt = null;
      this.onHand(null);
      return;
    }

    const wrist = landmarks[0];
    const middle = landmarks[9] ?? wrist;
    const point = projectPoint({
      x: wrist.x * 0.55 + middle.x * 0.45,
      y: wrist.y * 0.55 + middle.y * 0.45
    }, this.video, this.stage);
    this.onHand(point);

    const elapsed = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    if (timestamp - this.lastSwingAt >= WATERMELON_RULES.swingCooldownMs &&
        detectDownwardSwing(this.lastPoint, point, elapsed)) {
      this.lastSwingAt = timestamp;
      this.onSwing(point);
    }
    this.lastPoint = point;
    this.lastFrameAt = timestamp;
  }

  stop() {
    super.stop();
    this.lastPoint = null;
    this.lastFrameAt = null;
    this.lastSwingAt = -Infinity;
    this.onHand(null);
  }
}
