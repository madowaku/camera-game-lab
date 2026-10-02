import { FaceInput } from "./faceInput.js";
import { EyeState } from "./eyeState.js";

// Reuses the existing Face Landmarker factory and cancellable BodyInput session.
export class EyeInput extends FaceInput {
  constructor(video, { onFrame, onStatus } = {}) {
    super(video, { onStatus });
    this.eyes = new EyeState(); this.onFrame = onFrame ?? (() => {});
  }
  async createRecognizer(vision, delegate) {
    const model = await super.createRecognizer(vision, delegate);
    try { await model.setOptions({ outputFaceBlendshapes: true }); return model; }
    catch (error) { model.close(); throw error; }
  }
  processResult(result, timestamp) { this.onFrame(this.eyes.update(result, timestamp)); }
  stop() { super.stop(); this.eyes?.reset(); }
}
