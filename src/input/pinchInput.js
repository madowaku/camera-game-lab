import { BodyInput } from "./bodyInput.js";
import { PinchState } from "./pinchState.js";

// Hand Beat keeps its rhythm thresholds; direct manipulation has its own edges.
export class PinchInput extends BodyInput {
  constructor(video, { onFrame, onStatus } = {}) { super(video, { onStatus }); this.pinch = new PinchState(); this.onFrame = onFrame ?? (() => {}); }
  processResult(result, timestamp) { this.onFrame(this.pinch.update(result, timestamp, (this.video.videoWidth || 1) / (this.video.videoHeight || 1))); }
  stop() { super.stop(); this.pinch.reset(); }
}
