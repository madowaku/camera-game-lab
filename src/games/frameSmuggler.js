export const ROUND_MS = 30_000;
export const WARNING_MS = 1500;
export const INSPECTION_MS = 2500;
export const HIDE_HOLD_MS = 250;

// Four complete inspections + five randomized KEEP gaps = exactly 30 seconds.
export function makeSchedule(random = Math.random) {
  const weights = Array.from({ length: 5 }, () => 1 + Math.max(0, Math.min(1, random())));
  const sum = weights.reduce((a, b) => a + b, 0);
  const gaps = weights.map(w => 2000 + 4000 * w / sum);
  let time = 0;
  return gaps.slice(0, 4).map(gap => {
    time += gap;
    const inspection = { warning: time, hide: time + WARNING_MS, end: time + WARNING_MS + INSPECTION_MS };
    time = inspection.end; return inspection;
  });
}

export class FrameSmuggler {
  constructor({ random = Math.random } = {}) {
    this.schedule = makeSchedule(random); this.phase = 'ready'; this.elapsed = 0; this.countdown = 0;
    this.keptMs = 0; this.cleared = 0; this.caught = 0; this.bestHideMs = null; this.inspections = [];
    this.index = 0; this.hiddenFor = 0; this.hideTime = null; this.eligible = false; this.awaitingReturn = false;
    this.notice = ''; this.noticeUntil = 0; this.safeUntil = 0; this.paused = false; this.result = null; this.lostEvents = 0; this.lastCargo = null;
  }
  get score() { return this.keptMs / 100 + this.cleared * 100; }
  start() { if (this.phase === 'ready') { this.phase = 'countdown'; this.countdown = 2000; } }
  step(dt, cargo) {
    if (this.result || this.phase === 'ready' || this.paused || cargo === 'stale') return;
    let remaining = Math.max(0, dt);
    // Small slices keep results consistent across frame rates and phase boundaries.
    while (remaining > .0001 && !this.result) {
      let step = Math.min(remaining, 20);
      if (this.phase === 'countdown') {
        // A lost hand cannot start a round. Reacquire before the countdown proceeds.
        if (cargo !== 'inside') return;
        step = Math.min(step, this.countdown); this.countdown -= step; remaining -= step;
        if (this.countdown <= .0001) { this.phase = 'keep'; this.eligible = true; }
        continue;
      }
      const inspection = this.schedule[this.index];
      const boundary = inspection ? (this.elapsed < inspection.warning ? inspection.warning : this.elapsed < inspection.hide ? inspection.hide : inspection.end) : ROUND_MS;
      step = Math.min(step, boundary - this.elapsed, ROUND_MS - this.elapsed);
      if (cargo === 'lost' && this.lastCargo !== 'lost') this.lostEvents++;
      this.lastCargo = cargo;
      if (this.phase === 'hide') {
        if (cargo === 'outside' && this.eligible) {
          this.hiddenFor += step;
          if (this.hiddenFor >= HIDE_HOLD_MS && this.hideTime === null) this.hideTime = Math.max(0, this.elapsed + step - inspection.hide - this.hiddenFor);
        } else { this.hiddenFor = 0; this.hideTime = null; }
      } else if (cargo === 'inside') {
        this.eligible = true;
        if (this.awaitingReturn) {
          this.awaitingReturn = false; this.safeUntil = Math.max(this.noticeUntil, this.elapsed) + 650;
          if (this.noticeUntil <= this.elapsed) { this.notice = 'safe'; this.noticeUntil = this.safeUntil; }
        }
        if (this.phase === 'keep' || this.phase === 'return') this.keptMs += step;
      }
      this.elapsed += step; remaining -= step;
      if (inspection && this.elapsed >= inspection.end - .0001) {
        const clear = this.eligible && cargo === 'outside' && this.hiddenFor >= HIDE_HOLD_MS;
        if (clear) { this.cleared++; this.bestHideMs = this.bestHideMs === null ? this.hideTime : Math.min(this.bestHideMs, this.hideTime); }
        else this.caught++;
        this.inspections.push({ clear, hideMs: clear ? Math.round(this.hideTime) : null });
        this.notice = clear ? 'clear' : 'caught'; this.noticeUntil = this.elapsed + 1000;
        this.index++; this.awaitingReturn = true; this.eligible = false; this.hiddenFor = 0; this.hideTime = null;
      }
      if (this.elapsed >= ROUND_MS - .0001) {
        this.elapsed = ROUND_MS; this.phase = 'result';
        this.result = { score: Math.floor(this.score + 1e-7), inspectionsCleared: this.cleared, caught: this.caught, bestHideMs: this.bestHideMs === null ? null : Math.round(this.bestHideMs), durationMs: ROUND_MS, inspections: this.inspections, lostEvents: this.lostEvents };
      } else {
        const next = this.schedule[this.index];
        this.phase = next && this.elapsed >= next.hide - .0001 ? 'hide' : next && this.elapsed >= next.warning - .0001 ? 'warning' : this.awaitingReturn ? 'return' : 'keep';
      }
    }
  }
}
