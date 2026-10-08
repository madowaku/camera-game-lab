import { HandLandmarker } from '@mediapipe/tasks-vision';
import { BodyInput } from '../input/bodyInput.js';

// Feed overlay uses the whole camera sensor frame, mirrored once for intuitive motion.
// Unlike a rendered video cover-crop, no pixels need to be cropped here.
export function projectHandCursor(result, width, height) {
  const tip = result?.landmarks?.[0]?.[8];
  if (!(width > 0 && height > 0) || !Number.isFinite(tip?.x) || !Number.isFinite(tip?.y)) return null;
  const x = (1 - tip.x) * width, y = tip.y * height;
  return x >= 0 && x <= width && y >= 0 && y <= height ? { x, y } : null;
}

export class CameraUiInput extends BodyInput {
  createRecognizer(vision, delegate) {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate
      },
      runningMode: 'VIDEO', numHands: 1,
      minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5
    });
  }
  inferFrame(at) {
    if (at - (this.lastInference ?? -Infinity) < 40) return null;
    this.lastInference = at;
    return this.recognizer.detectForVideo(this.video, at);
  }
  processResult(result, at) { if (result) this.onResult(result, at); }
  stop() { super.stop(); this.lastInference = -Infinity; }
}
