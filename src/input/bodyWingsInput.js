import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { extractWingsPose } from "./bodyWingsPose.js";

const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
export class BodyWingsInput extends BodyInput {
  constructor(video, options = {}) {
    super(video, options); this.onPose = options.onPose ?? (() => {});
    this.mask = document.createElement("canvas"); this.maskReady = false; this.lastInferenceAt = -Infinity;
  }
  createRecognizer(vision, delegate) {
    return PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: "VIDEO", numPoses: 1, outputSegmentationMasks: true,
      minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 });
  }
  inferFrame(at) {
    if (at - this.lastInferenceAt < 65) return null;
    this.lastInferenceAt = at; return this.recognizer.detectForVideo(this.video, at);
  }
  processResult(result, at) {
    if (!result) return;
    try {
      const pose = extractWingsPose(result.landmarks?.[0], this.video.videoWidth / this.video.videoHeight);
      const mask = result.segmentationMasks?.[0]; this.maskReady = !!(mask && pose);
      if (this.maskReady) {
        if (this.mask.width !== mask.width || this.mask.height !== mask.height) {
          this.mask.width = mask.width; this.mask.height = mask.height;
          this.maskImage = this.mask.getContext("2d").createImageData(mask.width, mask.height);
        }
        const values = mask.getAsFloat32Array(), pixels = this.maskImage.data;
        for (let i = 0; i < values.length; i++) {
          pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
          pixels[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, (values[i] - .22) / .55)) * 255);
        }
        this.mask.getContext("2d").putImageData(this.maskImage, 0, 0);
      }
      this.onPose(pose ? { ...pose, at } : null);
    } finally { result.segmentationMasks?.forEach(mask => mask.close()); }
  }
  stop() { super.stop(); this.maskReady = false; this.lastInferenceAt = -Infinity; this.onPose(null); }
}
