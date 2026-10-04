import { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { ClockTracker } from '../humanClock/tracking.js';
const ROOT = 'https://storage.googleapis.com/mediapipe-models/';
export class HumanClockInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.onSample = options.onSample ?? (() => {}); this.tracker = new ClockTracker(); this.lastInferenceAt = -Infinity; }
  async createRecognizer(vision, delegate) {
    const hand = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: ROOT + 'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
    try {
      const pose = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: ROOT + 'pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate }, runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 });
      return { detectForVideo: (video, at) => ({ hand: hand.detectForVideo(video, at), pose: pose.detectForVideo(video, at) }), close: () => { try { hand.close(); } finally { pose.close(); } } };
    } catch (error) { hand.close(); throw error; }
  }
  inferFrame(at) { if (at - this.lastInferenceAt < 50) return null; this.lastInferenceAt = at; return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) { if (result) this.onSample(this.tracker.update(result, at, this.video.videoWidth / this.video.videoHeight || .75)); }
  stop() { super.stop(); this.tracker.reset(); this.lastInferenceAt = -Infinity; this.onSample(null); }
}
