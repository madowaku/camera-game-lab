import { HandLandmarker, FaceLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { handCenter, mouthSignal, faceFrame } from "../softServe/signals.js";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Both models consume the same front-camera frame and share cancellation/stop.
export class SoftServeInput extends BodyInput {
  constructor(video, { onFrame, onStatus } = {}) { super(video, { onStatus }); this.onFrame = onFrame ?? (() => {}); this.open = false; this.lastInference = -Infinity; }
  async createRecognizer(vision, delegate) {
    const hand = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate }, runningMode: "VIDEO", numHands: 1,
      minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5,
    });
    try {
      const face = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate }, runningMode: "VIDEO", numFaces: 2,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
      });
      return { detect: (video, time) => ({ hands: hand.detectForVideo(video, time), face: face.detectForVideo(video, time) }),
        close: () => { hand.close(); face.close(); } };
    } catch (error) { hand.close(); throw error; }
  }
  inferFrame(timestamp) {
    // Bound dual synchronous inference to 20 Hz; rendering stays independent.
    if (timestamp - this.lastInference < 50) return null;
    this.lastInference = timestamp; return this.recognizer.detect(this.video, timestamp);
  }
  processResult(result, timestamp) {
    if (!result) return;
    const mouth = mouthSignal(result.face, (this.video.videoWidth || 1) / (this.video.videoHeight || 1));
    this.open = !!mouth && (mouth.ratio > .22 || (this.open && mouth.ratio > .13));
    this.onFrame({ hand: handCenter(result.hands), mouth, open: this.open, face: faceFrame(result.face) }, timestamp);
  }
  stop() { super.stop(); this.open = false; this.lastInference = -Infinity; }
}
