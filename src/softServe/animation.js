// Presentation time advances only while visible and unpaused, independently of scoring.
export class SoftServeAnimation {
  constructor({ finishMs=750 } = {}) { this.finishMs=finishMs;this.time = 0; this.bite = null; this.finishAt = null; this.delivered = false; }
  consume(effect, mouth) {
    if (effect?.type === "lick" && effect !== this.lastEffect) {
      this.bite = { ...effect, mouth: mouth ? { ...mouth } : { ...effect.tip }, startedAt: this.time };
    }
    this.lastEffect = effect;
  }
  finish(outcome) { if (this.finishAt === null) { this.finishAt = this.time; this.outcome = outcome; } }
  advance(ms, paused = false) {
    if (!paused && ms < 500) this.time += Math.max(0, ms);
    if (this.finishAt !== null && !this.delivered && this.time - this.finishAt >= this.finishMs) {
      this.delivered = true; return true;
    }
    return false;
  }
  get biteAge() { return this.bite ? this.time - this.bite.startedAt : Infinity; }
  get finishAge() { return this.finishAt === null ? 0 : this.time - this.finishAt; }
}
