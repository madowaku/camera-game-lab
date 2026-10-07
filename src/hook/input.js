import { HandLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from '../input/bodyInput.js';
import { extractPalm } from './signals.js';

// One controller slot is intentional. A large SOLO cast must never migrate
// into the unused slot of a two-player geometric hand allocator.
export class HookInput extends BodyInput {
  constructor(video,{onFrame,onStatus}={}) { super(video,{onStatus}); this.onFrame=onFrame ?? (()=>{}); }
  createRecognizer(vision,delegate) {
    return HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.45,minHandPresenceConfidence:.45,minTrackingConfidence:.45});
  }
  inferFrame(timestamp) { return this.recognizer.detectForVideo(this.video,timestamp); }
  processResult(result,timestamp) { this.onFrame(extractPalm(result),timestamp); }
}
