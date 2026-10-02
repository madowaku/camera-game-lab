export const BLINK_RULES = Object.freeze({ durationMs: 26000, calibrationMs: 1000, countdownMs: 1200, resumeMs: 400,
  progressRate: 0.075, dangerOpen: 0.085, dangerClosed: -0.060, rushOpen: 0.16, rushClosed: -0.040 });
const clamp = (n) => Math.max(0, Math.min(1, n));

export function rushWindows(seed = 4) {
  let value = seed >>> 0;
  const rand = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  return [4500, 11500, 19000].map((base) => { const start = base + rand() * 900; return { start, end: start + 1200 + rand() * 600 }; });
}

export class BlinkHorrorGame {
  constructor(options = {}) { this.rules = { ...BLINK_RULES, ...options }; this.windows = rushWindows(options.seed ?? 4); this.phase = "idle"; }
  start(source = "camera") {
    Object.assign(this, { source, phase: "calibration", elapsedMs: 0, calibration: 0, countdown: 0, progress: 0, danger: 0,
      closestDanger: 0, hides: 0, blinks: 0, paused: false, resume: 0, manualPause: false, lastEye: "EYES_OPEN", result: null });
  }
  get rush() { return this.windows.some((w) => this.elapsedMs >= w.start && this.elapsedMs < w.end); }
  setPaused(value) { this.manualPause = value; if (value) { this.paused = true; this.resume = 0; } }
  step(deltaMs, input) {
    if (!["calibration", "countdown", "playing"].includes(this.phase) || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const valid = input?.present && input.ready && ["EYES_OPEN", "EYES_CLOSED"].includes(input.eyeState);
    if (!valid || this.manualPause) {
      this.paused = true; this.resume = 0;
      if (this.phase === "calibration") this.calibration = 0;
      if (this.phase === "countdown") this.countdown = 0;
      return;
    }
    if (this.paused) {
      this.resume += deltaMs;
      if (this.resume < this.rules.resumeMs) return;
      this.paused = false; this.resume = 0;
      return; // Stable recovery time is never counted as progress, danger, or rush time.
    }
    const open = input.eyeState === "EYES_OPEN";
    if (this.phase === "calibration") {
      this.calibration = open ? this.calibration + deltaMs : 0;
      if (this.calibration >= this.rules.calibrationMs) this.phase = "countdown";
      return;
    }
    if (this.phase === "countdown") {
      this.countdown += deltaMs;
      if (this.countdown >= this.rules.countdownMs) this.phase = "playing";
      return;
    }
    if (input.events?.includes("BLINK_BOTH")) this.blinks++;
    if (!open && this.lastEye !== "EYES_CLOSED") this.hides++;
    this.lastEye = input.eyeState;
    let remaining = Math.min(deltaMs, this.rules.durationMs - this.elapsedMs);
    // Split at exact rush and finish boundaries: results do not depend on render FPS.
    while (remaining > 0.00001 && this.phase === "playing") {
      const boundary = this.windows.flatMap((w) => [w.start, w.end]).filter((n) => n > this.elapsedMs + 0.00001).sort((a, b) => a - b)[0] ?? Infinity;
      const dangerRate = open ? (this.rush ? this.rules.rushOpen : this.rules.dangerOpen) : (this.rush ? this.rules.rushClosed : this.rules.dangerClosed);
      const untilDanger = dangerRate > 0 ? (1 - this.danger) / dangerRate * 1000 : Infinity;
      const untilEscape = open ? (1 - this.progress) / this.rules.progressRate * 1000 : Infinity;
      const chunk = Math.min(remaining, boundary - this.elapsedMs, untilDanger, untilEscape);
      this.progress = clamp(this.progress + (open ? this.rules.progressRate : 0) * chunk / 1000);
      this.danger = clamp(this.danger + dangerRate * chunk / 1000);
      this.closestDanger = Math.max(this.closestDanger, this.danger);
      this.elapsedMs += chunk; remaining -= chunk;
      if (this.danger >= 1 - 1e-9) this.finish("caught");
      else if (this.progress >= 1 - 1e-9) this.finish("escaped");
      else if (chunk < 0.00001) break;
    }
    if (this.phase === "playing" && this.elapsedMs >= this.rules.durationMs) this.finish("timeout");
  }
  finish(outcome) {
    this.phase = "result";
    this.result = { outcome, score: Math.round(this.progress * 100), seconds: this.elapsedMs / 1000,
      hides: this.hides, blinks: this.blinks, closestDanger: this.closestDanger, source: this.source };
  }
}
