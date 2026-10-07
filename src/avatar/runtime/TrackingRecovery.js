import { idleMotionFrame, cloneFrame, blendValues } from '../motion/MotionFrame.js';
const channels = { face: ['head', 'face'], pose: ['body'], leftHand: ['hands.left'], rightHand: ['hands.right'] };
const get = (f, path) => path ? path.split('.').reduce((o, k) => o[k], f) : f;
const put = (f, path, value) => { const keys = path.split('.'), key = keys.pop(); get(f, keys.join('.'))[key] = value; };
// Independent channels: a hidden hand must not freeze a visible face.
export class TrackingRecovery {
  constructor({ keepMs = 200, idleMs = 700, recoverMs = 180, staleMs = 180 } = {}) {
    Object.assign(this, { keepMs, idleMs, recoverMs, staleMs }); this.reset();
  }
  reset() { this.frame = null; this.states = {}; this.lastNow = null; this.status = {}; }
  sample(input, now) {
    if (this.lastNow !== null && now < this.lastNow) this.reset();
    this.lastNow = now;
    const idle = idleMotionFrame(now), out = cloneFrame(idle);
    const fresh = input && now >= input.timestamp && now - input.timestamp <= this.staleMs;
    for (const [channel, paths] of Object.entries(channels)) {
      const live = !!(fresh && (input.tracking[channel] || (channel === 'pose' && input.tracking.face)));
      let state = this.states[channel];
      if (live) {
        if (!state?.live) state = this.states[channel] = { live: true, since: now, from: this.frame ? cloneFrame(this.frame) : cloneFrame(idle) };
        state.lastSeen = input.timestamp;
        const blend = Math.min(1, (now - state.since) / this.recoverMs);
        paths.forEach(path => put(out, path, blendValues(get(state.from, path), get(input, path), blend)));
        this.status[channel] = blend < 1 ? 'RECOVER' : 'LIVE';
      } else {
        if (state) state.live = false;
        const lost = state ? Math.max(0, now - state.lastSeen) : Infinity;
        const mix = Math.min(1, Math.max(0, (lost - this.keepMs) / (this.idleMs - this.keepMs)));
        // Hold the last rendered value, avoiding a jump to the unsmoothed input.
        if (state && !state.lostFrom) state.lostFrom = this.frame ? cloneFrame(this.frame) : cloneFrame(idle);
        paths.forEach(path => put(out, path, blendValues(get(state?.lostFrom ?? idle, path), get(idle, path), mix)));
        this.status[channel] = lost <= this.keepMs ? 'KEEP' : lost < this.idleMs ? 'EASE_TO_IDLE' : 'IDLE';
      }
      if (live) state.lostFrom = null;
      out.tracking[channel] = !!(fresh && input.tracking[channel]);
    }
    if (fresh) out.energy = { ...input.energy };
    this.frame = cloneFrame(out); return out;
  }
}
