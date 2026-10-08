export const SOFT_SERVE_RULES = Object.freeze({
  readyMs: 450, readyLossGraceMs: 150, recoveryMs: 450, rate: .64, swirlHeight: .034,
  maxServeMs: 20000, maxRoundMs: 39000, meltPerSecond: 2.45,
  exitDistance: .235, exitMs: 550, biteSize: 1, contactMs: 130,
});
export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const heightMultiplier = (n) => n >= 10 ? 5 : n >= 8 ? 3 : n >= 6 ? 2 : n >= 4 ? 1.5 : 1;
export const heightLabel = (n) => n >= 10 ? "CRAZY" : n >= 8 ? "DANGER" : n >= 6 ? "TALL" : n >= 4 ? "NICE" : "SAFE";
const validPoint = (p) => p && [p.x, p.y].every(Number.isFinite);

// Active time, cream geometry and contact edges are independent of the DOM.
export class SoftServeGame {
  constructor(rules = {}) { this.rules = { ...SOFT_SERVE_RULES, ...rules }; this.reset(); }
  reset(source = "demo") {
    Object.assign(this, { source, phase: "ready", cone: { x: .5, y: .72 }, amount: 0,
      maxAmount: 0, eaten: 0, melt: 0, stability: 1, lean: 0, segments: [],
      elapsedMs: 0, serveMs: 0, readyMs: 0, readyLossMs: 0, awayMs: 0, recoveryMs: 0,
      paused: false, manualPause: false, missing: false, wasMissing: false,
      contactMs: 0, separationMs: 0, biteArmed: true, bites: 0, losses: 0,
      qualitySum: 0, qualityWeight: 0, lastSegment: -1, result: null, effect: null, completedShape: null });
  }
  get multiplier() { return heightMultiplier(Math.floor(this.maxAmount + .001)); }
  get attachmentProgress() { return clamp(this.readyMs / this.rules.readyMs); }
  get beauty() { return this.qualityWeight ? this.qualitySum / this.qualityWeight : 0; }
  get beautyLabel() { return this.beauty > .88 ? "PERFECT" : this.beauty > .72 ? "BEAUTIFUL" : this.beauty > .5 ? "NICE" : this.beauty > .3 ? "OK" : "MESSY"; }
  get tip() {
    const last = this.segments.filter(s => s.level <= this.amount).slice(-12);
    const offset = last.length ? last.reduce((n, s) => n + s.x, 0) / last.length : 0;
    return { x: this.cone.x + offset + this.lean * this.amount * .034,
      y: this.cone.y - this.amount * this.rules.swirlHeight - .024 };
  }
  setPaused(paused) { this.manualPause = paused; }
  captureShape() {
    return { amount: this.amount, lean: this.lean, melt: this.melt, swirlHeight: this.rules.swirlHeight,
      segments: this.segments.filter(s => s.level <= this.amount).map(s => ({ ...s })) };
  }
  step(ms, input) {
    if (this.phase === "result") return;
    const dt = Math.min(100, Math.max(0, ms));
    const tracked = validPoint(input?.hand) && (this.phase !== "eat" || this.source === "demo" || validPoint(input?.mouth));
    // Short hand-detection gaps while attaching do not erase deliberate hold.
    // Never count unobserved time toward the hold, and expire it after 150 ms.
    if (!tracked && this.phase === "ready" && !this.manualPause && ms <= 500) {
      this.readyLossMs += dt;
      this.missing = true; this.paused = true; this.wasMissing = false;
      if (this.readyLossMs > this.rules.readyLossGraceMs) this.readyMs = 0;
      return;
    }
    if (tracked) this.readyLossMs = 0;
    if (!tracked || this.manualPause || ms > 500) {
      if (!tracked && !this.wasMissing && this.phase !== "ready") this.losses++;
      this.wasMissing = !tracked; this.missing = !tracked; this.paused = true;
      this.recoveryMs = 0; this.readyMs = 0; this.awayMs = 0; this.contactMs = 0; this.separationMs = 0;
      return;
    }
    this.missing = false;
    if (this.wasMissing) {
      this.recoveryMs += dt; this.paused = true;
      if (this.recoveryMs < this.rules.recoveryMs) return;
      this.wasMissing = false; this.recoveryMs = 0;
      // Reacquisition relocates gently without charging a movement penalty.
      this.cone = this.constrain(input.hand); this.contactMs = 0;
    }
    this.paused = false;
    const previous = this.cone, next = this.constrain(input.hand);
    const blend = 1 - Math.exp(-dt / 65);
    this.cone = { x: previous.x + (next.x - previous.x) * blend, y: previous.y + (next.y - previous.y) * blend };
    if (this.phase === "ready") {
      const underNozzle = Math.abs(input.hand.x - .5) < .14 && input.hand.y >= .38 && input.hand.y <= .84;
      this.readyMs = underNozzle ? this.readyMs + dt : 0;
      if (this.readyMs >= this.rules.readyMs) {
        this.phase = "serve";
        this.effect = { type: "attached", at: this.elapsedMs };
      }
      return;
    }
    const seconds = dt / 1000;
    this.elapsedMs += dt;
    this.melt = clamp(this.melt + seconds * this.rules.meltPerSecond, 0, 100);
    const speed = Math.hypot(this.cone.x - previous.x, (this.cone.y - previous.y) * 1.2) / Math.max(.001, seconds);
    const top = this.segments.filter(s => s.level > Math.max(0, this.amount - 1) && s.level <= this.amount);
    const spread = top.length > 2 ? Math.max(...top.map(s => s.x)) - Math.min(...top.map(s => s.x)) : .12;
    const center = top.length ? top.reduce((n, s) => n + s.x, 0) / top.length : 0;
    const ideal = Math.max(.025, .105 - this.amount * .007);
    const narrow = Math.max(0, 1 - spread / (ideal * 1.2));
    const stress = Math.max(0, speed - .8) * .15 + Math.max(0, this.amount - 4) * .0045
      + Math.abs(center) * .16 + narrow * .034 + Math.max(0, spread - ideal * 2.8) * .4
      + (this.melt / 100) ** 2 * .085;
    this.stability = clamp(this.stability + seconds * (.016 - stress));
    const sign = Math.abs(center) > .008 ? Math.sign(center) : this.lean < 0 ? -1 : 1;
    const targetLean = sign * (1 - this.stability) ** 2 * .9;
    this.lean += (targetLean - this.lean) * (1 - Math.exp(-seconds * 2));
    if (Math.abs(this.lean) > .48) return this.finish("splat");
    if (this.melt >= 100 || this.elapsedMs >= this.rules.maxRoundMs) return this.finish("melted");
    if (this.phase === "serve") this.serve(dt, seconds, speed, ideal);
    else this.eat(dt, input);
  }
  constrain(p) { return { x: clamp(p.x, .15, .85), y: clamp(p.y, Math.max(.38, .19 + this.amount * this.rules.swirlHeight), .84) }; }
  serve(dt, seconds, speed, ideal) {
    this.serveMs += dt;
    const offset = .5 - this.cone.x;
    this.awayMs = Math.abs(offset) > this.rules.exitDistance ? this.awayMs + dt : 0;
    if (this.amount >= .35 && this.awayMs >= this.rules.exitMs) return this.completeServe();
    if (this.serveMs >= this.rules.maxServeMs) {
      if (this.amount >= .35) return this.completeServe();
      return this.finish("empty");
    }
    this.catching = Math.abs(offset) < ideal + .065;
    if (!this.catching) return;
    const before = Math.floor(this.amount);
    this.amount += seconds * this.rules.rate; this.maxAmount = Math.max(this.maxAmount, this.amount);
    const quality = clamp(1 - Math.abs(Math.abs(offset) - ideal * .65) / (ideal * 1.1) - Math.max(0, speed - .7) * .2);
    this.qualitySum += quality * seconds; this.qualityWeight += seconds;
    if (Math.floor(this.amount * 14) !== this.lastSegment) {
      this.lastSegment = Math.floor(this.amount * 14);
      this.segments.push({ level: this.amount, x: offset, width: ideal });
    }
    if (Math.floor(this.amount) > before) this.effect = { type: "swirl", at: this.elapsedMs };
  }
  completeServe() {
    if (this.phase !== "serve" || this.amount < .35 || this.paused) return false;
    this.completedShape = this.captureShape();
    this.phase = "eat"; this.biteArmed = true; this.contactMs = 0; this.separationMs = 0;
    this.effect = { type: "serve", at: this.elapsedMs }; return true;
  }
  eat(dt, input) {
    const tip = this.tip;
    const contact = validPoint(input.mouth) && input.open && Math.hypot((tip.x - input.mouth.x) * .75, tip.y - input.mouth.y) < .1;
    if (this.source === "demo" && input.bite) { this.bite(); return; }
    if (!contact) {
      this.contactMs = 0; this.separationMs += dt;
      if (this.separationMs >= 130) this.biteArmed = true;
    } else {
      this.separationMs = 0; this.contactMs += dt;
      if (this.biteArmed && this.contactMs >= this.rules.contactMs) { this.biteArmed = false; this.bite(); }
    }
  }
  bite() {
    if (this.phase !== "eat" || this.paused) return false;
    const size = Math.min(this.amount, this.rules.biteSize), tip = { ...this.tip }, before = this.captureShape();
    this.eaten += size; this.amount = Math.max(0, this.amount - size); this.bites++;
    this.effect = { type: "lick", at: this.elapsedMs, id: this.bites, size, tip, cone: { ...this.cone }, before, afterAmount: this.amount };
    if (this.amount <= .001) this.finish("clean");
    return true;
  }
  finish(outcome) {
    if (this.result) return;
    const failedPhase = this.phase;
    this.completedShape ??= this.captureShape();
    this.phase = "result";
    const clean = outcome === "clean", consumed = this.maxAmount ? this.eaten / this.maxAmount : 0;
    const base = Math.round(this.maxAmount * 100 * this.multiplier * consumed);
    const beautyBonus = clean ? Math.round(this.beauty * 250) : 0;
    const cleanBonus = clean ? 300 : 0;
    const perfectBonus = clean && this.beauty > .88 && this.maxAmount >= 3 ? 200 : 0;
    this.result = { outcome, failedPhase, source: this.source, score: base + beautyBonus + cleanBonus + perfectBonus,
      base, beautyBonus, cleanBonus, perfectBonus, maxSwirls: Math.floor(this.maxAmount),
      multiplier: this.multiplier, eatenPercent: Math.round(consumed * 100), beauty: this.beautyLabel,
      bites: this.bites, seconds: this.elapsedMs / 1000, melt: Math.round(this.melt), trackingLosses: this.losses };
  }
}
