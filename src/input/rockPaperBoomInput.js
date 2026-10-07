import { GestureRecognizer } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { assignHands } from '../rockPaperBoom/tracking.js';
export class RockPaperBoomInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.stageAspect = 9 / 16; this.lastAt = -Infinity; this.hands = []; }
  get cameraConstraints() { return { audio: false, video: { facingMode: { exact: 'environment' }, width: { ideal: 720 }, height: { ideal: 1280 } } }; }
  async openCamera(mediaDevices, constraints, checkActive) {
    // Do not silently substitute a selfie camera when the rear camera is absent.
    const stream = await mediaDevices.getUserMedia(constraints);
    try {
      checkActive(); const mode = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
      if (mode && mode !== 'environment') throw new Error('Rear camera unavailable. Use a phone rear camera or practice.');
      return stream;
    } catch (error) { stream.getTracks().forEach(t => t.stop()); throw error; }
  }
  createRecognizer(vision, delegate) {
    return GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task', delegate },
      runningMode: 'VIDEO', numHands: 4, minHandDetectionConfidence: .55, minHandPresenceConfidence: .55, minTrackingConfidence: .55,
    });
  }
  processResult(result, at) {
    this.hands = assignHands(result, this.video.videoWidth / this.video.videoHeight, this.stageAspect);
    this.detected = result.landmarks?.length ?? 0; this.fps = this.lastAt > 0 ? 1000 / (at - this.lastAt) : 0; this.lastAt = at;
    this.onResult(this.hands, at);
  }
  stop() { super.stop(); this.hands = []; this.lastAt = -Infinity; this.detected = 0; }
}
