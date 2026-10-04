import { HandLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { PalmTracker } from "../palmPong/tracking.js";
export class PalmPongInput extends BodyInput {
  constructor(video, options = {}) { super(video, options); this.tracker = new PalmTracker(); }
  get cameraConstraints() { return { audio: false, video: { facingMode: { exact: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } } }; }
  createRecognizer(vision, delegate) {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate },
      runningMode: "VIDEO", numHands: 3, minHandDetectionConfidence: .45, minHandPresenceConfidence: .45, minTrackingConfidence: .45,
    });
  }
  inferFrame(timestamp) { return this.recognizer.detectForVideo(this.video, timestamp); }
  processResult(result, timestamp) { this.tracker.update(result, timestamp, this.video.videoWidth / this.video.videoHeight || 16 / 9); }
  stop() { super.stop(); this.tracker.reset(); }
}
