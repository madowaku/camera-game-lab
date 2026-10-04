export const BLINK_RULES = Object.freeze({ distance: 100, speed: 4, lockerAt: 55,
  calibrationMs: 600, countdownMs: 1200, resumeMs: 400, blinkMinMs: 80,
  longCloseMs: 450, longPenalty: 1, recoveryMs: 3000, passMs: 4200,
  passGraceMs: 1200, holdMs: 1200, goMs: 700, durationMs: 45000 });
export const MONSTER_STAGES = Object.freeze(["SAFE", "FAR", "NEAR", "CLOSE", "CAUGHT"]);
const activePhases = ["calibration", "countdown", "playing"];

// Only valid input advances active time. Fast camera blinks can be events even
// when they are shorter than the stable CLOSED state. A closure is charged once.
export class BlinkHorrorGame {
  constructor(options = {}) { this.rules = { ...BLINK_RULES, ...options }; this.phase = "idle"; }
  start(source = "camera") {
    Object.assign(this, { source, phase: "calibration", stage: "RUN", elapsedMs: 0,
      calibration: 0, calibrationOpen: false, calibrationClosed: false, countdown: 0,
      progress: 0, travelled: 0, monster: 0, closestDanger: 0, blinks: 0,
      longCloses: 0, closeCalls: 0, hides: 0, safeBlinks: 0, stageMs: 0,
      closedMs: 0, closureCounted: false, lastEye: "EYES_OPEN", ignoreClosure: false,
      hold: 0, passStarted: false, passFailed: false, passSuccess: false,
      paused: false, manualPause: false, resume: 0, cue: "", cueUntil: 0,
      reflectionUntil: 0, result: null });
  }
  get danger() { return (this.monster ?? 0) / 4; }
  get remaining() { return Math.max(0, this.rules.distance - (this.travelled ?? 0)); }
  get monsterStage() { return MONSTER_STAGES[this.monster ?? 0]; }
  get hideAhead() { return this.stage === "RUN" && !this.hides && this.travelled >= 32; }
  setPaused(value) { this.manualPause = value; if (value) this.pauseInput(); }
  pauseInput() {
    this.paused = true; this.resume = 0; this.closedMs = 0; this.closureCounted = false;
    this.ignoreClosure = true; this.hold = 0; this.passStarted = false;
    if (this.phase === "calibration") this.calibration = 0;
    if (this.phase === "countdown") this.countdown = 0;
  }
  cueMessage(message, ms = 1800) { this.cue = message; this.cueUntil = this.elapsedMs + ms; }
  approach(amount = 1, cue = "IT MOVED.") {
    this.monster = Math.min(4, this.monster + amount);
    this.closestDanger = Math.max(this.closestDanger, this.danger);
    this.reflectionUntil = this.elapsedMs + 800; this.cueMessage(cue);
    if (this.monster >= 3) this.closeCalls++;
    if (this.monster === 4) this.finish("caught");
  }
  enter(stage) {
    this.stage = stage; this.stageMs = 0; this.closedMs = 0; this.closureCounted = false;
    // A closure begun in the locker cannot become a RUN penalty.
    this.ignoreClosure = this.lastEye === "EYES_CLOSED";
    if (stage === "HIDE") { this.hides++; this.cue = ""; }
    if (stage === "DONT_LOOK") { this.hold = 0; this.passStarted = false; }
  }
  registerClosure(long = false) {
    if (this.closureCounted || this.ignoreClosure) return;
    this.closureCounted = true;
    if (long) this.longCloses++; else this.blinks++;
    if (this.stage === "RUN") this.approach(long ? this.rules.longPenalty : 1, long ? "KEEP YOUR EYES OPEN" : "IT MOVED.");
    else if (this.stage === "HIDE" && !long) { this.safeBlinks++; this.cueMessage("SAFE BLINK", 700); }
  }
  step(deltaMs, input) {
    if (!activePhases.includes(this.phase) || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const valid = input?.present && input.ready && ["EYES_OPEN", "EYES_CLOSED"].includes(input.eyeState);
    if (!valid || this.manualPause) { this.pauseInput(); return; }
    if (this.paused) {
      this.resume += deltaMs;
      if (this.resume >= this.rules.resumeMs) { this.paused = false; this.resume = 0; this.lastEye = input.eyeState; }
      return;
    }
    const open = input.eyeState === "EYES_OPEN", blink = input.events?.includes("BLINK_BOTH");
    if (this.phase === "calibration") {
      if (open) { this.calibration += deltaMs; if (this.calibration >= this.rules.calibrationMs) this.calibrationOpen = true; }
      else { this.calibration = 0; if (this.calibrationOpen) this.calibrationClosed = true; }
      if (blink && this.calibrationOpen) this.calibrationClosed = true;
      if (this.calibrationOpen && this.calibrationClosed && open) this.phase = "countdown";
      this.lastEye = input.eyeState; return;
    }
    if (this.phase === "countdown") {
      this.countdown = open ? this.countdown + deltaMs : 0;
      if (this.countdown >= this.rules.countdownMs) { this.phase = "playing"; this.lastEye = "EYES_OPEN"; }
      return;
    }
    if (!open && this.lastEye === "EYES_OPEN") { this.closedMs = 0; this.closureCounted = false; }
    if (!open && Number.isFinite(input.closedDurationMs)) this.closedMs = Math.max(this.closedMs, input.closedDurationMs);
    if (input.events?.includes("LONG_CLOSE_BOTH")) this.registerClosure(true);
    if (!open && this.closedMs >= this.rules.longCloseMs) this.registerClosure(true);
    if (open && this.lastEye === "EYES_CLOSED" && this.closedMs >= this.rules.blinkMinMs) this.registerClosure(this.closedMs >= this.rules.longCloseMs);
    // A delayed camera event and a CLOSED→OPEN edge describe one blink.
    if (blink && !this.closureCounted) this.registerClosure(false);
    if (open) { this.closedMs = 0; this.closureCounted = false; this.ignoreClosure = false; }
    this.lastEye = input.eyeState;
    if (this.phase === "result") return;
    let remaining = deltaMs;
    while (remaining > 1e-7 && this.phase === "playing") {
      const stage = this.stage, runEnd = !this.hides ? this.rules.lockerAt : this.rules.distance;
      let boundary = stage === "RUN" && open ? (runEnd - this.travelled) / this.rules.speed * 1000 : Infinity;
      if (stage === "HIDE") boundary = this.rules.recoveryMs - this.stageMs;
      if (stage === "DONT_LOOK") {
        boundary = this.rules.passMs - this.stageMs;
        if (open && !this.passFailed) boundary = Math.min(boundary, this.passStarted ? 0 : Math.max(0, this.rules.passGraceMs - this.stageMs));
      }
      if (stage === "GO") boundary = this.rules.goMs - this.stageMs;
      const closureBoundary = !open && !this.closureCounted && !this.ignoreClosure && ["RUN", "HIDE"].includes(stage) ? this.rules.longCloseMs - this.closedMs : Infinity;
      const chunk = Math.min(remaining, boundary, closureBoundary, this.rules.durationMs - this.elapsedMs);
      this.elapsedMs += chunk; this.stageMs += chunk; remaining -= chunk;
      if (!open) this.closedMs += chunk;
      if (stage === "RUN" && open) {
        this.travelled = Math.min(runEnd, this.travelled + this.rules.speed * chunk / 1000);
        this.progress = this.travelled / this.rules.distance;
      }
      if (!open && this.closedMs >= this.rules.longCloseMs - 1e-7) this.registerClosure(true);
      if (stage === "DONT_LOOK" && !this.passFailed) {
        if (!open) { this.passStarted = true; this.hold += chunk; if (this.hold >= this.rules.holdMs) this.passSuccess = true; }
        else if (this.passStarted || this.stageMs >= this.rules.passGraceMs) { this.passFailed = true; this.passSuccess = false; this.approach(1, "IT SAW YOU."); }
      }
      if (this.phase !== "playing") break;
      if (this.elapsedMs >= this.rules.durationMs - 1e-7) { this.finish("caught", "timeout"); break; }
      const complete = stage === "RUN" ? open && this.travelled >= runEnd - 1e-7 : this.stageMs >= ({ HIDE: this.rules.recoveryMs, DONT_LOOK: this.rules.passMs, GO: this.rules.goMs }[stage]) - 1e-7;
      if (complete) {
        if (stage === "RUN") { if (this.hides) this.finish("escaped"); else this.enter("HIDE"); }
        else if (stage === "HIDE") this.enter("DONT_LOOK");
        else if (stage === "DONT_LOOK") { if (!this.passSuccess && !this.passFailed) { this.passFailed = true; this.approach(1, "IT SAW YOU."); } if (!this.result) this.enter("GO"); }
        else if (stage === "GO") { this.enter("RUN"); this.cueMessage("GO!", 900); }
      }
      if (chunk <= 1e-7 && boundary > 1e-7 && closureBoundary > 1e-7) break;
    }
  }
  finish(outcome, reason = outcome) {
    this.phase = "result";
    this.result = { outcome, reason, score: Math.round(this.progress * 100), seconds: this.elapsedMs / 1000,
      hides: this.hides, blinks: this.blinks, safeBlinks: this.safeBlinks, longCloses: this.longCloses,
      closeCalls: this.closeCalls, passSuccess: this.passSuccess, closestDanger: this.closestDanger, source: this.source };
  }
}
