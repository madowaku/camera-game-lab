import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { BodyInput } from "./bodyInput.js";
import { MouthState, noteEaterSignal } from "../noteEater/signals.js";
import { faceFrame } from "../softServe/signals.js";

export class NoteEaterInput extends BodyInput {
  constructor(video, { onFrame = () => {}, onStatus } = {}) {
    super(video, { onStatus }); this.onFrame = onFrame; this.mouthState = new MouthState(); this.lastInference = -Infinity;
  }
  createRecognizer(vision, delegate) {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate },
      runningMode: "VIDEO", numFaces: 2, minFaceDetectionConfidence: .5,
      minFacePresenceConfidence: .5, minTrackingConfidence: .5,
      outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
    });
  }
  inferFrame(now) {
    if (now - this.lastInference < 50) return undefined;
    this.lastInference = now;
    return this.recognizer.detectForVideo(this.video, now);
  }
  processResult(result, now) {
    if (result === undefined) return;
    const sample = noteEaterSignal(result, (this.video.videoWidth || 1) / (this.video.videoHeight || 1));
    const state = this.mouthState.update(sample?.ratio, now);
    this.onFrame(sample ? { ...sample, state, face: faceFrame(result), at: now } : { state: "UNKNOWN", face: null, faces: result?.faceLandmarks?.length ?? 0, at: now });
  }
  stop() { super.stop(); this.mouthState.reset(); this.lastInference = -Infinity; this.onFrame({ state: "UNKNOWN", face: null, at: -Infinity }); }
}
