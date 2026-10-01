import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { DUO_CONFIG } from "./duoConfig.js";
import { DuoTracker } from "./duoTracker.js";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export function extractDuoFaces(result, aspect = 1) {
  return (result?.faceLandmarks ?? []).slice(0, 2).flatMap((points) => {
    const required = [1, 13, 14, 33, 61, 133, 159, 145, 263, 291, 362, 386, 374];
    if (required.some((index) => !points[index] || !Number.isFinite(points[index].x) || !Number.isFinite(points[index].y))) return [];
    const distance = (a, b) => Math.hypot((points[a].x - points[b].x) * aspect, points[a].y - points[b].y);
    const width = distance(61, 291);
    if (width < 0.025) return [];
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const scale = bottom - top;
    if (scale < 0.04 || scale > 1 || [left, right, top, bottom].some((v) => !Number.isFinite(v) || v < 0 || v > 1)) return [];
    return [{
      // All coordinates are mirrored screen coordinates, matching the video.
      x: 1 - (left + right) / 2, y: (top + bottom) / 2, scale,
      tilt: Math.atan2(points[33].y - points[263].y, (points[263].x - points[33].x) * aspect),
      mouth: distance(13, 14) / width,
      eyesClosed: distance(159, 145) / Math.max(0.001, distance(33, 133)) < DUO_CONFIG.eyesClosedRatio &&
        distance(386, 374) / Math.max(0.001, distance(362, 263)) < DUO_CONFIG.eyesClosedRatio,
      box: { x: 1 - right, y: top, width: right - left, height: scale }, confidence: 1
    }];
  });
}

export class DuoFaceInput extends BodyInput {
  constructor(video, options = {}) {
    super(video, options);
    this.tracker = new DuoTracker();
    this.lastInferenceAt = -Infinity;
  }

  get cameraConstraints() {
    return { audio: false, video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } };
  }

  createRecognizer(vision, delegate) {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numFaces: 2,
      minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false
    });
  }

  inferFrame(timestamp) {
    if (timestamp - this.lastInferenceAt < DUO_CONFIG.inferenceIntervalMs) return null;
    this.lastInferenceAt = timestamp;
    return this.recognizer.detectForVideo(this.video, timestamp);
  }

  processResult(result, timestamp) {
    if (!result) return;
    this.tracker.update(extractDuoFaces(result, (this.video.videoWidth || 1) / (this.video.videoHeight || 1)), timestamp);
  }

  sample(timestamp) {
    return { ...this.tracker.advance(timestamp), events: this.tracker.consumeEvents() };
  }

  recalibrate() { this.tracker.recalibrate(); }

  stop() {
    super.stop();
    this.lastInferenceAt = -Infinity;
    this.tracker.reset();
  }
}
