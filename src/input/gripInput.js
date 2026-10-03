import { BodyInput } from "./bodyInput.js";
import { GripState } from "./gripState.js";

export class GripInput extends BodyInput {
  constructor(video, { onFrame, onStatus } = {}) { super(video, { onStatus }); this.grip = new GripState(); this.onFrame = onFrame ?? (() => {}); }
  processResult(result, timestamp) { this.onFrame(this.grip.update(result, timestamp)); }
  stop() { super.stop(); this.grip.reset(); }
}
