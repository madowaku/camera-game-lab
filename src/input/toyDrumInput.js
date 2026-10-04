import { HandLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { PalmTracker } from "../toyDrum/tracking.js";
export class ToyDrumInput extends BodyInput {
  constructor(video, { onFrame, onStatus } = {}) { super(video, { onStatus }); this.tracker = new PalmTracker(); this.onFrame = onFrame ?? (() => {}); }
  createRecognizer(vision, delegate) {
    return HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate }, runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: .45, minHandPresenceConfidence: .45, minTrackingConfidence: .45 });
  }
  inferFrame(timestamp) { return this.recognizer.detectForVideo(this.video, timestamp); }
  processResult(result, timestamp) { this.onFrame(this.tracker.update(result, timestamp), timestamp); }
  stop() { super.stop(); this.tracker.reset(); }
}
