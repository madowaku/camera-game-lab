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
    // A gameplay callback has priority even if the optional diagnostics fail.
    this.onFrame(frame);
    if (this.comparison) {
      try {
        const aspect = (this.video.videoWidth || 1) / (this.video.videoHeight || 1);
        this.lastComparison = this.comparison.update(result, timestamp, aspect);
        this.onComparison(this.lastComparison);
      } catch (error) {
        console.warn("Gesture A/B diagnostics disabled after an error:", error);
        this.comparison = null;
        this.lastComparison = null;
      }
    }
  }
  stop() {
    super.stop();
    this.grip.reset();
    this.comparison?.reset();
    this.lastComparison = null;
  }
}
