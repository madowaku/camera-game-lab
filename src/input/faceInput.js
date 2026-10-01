import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const CALIBRATION_MS = 700;
const MAX_FRAME_GAP_MS = 300;
const STATE_HOLD_MS = 90;
const OPEN_DELTA = 0.18;
const CLOSE_DELTA = 0.1;
const clamp = (value) => Math.max(0, Math.min(1, value));

function mouthRatio(result, video) {
  const points = result?.faceLandmarks?.[0];
  if (!points) return null;
  const lips = [13, 14, 61, 291].map((index) => points[index]);
  if (lips.some((point) => !point || !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) || point.x < 0 || point.x > 1 ||
    point.y < 0 || point.y > 1)) return null;

  // Inner lip gap / mouth width removes distance to the camera. Correct x for
  // the video aspect ratio before measuring; distances also tolerate head roll.
  const aspect = (video.videoWidth || 1) / (video.videoHeight || 1);
  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const width = distance(lips[2], lips[3]);
  if (width < 0.025) return null;
  const ratio = distance(lips[0], lips[1]) / width;
  return Number.isFinite(ratio) && ratio <= 1.5 ? ratio : null;
}

// Shares camera ownership, cancellation, GPU fallback and teardown with hand
// input. Only the MediaPipe task and the signal extracted from it differ.
export class FaceInput extends BodyInput {
  constructor(video, { onStatus, onMouth } = {}) {
    super(video, { onStatus });
    this.onMouth = onMouth ?? (() => {});
    this.neutralRatio = null;
    this.currentMouth = {
      visible: false,
      calibrated: false,
      ready: false,
      open: false,
      openness: 0,
      progress: 0
    };
    this.resetTracking();
  }

  createRecognizer(vision, delegate) {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    });
  }

  inferFrame(timestamp) {
    return this.recognizer.detectForVideo(this.video, timestamp);
  }

  processResult(result, timestamp) {
    const elapsed = this.lastFrameAt === null ? Infinity : timestamp - this.lastFrameAt;
    if (elapsed > MAX_FRAME_GAP_MS || elapsed < 0) this.resetTracking();
    this.lastFrameAt = timestamp;

    const ratio = mouthRatio(result, this.video);
    if (ratio === null) {
      this.resetTracking();
      this.emitMouth(false);
      return;
    }

    const blend = this.filteredRatio === null ? 1 : 1 - Math.exp(-elapsed / 65);
    this.filteredRatio = this.filteredRatio === null
      ? ratio
      : this.filteredRatio + (ratio - this.filteredRatio) * blend;

    if (this.neutralRatio === null) {
      this.calibrate(ratio, timestamp);
    } else {
      this.updateState(timestamp);
    }
    this.emitMouth(true);
  }

  calibrate(ratio, timestamp) {
    // Ask for a relaxed, closed mouth. A clearly open mouth must never become
    // the neutral baseline, even if the player holds it still.
    if (ratio > 0.16) {
      this.calibrationSamples = [];
      this.calibrationProgress = 0;
      return;
    }

    const samples = this.calibrationSamples;
    if (samples.some((sample) => Math.abs(sample.ratio - ratio) > 0.05)) {
      samples.length = 0;
    }
    samples.push({ ratio, timestamp });
    this.calibrationProgress = Math.min(
      1,
      (timestamp - samples[0].timestamp) / CALIBRATION_MS,
      (samples.length - 1) / 4
    );
    if (this.calibrationProgress < 1) return;

    const values = samples.map((sample) => sample.ratio).sort((a, b) => a - b);
    this.neutralRatio = values[Math.floor(values.length / 2)];
    this.filteredRatio = this.neutralRatio;
    this.stateKnown = true;
    this.mouthOpen = false;
    this.calibrationSamples = [];
  }

  updateState(timestamp) {
    const delta = this.filteredRatio - this.neutralRatio;
    const candidate = delta >= OPEN_DELTA ? true
      : delta <= CLOSE_DELTA ? false
        : this.stateKnown ? this.mouthOpen : null;

    if (candidate === null || (this.stateKnown && candidate === this.mouthOpen)) {
      this.pendingState = null;
      this.pendingSince = null;
      return;
    }
    if (this.pendingState !== candidate) {
      this.pendingState = candidate;
      this.pendingSince = timestamp;
      return;
    }
    if (timestamp - this.pendingSince >= STATE_HOLD_MS) {
      this.mouthOpen = candidate;
      this.stateKnown = true;
      this.pendingState = null;
      this.pendingSince = null;
    }
  }

  emitMouth(visible) {
    const calibrated = this.neutralRatio !== null;
    const ready = visible && calibrated && this.stateKnown;
    this.currentMouth = {
      visible,
      calibrated,
      ready,
      open: ready && this.mouthOpen,
      openness: visible ? clamp(((this.filteredRatio ?? 0) - (this.neutralRatio ?? 0)) / 0.45) : 0,
      progress: calibrated ? 1 : this.calibrationProgress
    };
    // Consumers must gate decisions on ready; loss of tracking is not CLOSED.
    this.onMouth({ ...this.currentMouth });
  }

  resetTracking() {
    this.lastFrameAt = null;
    this.filteredRatio = null;
    this.stateKnown = false;
    this.mouthOpen = false;
    this.pendingState = null;
    this.pendingSince = null;
    this.calibrationSamples = [];
    this.calibrationProgress = 0;
  }

  recalibrate() {
    this.neutralRatio = null;
    this.resetTracking();
    this.emitMouth(false);
  }

  stop() {
    super.stop();
    this.recalibrate();
  }
}
