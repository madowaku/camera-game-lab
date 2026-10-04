import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { FaceZoneTracker } from "./faceZones.js";
import { HeadNodTracker, extractHeadPitch } from "./headNod.js";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export function extractFaceXs(result) {
  // Two faces pause input instead of silently selecting another player.
  const faces = result?.faceLandmarks ?? [];
  if (faces.length !== 1) return [];
  const cheeks = [faces[0][234], faces[0][454]];
  if (cheeks.some((p) => !p || !Number.isFinite(p.x) || p.x < 0 || p.x > 1)) return [];
  return [1 - (cheeks[0].x + cheeks[1].x) / 2];
}

export class FaceZoneInput extends BodyInput {
  constructor(video, { onStatus, config } = {}) {
    super(video, { onStatus });
    this.tracker = new FaceZoneTracker(config);
    this.nodTracker = new HeadNodTracker(config);
  }

  createRecognizer(vision, delegate) {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numFaces: 2,
      minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: true
    });
  }

  inferFrame(timestamp) { return this.recognizer.detectForVideo(this.video, timestamp); }
  processResult(result, timestamp) {
    const xs = extractFaceXs(result);
    const face = this.tracker.update(xs, timestamp);
    const centered = face.ready ? face.neutral : xs.length === 1 && xs[0] >= 0.25 && xs[0] <= 0.75;
    this.nodTracker.update(xs.length === 1 ? extractHeadPitch(result) : null, timestamp, centered);
  }
  sample(timestamp) {
    const face = this.tracker.sample(timestamp), nod = this.nodTracker.sample(timestamp);
    const visible = face.visible && nod.visible;
    return { ...face, ...nod, visible, presence: visible ? "FACE_PRESENT" : "FACE_LOST",
      ready: face.ready && nod.ready, neutral: face.neutral && nod.upright,
      calibrationProgress: Math.min(face.calibrationProgress, nod.calibrationProgress) };
  }
  recalibrate() { this.tracker.reset(); this.nodTracker.reset(); }
  stop() { super.stop(); this.recalibrate(); }
}
