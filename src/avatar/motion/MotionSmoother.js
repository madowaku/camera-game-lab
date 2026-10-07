import { cloneFrame, blendValues } from './MotionFrame.js';
export const SMOOTHING_PRESETS = Object.freeze({ GAME_FAST: 35, GAME_NORMAL: 75, CREATOR_SMOOTH: 145 });
export class MotionSmoother {
  constructor(preset = 'GAME_NORMAL') { this.setPreset(preset); this.reset(); }
  setPreset(preset) { this.preset = preset in SMOOTHING_PRESETS ? preset : 'GAME_NORMAL'; }
  reset() { this.frame = null; }
  update(target, dt) {
    const alpha = 1 - Math.exp(-Math.max(0, Math.min(.1, dt)) * 1000 / SMOOTHING_PRESETS[this.preset]);
    const out = this.frame ? blendValues(this.frame, target, alpha) : cloneFrame(target);
    out.timestamp = target.timestamp; out.tracking = { ...target.tracking };
    for (const side of ['left', 'right']) out.hands[side].source = target.hands[side].source;
    this.frame = out; return cloneFrame(out);
  }
}
