import { FaceInput } from "./faceInput.js";

export class MouthPositionInput extends FaceInput {
  constructor(video, { onPosition = () => {}, onStatus } = {}) {
    super(video, { onStatus });
    this.onPosition = onPosition;
    this.position = null;
    this.lastInference = -Infinity;
  }
  get cameraConstraints() {
    return { audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } };
  }
  inferFrame(timestamp) {
    if (timestamp - this.lastInference < 40) return undefined;
    this.lastInference = timestamp;
    return super.inferFrame(timestamp);
  }
  processResult(result, timestamp) {
    if (result === undefined) return;
    const points = result?.faceLandmarks?.[0];
    const upper = points?.[13];
    const lower = points?.[14];
    const position = upper && lower ? { x: (upper.x + lower.x) / 2, y: (upper.y + lower.y) / 2, timestamp } : null;
    this.position = position && Number.isFinite(position.x) && Number.isFinite(position.y) ? position : null;
    this.onPosition(this.position);
  }
  stop() {
    super.stop();
    this.position = null;
    this.lastInference = -Infinity;
    this.onPosition?.(null);
  }
}
