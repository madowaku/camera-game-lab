export const GUARDIAN_RULES = Object.freeze({ durationMs: 30000, bossAtMs: 22000, gaugeKills: 8, shieldMs: 1000, recoveryMs: 3000 });

export class GuardianSpiritGame {
  constructor({ onEffect = () => {}, random = Math.random } = {}) {
    this.onEffect = onEffect; this.random = random; this.reset();
  }
  reset() {
    this.phase = "idle"; this.phaseMs = 0; this.elapsedMs = 0;
    this.enemies = []; this.boss = false; this.spawnIn = 400; this.nextId = 0;
    this.score = 0; this.defeated = 0; this.combo = 0; this.maxCombo = 0; this.blocks = 0; this.hits = 0;
    this.gauge = 0; this.shieldMs = 0; this.hitStopMs = 0; this.cooldowns = {};
    this.paused = false; this.resumeMs = 0; this.losses = 0; this.wasPresent = true;
    this.result = null; this.captureRequested = false; this.bossAttackIn = 2200;
  }
  start() { this.reset(); this.setPhase("align"); }
  setPhase(phase) { this.phase = phase; this.phaseMs = 0; }
  get remainingSeconds() { return Math.ceil(Math.max(0, GUARDIAN_RULES.durationMs - this.elapsedMs) / 1000); }
  get running() { return !["idle", "result"].includes(this.phase); }
  step(deltaMs, { present = false, actions = [] } = {}) {
    const dt = Math.max(0, Math.min(100, Number.isFinite(deltaMs) ? deltaMs : 0));
    if (!this.running) return;
    if (!present) {
      if (!this.paused && this.phase !== "align") this.losses++;
      this.paused = this.phase !== "align";
      this.resumeMs = GUARDIAN_RULES.recoveryMs;
      if (this.phase === "align" || this.phase === "countdown") this.phaseMs = 0;
      this.wasPresent = false;
      return;
    }
    if (this.paused) {
      this.wasPresent = true;
      this.resumeMs = Math.max(0, this.resumeMs - dt);
      if (this.resumeMs === 0) this.paused = false;
      return;
    }
    this.wasPresent = true; this.phaseMs += dt;
    if (this.phase === "align") { if (this.phaseMs >= 700) this.setPhase("countdown"); return; }
    if (this.phase === "countdown") {
      if (this.phaseMs >= 3000) { this.setPhase("awakening"); this.onEffect({ type: "awaken" }); }
      return;
    }
    if (this.phase === "awakening") { if (this.phaseMs >= 1500) this.setPhase("playing"); return; }
    if (this.phase === "ascension") {
      if (this.phaseMs >= 1900) {
        this.boss = false; this.enemies.length = 0; this.setPhase("victory");
        this.onEffect({ type: "victory" });
      }
      return;
    }
    if (this.phase === "victory") {
      if (this.phaseMs >= 4000) { this.captureRequested = true; this.finish(true); }
      return;
    }
    if (this.phase !== "playing") return;
    this.elapsedMs = Math.min(GUARDIAN_RULES.durationMs, this.elapsedMs + dt);
    if (this.elapsedMs >= GUARDIAN_RULES.durationMs) { this.finish(false); return; }
    this.shieldMs = Math.max(0, this.shieldMs - dt);
    for (const action of actions) this.act(action);
    if (this.phase !== "playing") return;
    if (!this.boss && this.elapsedMs >= GUARDIAN_RULES.bossAtMs) {
      this.boss = true; this.onEffect({ type: "boss" });
    }
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.enemies.length < 7) {
      const side = this.random() < 0.5 ? -1 : 1;
      this.enemies.push({ id: ++this.nextId, x: side < 0 ? -0.04 : 1.04,
        y: 0.25 + this.random() * 0.38, age: 0, side, attackAt: 3600 + this.random() * 1400 });
      this.spawnIn = this.boss ? 1000 : 750;
    }
    // Time remains honest during the brief visual hit stop; enemies freeze.
    const enemyDt = this.hitStopMs > 0 ? 0 : dt;
    this.hitStopMs = Math.max(0, this.hitStopMs - dt);
    for (const enemy of this.enemies) {
      enemy.age += enemyDt;
      const amount = 1 - Math.exp(-enemyDt / 3300);
      enemy.x += (0.5 - enemy.x) * amount;
      enemy.y += (0.62 - enemy.y) * amount;
      if (enemy.age >= enemy.attackAt) { enemy.dead = true; this.receiveAttack(); }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    if (this.boss) {
      this.bossAttackIn -= enemyDt;
      if (this.bossAttackIn <= 0) { this.receiveAttack(); this.bossAttackIn = 2400; }
    }
  }
  act(action) {
    if (this.phase !== "playing" || this.paused || !["punch", "shot", "shield", "ascend"].includes(action.type)) return false;
    const key = `${action.type}-${action.side ?? "both"}`;
    if (this.elapsedMs < (this.cooldowns[key] ?? 0)) return false;
    if (action.type === "ascend") {
      if (!this.boss || this.gauge < 1) return false;
      this.setPhase("ascension"); this.onEffect({ ...action }); return true;
    }
    this.cooldowns[key] = this.elapsedMs + (action.type === "shield" ? 1400 : 430);
    if (action.type === "shield") { this.shieldMs = GUARDIAN_RULES.shieldMs; this.onEffect({ ...action }); return true; }
    let targets = [];
    if (action.type === "punch") {
      const side = action.screenSide ?? (action.side === "left" ? -1 : 1);
      targets = this.enemies.filter((enemy) => side < 0 ? enemy.x <= 0.58 : enemy.x >= 0.42);
    } else if (this.enemies.length) {
      const aim = action.direction ?? { x: 0.5, y: 0.5 };
      targets = [this.enemies.reduce((best, enemy) =>
        Math.hypot(enemy.x - aim.x, enemy.y - aim.y) < Math.hypot(best.x - aim.x, best.y - aim.y) ? enemy : best)];
    }
    const points = [];
    for (const enemy of targets) {
      enemy.dead = true; this.defeated++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += 100 * Math.min(4, 1 + Math.floor((this.combo - 1) / 3));
      points.push({ x: enemy.x, y: enemy.y });
    }
    this.gauge = Math.min(1, this.defeated / GUARDIAN_RULES.gaugeKills);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    if (targets.length) this.hitStopMs = 85;
    this.onEffect({ ...action, targets: points, hit: targets.length > 0 }); return true;
  }
  receiveAttack() {
    if (this.shieldMs > 0) { this.blocks++; this.score += 200; this.onEffect({ type: "block" }); }
    else { this.hits++; this.score = Math.max(0, this.score - 100); this.combo = 0; this.onEffect({ type: "damage" }); }
  }
  finish(victory) {
    this.setPhase("result"); this.enemies.length = 0; this.boss = false;
    this.result = { experiment: "EXP-020-GUARDIAN-SPIRIT", victory, defeated: this.defeated,
      combo: this.maxCombo, blocks: this.blocks, hits: this.hits, score: this.score,
      durationMs: this.elapsedMs, trackingLosses: this.losses };
  }
}
