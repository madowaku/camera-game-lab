import { BodyInput } from "./bodyInput.js";
import { PinchState } from "./pinchState.js";
import { GestureABProbe } from "../gesture/gestureABProbe.js";

// PINCH remains research-only. A is authoritative for existing users of PinchInput.
export class PinchInput extends BodyInput {
  constructor(video, { onFrame, onStatus, compareGestures = false, onComparison } = {}) {
    super(video, { onStatus });
    this.pinch = new PinchState();
    this.onFrame = onFrame ?? (() => {});
    this.onComparison = onComparison ?? (() => {});
    this.comparison = compareGestures ? new GestureABProbe() : null;
    this.lastComparison = null;
  }
  processResult(result, timestamp) {
    const aspect = (this.video.videoWidth || 1) / (this.video.videoHeight || 1);
    const frame = this.pinch.update(result, timestamp, aspect);
    // A gameplay callback has priority even if the optional diagnostics fail.
    this.onFrame(frame);
    if (this.comparison) {
      try {
        // Use the same aspect ratio as the legacy pinch detector.
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
    this.pinch.reset();
    this.comparison?.reset();
    this.lastComparison = null;
  }
}
