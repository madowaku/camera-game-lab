import { FaceInput } from "./faceInput.js";
import { nosePosition } from "./ghostPosition.js";

export class GhostInput extends FaceInput {
  constructor(video, { onPosition = () => {}, onStatus } = {}) {
    super(video, { onStatus }); this.onPosition = onPosition;
  }
  async createRecognizer(vision, delegate) {
    const model = await super.createRecognizer(vision, delegate);
    try { await model.setOptions({ numFaces: 2 }); return model; }
    catch (error) { model.close(); throw error; }
  }
  processResult(result, timestamp) { this.onPosition(nosePosition(result), timestamp); }
  stop() { super.stop(); this.onPosition?.(null); }
}
