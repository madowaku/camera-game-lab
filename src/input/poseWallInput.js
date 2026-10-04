import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { PoseTracker } from '../poseWall/poses.js';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export class PoseWallInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.onPose = options.onPose ?? (() => {}); this.tracker = new PoseTracker(); this.lastInferenceAt = -Infinity; }
  createRecognizer(vision, delegate) {
    return PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 });
  }
  inferFrame(at) { if (at - this.lastInferenceAt < 50) return null; this.lastInferenceAt = at; return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) { if (result) this.onPose(this.tracker.update(result.landmarks?.[0], at, this.video.videoWidth / this.video.videoHeight || .6)); }
  stop() { super.stop(); this.tracker.reset(); this.lastInferenceAt = -Infinity; this.onPose(null); }
}
