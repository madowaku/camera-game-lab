import { FaceLandmarker, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { AVATAR_QUALITY } from '../avatar/runtime/AdaptiveQuality.js';
const ROOT = 'https://storage.googleapis.com/mediapipe-models/';
// One stream and one pass per model. Only the opted-in test creates these models.
export class PuppetInput extends BodyInput {
  constructor(video, { onFrame = () => {}, quality = 'MEDIUM', ...options } = {}) {
    super(video, options); this.onFrame = onFrame; this.quality = quality; this.lastInference = -Infinity;
  }
  get cameraConstraints() { return { audio: false, video: { facingMode: { exact: 'user' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } } }; }
  async createRecognizer(vision, delegate) {
    const models = {}, config = AVATAR_QUALITY[this.quality] ?? AVATAR_QUALITY.MEDIUM;
    const options = path => ({ baseOptions: { modelAssetPath: ROOT + path, delegate }, runningMode: 'VIDEO' });
    try {
      if (config.pose) models.pose = await PoseLandmarker.createFromOptions(vision, { ...options('pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'), numPoses: 1, outputSegmentationMasks: false, minPoseDetectionConfidence: .5, minPosePresenceConfidence: .5, minTrackingConfidence: .5 });
      if (config.face) models.face = await FaceLandmarker.createFromOptions(vision, { ...options('face_landmarker/face_landmarker/float16/1/face_landmarker.task'), numFaces: 2, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
      if (config.hands) models.hands = await HandLandmarker.createFromOptions(vision, { ...options('hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'), numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
      return { models, detect: (video, timestamp) => Object.fromEntries(Object.entries(models).map(([key, model]) => [key, model.detectForVideo(video, timestamp)])),
        close: () => { Object.values(models).forEach(model => model.close()); } };
    } catch (error) { Object.values(models).forEach(model => model.close()); throw error; }
  }
  setQuality(level) {
    if (!(level in AVATAR_QUALITY)) return;
    this.quality = level; const config = AVATAR_QUALITY[level];
    // Downgrade without starting a second stream or constructing new models.
    for (const key of ['face', 'hands']) if (!config[key] && this.recognizer?.models[key]) {
      this.recognizer.models[key].close(); delete this.recognizer.models[key];
    }
  }
  inferFrame(now) {
    if (this.paused) return null;
    if (now - this.lastInference < 1000 / (AVATAR_QUALITY[this.quality] ?? AVATAR_QUALITY.MEDIUM).inferenceHz) return null;
    this.lastInference = now; return this.recognizer.detect(this.video, now);
  }
  processResult(result, timestamp) { if (result) this.onFrame({ ...result, aspect: (this.video.videoWidth || 1) / (this.video.videoHeight || 1) }, timestamp); }
  stop() { super.stop(); this.lastInference = -Infinity; }
}
