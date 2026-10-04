import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { headRoll } from '../tiltTurbo/input.js';
export class TiltTurboInput extends BodyInput {
  async createRecognizer(vision, delegate) {
    const model = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate },
      runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, minTrackingConfidence: .5,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    });
    // Compile the detection graph while the loading screen is visible, before
    // camera calibration starts. Cold WebGL shader compilation can take seconds.
    try {
      const frame = document.createElement('canvas'); frame.width = 192; frame.height = 192;
      const c = frame.getContext('2d'); c.fillStyle = '#fff7df'; c.fillRect(0, 0, 192, 192);
      model.detectForVideo(frame, performance.now());
      return model;
    } catch (error) { model.close(); throw error; }
  }
  inferFrame(at) { return this.recognizer.detectForVideo(this.video, at); }
  processResult(result, at) {
    const points = result?.faceLandmarks?.[0];
    const raw = headRoll(points, this.video.videoWidth || 1, this.video.videoHeight || 1);
    this.onResult({ raw, points: raw === null ? null : points, at });
  }
}
