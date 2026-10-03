import { BodyInput } from '../input/bodyInput.js';
import { openFrontCamera } from '../input/frontCamera.js';
import { CargoFrame, projectCargo } from './cargoFrame.js';

export class SmugglerInput extends BodyInput {
  constructor(video, stage, { onStatus } = {}) { super(video, { onStatus }); this.stage = stage; this.facing = 'environment'; this.mirrored = false; this.cargo = new CargoFrame(); }
  get cameraConstraints() { return { audio: false, video: { facingMode: { exact: this.facing }, width: { ideal: 720 }, height: { ideal: 1280 } } }; }
  async openCamera(mediaDevices, constraints, checkActive) {
    const stream = this.facing === 'user' ? await openFrontCamera(mediaDevices, constraints, checkActive) : await mediaDevices.getUserMedia(constraints);
    try {
      checkActive();
      const actual = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
      if (this.facing === 'environment' && actual && actual !== 'environment') throw new Error('Rear camera unavailable');
      this.mirrored = actual === 'user' || (!actual && this.facing === 'user');
      this.video.classList.toggle('is-mirrored', this.mirrored);
      return stream;
    } catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
  }
  processResult(result, timestamp) {
    const hand = result?.landmarks?.[0];
    const palm = hand?.[0] && hand?.[5] && hand?.[17] ? { x: (hand[0].x + hand[5].x + hand[17].x) / 3, y: (hand[0].y + hand[5].y + hand[17].y) / 3 } : null;
    const bounds = this.stage.getBoundingClientRect();
    const point = palm && this.video.videoWidth && bounds.width ? projectCargo(palm, this.video.videoWidth, this.video.videoHeight, bounds.width, bounds.height, this.mirrored) : null;
    this.cargo.update(point, timestamp);
  }
  stop() { super.stop(); this.cargo.reset(); }
}
