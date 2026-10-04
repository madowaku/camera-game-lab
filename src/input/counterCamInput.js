import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { readBoxingPose } from '../counterCam/pose.js';
export class CounterCamInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.onPose = options.onPose ?? (() => {}); this.lastInference = -Infinity; }
  createRecognizer(vision, delegate) {
    return PoseLandmarker.createFromOptions(vision, { baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate },
      runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 });
  }
  inferFrame(at) { if (at - this.lastInference < 50) return null; this.lastInference = at; return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) { if (result) this.onPose(readBoxingPose(result.landmarks?.[0], at, this.video.videoWidth / this.video.videoHeight || 9 / 16)); }
  stop() { super.stop(); this.lastInference = -Infinity; this.onPose(null); }
}
