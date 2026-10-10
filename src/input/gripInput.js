import { BodyInput } from "./bodyInput.js";
import { GripState } from "./gripState.js";
import { GestureABProbe } from "../gesture/gestureABProbe.js";

// Existing GripState remains authoritative; optional comparison is observation-only.
export class GripInput extends BodyInput {
  constructor(video, { onFrame, onStatus, compareGestures = false, onComparison } = {}) {
    super(video, { onStatus });
    this.grip = new GripState();
    this.onFrame = onFrame ?? (() => {});
    this.onComparison = onComparison ?? (() => {});
    this.comparison = compareGestures ? new GestureABProbe() : null;
    this.lastComparison = null;
  }
  processResult(result, timestamp) {
    const frame = this.grip.update(result, timestamp);
    if (this.comparison) {
      this.lastComparison = this.comparison.update(result, timestamp,
        (this.video.videoWidth || 1) / (this.video.videoHeight || 1));
      this.onComparison(this.lastComparison);
    }
    this.onFrame(frame);
  }
  stop() {
    super.stop();
    this.grip.reset();
    this.comparison?.reset();
    this.lastComparison = null;
  }
}
