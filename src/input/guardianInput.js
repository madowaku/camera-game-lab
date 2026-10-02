import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { extractGuardianPose, GuardianGestures } from "./guardianGestures.js";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export class GuardianInput extends BodyInput {
  constructor(video, options = {}) {
    super(video, options);
    this.gestures = new GuardianGestures();
    this.pose = null;
    this.lastInferenceAt = -Infinity;
    this.mask = document.createElement("canvas");
    this.maskContext = this.mask.getContext("2d");
    this.maskReady = false;
    this.pendingActions = [];
  }
  createRecognizer(vision, delegate) {
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numPoses: 1,
      minPoseDetectionConfidence: 0.55, minPosePresenceConfidence: 0.55, minTrackingConfidence: 0.55,
      outputSegmentationMasks: true
    });
  }
  inferFrame(timestamp) {
    if (timestamp - this.lastInferenceAt < 66) return null;
    this.lastInferenceAt = timestamp;
    return this.recognizer.detectForVideo(this.video, timestamp);
  }
  processResult(result, timestamp) {
    if (!result) return;
    try {
      this.pose = extractGuardianPose(result.landmarks?.[0], this.video.videoWidth / this.video.videoHeight);
      this.pendingActions.push(...this.gestures.update(this.pose, timestamp));
      const mask = result.segmentationMasks?.[0];
      this.maskReady = Boolean(mask && this.pose);
      if (this.maskReady) {
        if (this.mask.width !== mask.width || this.mask.height !== mask.height) {
          this.mask.width = mask.width; this.mask.height = mask.height;
          this.maskImage = this.maskContext.createImageData(mask.width, mask.height);
        }
        const values = mask.getAsFloat32Array(), pixels = this.maskImage.data;
        for (let i = 0; i < values.length; i++) {
          pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
          pixels[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (values[i] - 0.25) / 0.55)) * 255);
        }
        this.maskContext.putImageData(this.maskImage, 0, 0);
      }
    } finally {
      result.segmentationMasks?.forEach((mask) => mask.close());
    }
  }
  sample(timestamp) {
    const present = this.running && Boolean(this.pose) && timestamp - this.lastInferenceAt < 500;
    const actions = this.pendingActions.splice(0);
    return { present, pose: present ? this.pose : null, actions: present ? actions : [] };
  }
  clearActions() { this.pendingActions.length = 0; this.gestures.reset(); }
  stop() {
    super.stop();
    this.pose = null; this.maskReady = false; this.lastInferenceAt = -Infinity;
    this.clearActions();
  }
}
