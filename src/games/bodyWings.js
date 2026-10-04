import { clamp, turnStrength, lossInput } from "../input/bodyWingsPose.js";

export const FLIGHT_RULES = Object.freeze({ roundMs: 30000, holdMs: 500, transformMs: 1000,
  tutorialMs: 8500, travelMs: 2600, perfect: .065, good: .165, boostMs: 2000 });
const LINE = [0, 0, -1, 1, 0, -1, -1, 1, 0, 1, -1, 0, 1, 1, -1, 0, -1, 1, 0, 0, 1, -1, -1, 0, 1, 0, -1, 1, 0, 0];
export const RING_LINE = Object.freeze(LINE.map((side, i) => Object.freeze({ id: i, at: (i + 1) * 1000, x: .5 + side * (i < 5 ? .10 : .21) })));

export class BodyWingsGame {
  constructor(source = "camera") { this.reset(source); }
  reset(source) {
    this.source = source; this.phase = "ready"; this.paused = false; this.time = 0; this.elapsed = 0;
    this.phaseMs = 0; this.holdMs = 0; this.x = .5; this.velocity = 0; this.tilt = 0; this.missingMs = 0;
    this.trackingLosses = 0; this.maxLossMs = 0; this.score = 0; this.rings = 0; this.attempts = 0;
    this.combo = 0; this.bestCombo = 0; this.perfects = 0; this.boostUntil = 0; this.boosts = 0;
    this.distance = 0; this.maxSpeed = 180; this.speed = 180; this.effects = []; this.events = [];
    this.effect = null; this.result = null; this.tutorialDone = false;
  }
  setPaused(value) { this.paused = !!value; if (value) this.holdMs = 0; }
  get remainingMs() { return Math.max(0, FLIGHT_RULES.roundMs - this.elapsed); }
  get boosted() { return this.phase === "playing" && this.elapsed < this.boostUntil; }
  get ringsAhead() {
    if (this.phase === "tutorial") return [{ id: -1, x: .4, at: 3200, progress: clamp(this.phaseMs / 3200) }];
    if (this.phase !== "playing") return [];
    return RING_LINE.filter(r => r.id >= this.attempts && r.at - this.elapsed <= FLIGHT_RULES.travelMs)
      .map(r => ({ ...r, progress: clamp(1 - (r.at - this.elapsed) / FLIGHT_RULES.travelMs) }));
  }
  emit(type, data = {}) {
    const event = { type, at: this.time, data }; this.events.push(event);
    this.effects.push(event); this.effect = event;
  }
  step(ms, input) {
    this.effects = []; this.events = [];
    if (this.paused || this.phase === "result" || !Number.isFinite(ms) || ms <= 0) return;
    // A stalled/hidden tab must not sweep an entire course with stale input.
    if (ms > 500) { this.holdMs = 0; return; }
    let remaining = ms;
    while (remaining > 0 && this.phase !== "result") {
      const dt = Math.min(remaining, 25); remaining -= dt; this.advance(dt, input);
    }
  }
  advance(dt, input) {
    this.time += dt;
    const present = input && Number.isFinite(input.tilt);
    if (present) {
      this.maxLossMs = Math.max(this.maxLossMs, this.missingMs); this.missingMs = 0;
      this.tilt += (clamp(input.tilt, -.65, .65) - this.tilt) * (1 - Math.pow(.7, dt / 33.3));
    } else {
      const previous = this.missingMs; this.missingMs += dt;
      if (previous < 800 && this.missingMs >= 800 && this.phase === "playing") this.trackingLosses++;
      this.maxLossMs = Math.max(this.maxLossMs, this.missingMs);
    }
    if (this.phase === "ready") {
      this.holdMs = present && input.spread ? this.holdMs + dt : 0;
      if (this.holdMs >= FLIGHT_RULES.holdMs) {
        this.phase = "transform"; this.phaseMs = 0; this.emit("WINGS_ON", { priority: 40 });
      }
      return;
    }
    this.phaseMs += dt;
    if (this.phase === "transform") {
      if (this.phaseMs >= FLIGHT_RULES.transformMs) { this.phase = "tutorial"; this.phaseMs = 0; }
      return;
    }
    const control = turnStrength(present ? this.tilt : lossInput(this.tilt, this.missingMs));
    const targetVelocity = control ? control * .55 : (.5 - this.x) * .65;
    this.velocity += (targetVelocity - this.velocity) * (1 - Math.exp(-dt / 80));
    this.x = clamp(this.x + this.velocity * dt / 1000, .16, .84);
    if (this.phase === "tutorial") {
      if (this.phaseMs >= 3200 && Math.abs(this.x - .4) <= FLIGHT_RULES.perfect && this.x < .455) {
        this.tutorialDone = true; this.emit("TUTORIAL_PASS", { priority: 20 }); this.beginRush();
      } else if (this.phaseMs >= FLIGHT_RULES.tutorialMs) this.beginRush();
      return;
    }
    const actualDt = Math.min(dt, FLIGHT_RULES.roundMs - this.elapsed);
    this.elapsed += actualDt;
    this.speed = 180 + Math.min(this.combo, 12) * 7 + (this.boosted ? 70 : 0);
    this.maxSpeed = Math.max(this.maxSpeed, this.speed); this.distance += this.speed / 3.6 * actualDt / 1000;
    while (this.attempts < RING_LINE.length && this.elapsed >= RING_LINE[this.attempts].at) {
      this.grade(RING_LINE[this.attempts++]);
    }
    if (this.elapsed >= FLIGHT_RULES.roundMs) this.finish();
  }
  beginRush() { this.phase = "playing"; this.phaseMs = 0; this.elapsed = 0; this.x = .5; this.velocity = 0; this.missingMs = 0; this.maxLossMs = 0; }
  grade(ring) {
    const distance = Math.abs(this.x - ring.x), perfect = distance <= FLIGHT_RULES.perfect;
    const success = distance <= FLIGHT_RULES.good, multiplier = this.boosted ? 2 : 1;
    if (success) {
      this.rings++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (perfect) this.perfects++;
      this.score += (perfect ? 100 : 50) * multiplier;
      this.emit(perfect ? "PERFECT" : "GOOD", { ring: ring.id, combo: this.combo, multiplier, priority: this.combo >= 5 ? 70 : 30 });
      if (this.combo % 5 === 0) {
        this.boostUntil = this.elapsed + FLIGHT_RULES.boostMs; this.boosts++;
        this.emit("BOOST", { combo: this.combo, priority: this.combo >= 10 ? 100 : 90 });
      }
    } else {
      this.combo = 0; this.emit("MISS", { ring: ring.id, distance, priority: distance > .32 ? 80 : 10 });
    }
  }
  finish() {
    this.phase = "result"; this.emit("FINISH", { priority: 15 });
    this.result = { source: this.source, score: this.score, rings: this.rings, totalRings: RING_LINE.length,
      bestCombo: this.bestCombo, perfects: this.perfects, boosts: this.boosts, distance: Math.round(this.distance),
      maxSpeed: this.maxSpeed, seconds: 30, trackingLosses: this.trackingLosses,
      maxLossMs: Math.round(this.maxLossMs), tutorialDone: this.tutorialDone };
  }
}
