// Single track / single gesture edge-triggered reliability state machine.
// Every invocation is fed by a NEW, fresh inference observation.
const finite = Number.isFinite;
const STATES = Object.freeze({ UNARMED: 'UNARMED', READY: 'READY', CANDIDATE: 'CANDIDATE',
  ACTIVE: 'ACTIVE', RELEASE_CANDIDATE: 'RELEASE_CANDIDATE' });
export { STATES as GESTURE_STATES };

function duration(value, fallback) {
  if (value === undefined) return fallback;
  if (!finite(value) || value < 0) throw new RangeError('gesture duration must be nonnegative finite ms');
  return value;
}

export class GestureState {
  constructor({ enterMs = 80, leaveMs = 80, neutralMs = 80 } = {}) {
    this.enterMs = duration(enterMs, 80);
    this.leaveMs = duration(leaveMs, 80);
    this.neutralMs = duration(neutralMs, 80);
    this.reset();
  }
  reset() {
    this.active = false;
    this.armed = false;
    this.phase = STATES.UNARMED;
    this.candidateSince = null;
    this.neutralSince = null;
    this.metric = null;
    this.lastAtMs = null;
  }
  interrupt() {
    // A stopped/lost hand cannot leave a held gameplay action active.
    this.reset();
  }
  // signal: 'active' | 'neutral' | 'unknown'. Anything else is unknown.
  update(signal, atMs, metric = null) {
    if (!finite(atMs) || (this.lastAtMs !== null && atMs <= this.lastAtMs)) return null;
    this.lastAtMs = atMs;
    this.metric = finite(metric) ? metric : null;
    if (signal !== 'active' && signal !== 'neutral') signal = 'unknown';
    if (!this.armed) {
      this.phase = STATES.UNARMED;
      this.candidateSince = null;
      if (signal !== 'neutral') {
        this.neutralSince = null;
        return null;
      }
      this.neutralSince ??= atMs;
      if (atMs - this.neutralSince >= this.neutralMs) {
        this.armed = true;
        this.phase = STATES.READY;
      }
      return null;
    }
    if (!this.active) {
      this.neutralSince = null;
      if (signal !== 'active') {
        this.candidateSince = null;
        this.phase = STATES.READY;
        return null;
      }
      this.candidateSince ??= atMs;
      this.phase = STATES.CANDIDATE;
      if (atMs - this.candidateSince >= this.enterMs) {
        this.active = true;
        this.phase = STATES.ACTIVE;
        this.candidateSince = null;
        return 'GESTURE_START';
      }
      return null;
    }
    if (signal !== 'neutral') {
      this.candidateSince = null;
      this.phase = STATES.ACTIVE;
      return null;
    }
    this.candidateSince ??= atMs;
    this.phase = STATES.RELEASE_CANDIDATE;
    if (atMs - this.candidateSince >= this.leaveMs) {
      this.active = false;
      this.phase = STATES.READY;
      this.candidateSince = null;
      return 'GESTURE_END';
    }
    return null;
  }
  snapshot(atMs) {
    const targetMs = this.phase === STATES.CANDIDATE ? this.enterMs :
      this.phase === STATES.RELEASE_CANDIDATE ? this.leaveMs :
      this.phase === STATES.UNARMED ? this.neutralMs : 0;
    const since = this.phase === STATES.UNARMED ? this.neutralSince : this.candidateSince;
    const elapsed = since === null || !finite(atMs) ? 0 : Math.max(0, atMs - since);
    return { active: this.active, armed: this.armed, phase: this.phase, metric: this.metric,
      candidateMs: elapsed, progress: targetMs === 0 ? (this.armed ? 1 : 0) : Math.min(1, elapsed / targetMs) };
  }
}
