import { GestureRecognizer } from '@mediapipe/tasks-vision';
import { BodyInput } from '../input/bodyInput.js';
import { geometry, project } from './rules.js';
export class DuelInput extends BodyInput {
  constructor(video, stage, options) { super(video, options); this.stage = stage; }
  get cameraConstraints() { return { audio: false, video: { facingMode: { exact: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } } }; }
  createRecognizer(vision, delegate) {
    return GestureRecognizer.createFromOptions(vision, { baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task', delegate },
      runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
  }
  processResult(result, timestamp) {
    const { width, height } = this.stage.getBoundingClientRect();
    if (!width || !height) return;
    const convert = p => project(p, this.video.videoWidth || 1280, this.video.videoHeight || 720, width, height);
    this.onResult((result.landmarks ?? []).filter(l => l.length > 8 &&
      [l[4], l[8]].every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)))
      .map(l => geometry(convert(l[4]), convert(l[8]))), timestamp);
  }
}
