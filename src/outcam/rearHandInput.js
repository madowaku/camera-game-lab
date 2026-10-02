import { BodyInput } from "../input/bodyInput.js";
import { SwingTracker } from "./swingTracker.js";

function projectPoint(point, video, stage) {
  const rect = stage.getBoundingClientRect();
  const sourceWidth = video.videoWidth || rect.width || 1;
  const sourceHeight = video.videoHeight || rect.height || 1;
  const scale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (point.x * width - (width - rect.width) / 2) / rect.width,
    y: (point.y * height - (height - rect.height) / 2) / rect.height
  };
}

export class RearHandInput extends BodyInput {
  constructor(video, stage, { onStatus, onHand, onSwing, getTarget } = {}) {
    super(video, { onStatus });
    this.stage = stage;
    this.onHand = onHand ?? (() => {});
    this.onSwing = onSwing ?? (() => {});
    this.swingTracker = new SwingTracker();
    this.getTarget = getTarget ?? (() => null);
  }

  get cameraConstraints() {
    return {
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    };
  }

  async openCamera(mediaDevices, constraints, checkActive) {
    const stream = await mediaDevices.getUserMedia(constraints);
    try { checkActive(); } catch (error) {
      stream.getTracks().forEach(track => track.stop());
      throw error;
    }
    return stream;
  }

  processResult(result, timestamp) {
    const landmarks = result?.landmarks?.[0];
    if (!landmarks?.length) {
      this.swingTracker.reset();
      this.onHand(null);
      return;
    }

    const wrist = landmarks[0];
    const middle = landmarks[9] ?? wrist;
    const point = projectPoint({
      x: wrist.x * 0.55 + middle.x * 0.45,
      y: wrist.y * 0.55 + middle.y * 0.45
    }, this.video, this.stage);
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      this.swingTracker.reset();
      this.onHand(null);
      return;
    }
    this.onHand(point);

    const strike = this.swingTracker.update(point, timestamp, this.getTarget());
    if (strike) this.onSwing(strike);
  }

  stop() {
    super.stop();
    this.swingTracker.reset();
    this.onHand(null);
  }
}
