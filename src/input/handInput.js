import { BodyInput } from "./bodyInput.js";

const GESTURE_MAP = {
  Open_Palm: "OPEN",
  Closed_Fist: "FIST",
  Victory: "PEACE",
  Thumb_Up: "THUMB_UP"
};

export function normalizeGesture(result) {
  const topGesture = result?.gestures?.[0]?.[0];

  if (!topGesture || topGesture.score < 0.55) {
    return "NONE";
  }

  return GESTURE_MAP[topGesture.categoryName] ?? "NONE";
}

export class HandInput extends BodyInput {
  constructor(video, { onGesture, onStatus } = {}) {
    super(video, { onStatus });
    this.onGesture = onGesture ?? (() => {});

    this.currentGesture = "NONE";
    this.candidateGesture = "NONE";
    this.candidateFrames = 0;
  }

  processResult(result) {
    const rawGesture = normalizeGesture(result);

    if (rawGesture === this.candidateGesture) {
      this.candidateFrames += 1;
    } else {
      this.candidateGesture = rawGesture;
      this.candidateFrames = 1;
    }

    // Preserve the existing three-frame rhythm input stability.
    if (
      this.candidateFrames >= 3 &&
      this.currentGesture !== this.candidateGesture
    ) {
      this.currentGesture = this.candidateGesture;
      this.onGesture(this.currentGesture, result);
    }
  }

  stop() {
    super.stop();
    this.currentGesture = "NONE";
    this.candidateGesture = "NONE";
    this.candidateFrames = 0;
  }
}
