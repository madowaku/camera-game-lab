import { HandLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from '../input/bodyInput.js';
import { SIZE } from './core.js';

export function projectTip(result, videoWidth, videoHeight) {
  const tip = result?.landmarks?.[0]?.[8];
  if (!Number.isFinite(tip?.x) || !Number.isFinite(tip?.y) || !(videoWidth > 0 && videoHeight > 0)) return null;
  const scale = Math.max(SIZE / videoWidth, SIZE / videoHeight);
  const p = { x: (1 - tip.x) * videoWidth * scale - (videoWidth * scale - SIZE) / 2, y: tip.y * videoHeight * scale - (videoHeight * scale - SIZE) / 2 };
  return p.x >= 0 && p.x <= SIZE && p.y >= 0 && p.y <= SIZE ? p : null;
}

export class MaruInput extends BodyInput {
  createRecognizer(vision, delegate) {
    return HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
  }
  inferFrame(at) {
    if (!this.trackingEnabled || at - (this.lastInference ?? -Infinity) < 40) return null;
    this.lastInference = at; return this.recognizer.detectForVideo(this.video, at);
  }
  processResult(result, at) { if (result) this.onResult(result, at); }
  stop() { super.stop(); this.lastInference = -Infinity; }
}
