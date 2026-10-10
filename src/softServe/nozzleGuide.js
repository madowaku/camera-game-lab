// P2 visual-only nozzle alignment coach. Gameplay always receives unsnapped hand coordinates.
// Mirrors the existing ready gate solely for truthful color/feedback.
import { magneticSnap, SNAP_STATES } from '../inputFeel/index.js';

export const NOZZLE_GUIDE_SETTINGS = Object.freeze({
  radius: .17, releaseRadius: .21, snapRadius: .022, strength: .7,
});
const valid = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
  p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

export class NozzleGuide {
  constructor(settings = NOZZLE_GUIDE_SETTINGS) {
    this.settings = settings;
    this.reset();
  }
  reset() { this.state = SNAP_STATES.FREE; this.visual = null; return null; }
  update(rawHand, { phase = 'ready', paused = false } = {}) {
    if (phase !== 'ready' || paused || !valid(rawHand)) return this.reset();
    // Horizontal guide only. The actual game ready zone must use raw input.
    const target = { x: .5, y: rawHand.y };
    const next = magneticSnap(rawHand, target, { ...this.settings, state: this.state });
    this.state = next.state;
    const inReadyZone = Math.abs(rawHand.x - .5) < .14 &&
      rawHand.y >= .38 && rawHand.y <= .84;
    this.visual = {
      raw: { x: rawHand.x, y: rawHand.y },
      assisted: { x: next.x, y: rawHand.y },
      snapped: next.state === SNAP_STATES.SNAPPED,
      aligned: inReadyZone,
      state: next.state,
      displacement: Math.abs(next.x - rawHand.x),
    };
    return this.visual;
  }
}
