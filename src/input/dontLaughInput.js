import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { measureFace, faceInFrame, SmileTracker } from '../dontLaugh/signals.js';
export class DontLaughInput extends BodyInput {
  constructor(video, { onFrame, onStatus } = {}) { super(video, { onStatus }); this.onFrame = onFrame ?? (() => {}); this.tracker = new SmileTracker(); this.lastInference = -Infinity; }
  createRecognizer(vision, delegate) {
    return FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate },
      runningMode: 'VIDEO', numFaces: 2, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, minTrackingConfidence: .5, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: false });
  }
  inferFrame(timestamp) { if (timestamp - this.lastInference < 40) return null; this.lastInference = timestamp; return this.recognizer.detectForVideo(this.video, timestamp); }
  processResult(result, timestamp) {
    if (!result) return;
    const aspect = (this.video.videoWidth || 1) / (this.video.videoHeight || 1), signal = measureFace(result, aspect);
    this.onFrame({ ...this.tracker.update(faceInFrame(signal, aspect) ? signal : null, timestamp), signal, multiple: result.faceLandmarks?.length > 1 }, timestamp);
  }
  stop() { super.stop(); this.tracker.reset(); this.lastInference = -Infinity; }
}
