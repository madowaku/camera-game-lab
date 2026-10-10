import { HandLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from './bodyInput.js';
import { wheelRoll } from '../tiltTurbo/wheel.js';

const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
// Reuse BodyInput camera ownership and GPU->CPU fallback. Never run a second
// face model alongside hands solely for steering.
export class TiltTurboHandsInput extends BodyInput {
  createRecognizer(vision, delegate) {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL, delegate }, runningMode:'VIDEO', numHands:2,
      minHandDetectionConfidence:.5, minHandPresenceConfidence:.5, minTrackingConfidence:.5,
    });
  }
  inferFrame(at) { return this.recognizer.detectForVideo(this.video,at); }
  processResult(result,at) {
    const hands = result?.landmarks ?? [];
    const raw = wheelRoll(hands,this.video.videoWidth||1,this.video.videoHeight||1);
    this.onResult({ raw, points:null, at, hands:hands.length });
  }
}
