import { PositionHistory } from "../ghost/history.js";

export const GHOST_RULES = Object.freeze({ durationMs: 30000, recordMs: 3000, lives: 3,
  aspect: .75, hitRadius: .07, nearRadius: .15, exitRadius: .18,
  invulnerableMs: 1200, spawnGraceMs: 800, recoveryMs: 600, nearBonus: 50 });
export const GHOST_SCHEDULE = Object.freeze([
  { delay: 3000, at: 3000, color: "#8cdfff" },
  { delay: 6000, at: 6000, color: "#c5afff" },
  { delay: 9000, at: 12000, color: "#f4f5ec" },
  { delay: 12000, at: 20000, color: "#a3f4df" },
]);
const valid = (p) => p && [p.x, p.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1);
const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
// Distances use the board width, including on portrait screens.
export const pointDistance = (a, b, aspect = GHOST_RULES.aspect) => Math.hypot(a.x - b.x, (a.y - b.y) / aspect);
export function sweptDistance(a, b, c, d, aspect = GHOST_RULES.aspect) {
  const x = a.x - c.x, y = (a.y - c.y) / aspect;
  const dx = b.x - d.x - x, dy = (b.y - d.y) / aspect - y;
  const length = dx * dx + dy * dy, t = length ? Math.max(0, Math.min(1, -(x * dx + y * dy) / length)) : 0;
  return Math.hypot(x + dx * t, y + dy * t);
}

export class GhostTrailGame {
  constructor() { this.history = new PositionHistory(); this.phase = "idle"; this.elapsedMs = 0; this.lives = 3; this.ghosts = []; this.nearMisses = 0; }
  start(source = "camera") {
    this.history.clear();
    Object.assign(this, { source, phase: "recording", elapsedMs: 0, lives: GHOST_RULES.lives, player: null,
      ghosts: [], nearMisses: 0, hits: 0, paused: false, manualPause: false, recovery: 0, segment: 0,
      invulnerableUntil: 0, effect: null, result: null, trackingLosses: 0, edgeMs: 0, maxGhosts: 0 });
    this.encounters = new Map();
  }
  get score() { return Math.floor(this.elapsedMs / 100) + this.nearMisses * GHOST_RULES.nearBonus; }
  get remainingMs() { return Math.max(0, GHOST_RULES.durationMs - this.elapsedMs); }
  setPaused(value) { this.manualPause = value; if (value) this.pause(false); }
  pause(tracking = true) {
    if (!this.paused) { if (tracking) this.trackingLosses++; this.segment++; }
    this.paused = true; this.recovery = 0; this.encounters.clear();
  }
  step(deltaMs, point) {
    if (!["recording", "playing"].includes(this.phase) || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    if (this.manualPause || !valid(point) || deltaMs > 250) { this.pause(!this.manualPause); return; }
    if (this.paused) {
      this.recovery += deltaMs;
      if (this.recovery >= GHOST_RULES.recoveryMs) {
        this.paused = false; this.recovery = 0; this.player = { ...point };
        this.history.add(this.elapsedMs, point, this.segment);
        this.ghosts = []; // Never sweep across a tracking discontinuity.
        this.invulnerableUntil = Math.max(this.invulnerableUntil, this.elapsedMs + 400);
      }
      return;
    }
    if (!this.player) { this.player = { ...point }; this.history.add(this.elapsedMs, point, this.segment); }
    const from = this.player, total = Math.min(deltaMs, this.remainingMs);
    let used = 0;
    while (used < total && this.phase !== "result") {
      const dt = Math.min(25, total - used), previous = this.player;
      used += dt; this.elapsedMs += dt; this.player = mix(from, point, used / total);
      this.history.add(this.elapsedMs, this.player, this.segment);
      if (this.player.x < .15 || this.player.x > .85 || this.player.y < .12 || this.player.y > .88) this.edgeMs += dt;
      this.phase = this.elapsedMs < GHOST_RULES.recordMs ? "recording" : "playing";
      const oldGhosts = this.ghosts;
      this.ghosts = GHOST_SCHEDULE.filter((g) => this.elapsedMs >= g.at).flatMap((g) => {
        const position = this.history.at(this.elapsedMs - g.delay);
        return position ? [{ ...g, ...position, solid: this.elapsedMs >= g.at + GHOST_RULES.spawnGraceMs }] : [];
      });
      this.maxGhosts = Math.max(this.maxGhosts, this.ghosts.length);
      this.collide(previous, oldGhosts);
      if (this.lives <= 0) this.finish("caught");
      else if (this.elapsedMs >= GHOST_RULES.durationMs) this.finish("survived");
    }
  }
  collide(previous, oldGhosts) {
    const r = GHOST_RULES;
    for (const ghost of this.ghosts) {
      const old = oldGhosts.find((g) => g.delay === ghost.delay && g.segment === ghost.segment);
      const distance = old && old.solid ? sweptDistance(previous, this.player, old, ghost) : pointDistance(this.player, ghost);
      const endDistance = pointDistance(this.player, ghost);
      const protectedNow = this.elapsedMs < this.invulnerableUntil;
      if (!ghost.solid || protectedNow) { this.encounters.delete(ghost.delay); continue; }
      if (distance <= r.hitRadius) {
        this.lives--; this.hits++; this.invulnerableUntil = this.elapsedMs + r.invulnerableMs;
        this.effect = { type: "hit", until: this.elapsedMs + 900 }; this.encounters.clear(); break;
      }
      let encounter = this.encounters.get(ghost.delay);
      if (distance < r.nearRadius && !encounter) {
        encounter = { travel: 0 }; this.encounters.set(ghost.delay, encounter);
      }
      if (encounter) {
        encounter.travel += pointDistance(previous, this.player);
        if (endDistance > r.exitRadius) {
          if (encounter.travel >= .035) {
            this.nearMisses++; this.effect = { type: "near", until: this.elapsedMs + 800 };
          }
          this.encounters.delete(ghost.delay);
        }
      }
    }
  }
  finish(outcome) {
    this.phase = "result";
    this.result = { outcome, source: this.source, score: this.score, seconds: this.elapsedMs / 1000,
      lives: this.lives, hits: this.hits, nearMisses: this.nearMisses, maxGhosts: this.maxGhosts,
      trackingLosses: this.trackingLosses, edgeRatio: this.elapsedMs ? this.edgeMs / this.elapsedMs : 0 };
  }
}
