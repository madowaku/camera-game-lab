import { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { openRearCamera } from './rearCamera.js';
const model = kind => `https://storage.googleapis.com/mediapipe-models/${kind}_landmarker/${kind}_landmarker${kind === 'pose' ? '_lite' : ''}/float16/1/${kind}_landmarker${kind === 'pose' ? '_lite' : ''}.task`;

export class InstrumentInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.onFrame = options.onFrame ?? (() => {}); this.lastInference = -Infinity; }
  get cameraConstraints() { return { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 }, height: { ideal: 1280 } } }; }
  async openCamera(devices, constraints, checkActive) {
    return openRearCamera(devices, constraints, checkActive);
  }
  createRecognizer(vision, delegate) { return HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: model('hand'), delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 }); }
  inferFrame(at) { if (at - this.lastInference < 40) return undefined; this.lastInference = at; return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) { if (result !== undefined) this.onFrame(result?.landmarks?.[0]?.[8] ?? null, at); }
  stop() { super.stop(); this.lastInference = -Infinity; this.onFrame(null, performance.now()); }
}
export class MaestroPoseInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.onFrame = options.onFrame ?? (() => {}); this.lastInference = -Infinity; }
  createRecognizer(vision, delegate) { return PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: model('pose'), delegate }, runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 }); }
  inferFrame(at) { if (at - this.lastInference < 60) return undefined; this.lastInference = at; return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) { if (result !== undefined) this.onFrame(result?.landmarks?.[0] ?? null, at); }
  stop() { super.stop(); this.lastInference = -Infinity; this.onFrame(null, performance.now()); }
}
