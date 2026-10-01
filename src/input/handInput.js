import { BodyInput } from "./bodyInput.js";

const GESTURE_MAP = {
  Open_Palm: "OPEN",
  Closed_Fist: "FIST",
  Victory: "PEACE"
};

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function normalizeGesture(result) {
  const landmarks = result?.landmarks?.[0];

  if (landmarks?.length >= 10) {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];

    const handScale = distance(wrist, middleMcp);
    const pinchDistance = distance(thumbTip, indexTip);

    // Relative-to-hand-size threshold so PINCH behaves more consistently
    // when the player moves closer to or farther from the camera.
    if (handScale > 0.001 && pinchDistance / handScale < 0.3) {
      return "PINCH";
    }
  }

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
