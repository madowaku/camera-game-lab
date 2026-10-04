export const ROUND_MS = 30000, ENEMY_HP = 640, DODGE_DISTANCE = .28;
export class CounterCamGame {
  constructor() { this.reset(); }
  reset() {
    Object.assign(this, { phase: 'idle', stage: 'idle', elapsed: 0, combatTime: 0, stageTime: 0, enemyHp: ENEMY_HP, lives: 3,
      paused: false, attacks: 0, justDodges: 0, counters: 0, perfectCounters: 0, guards: 0, hits: 0, damageTaken: 0,
      score: 0, special: 0, chargeMs: 0, freezeMs: 0, lastPunchAt: -Infinity, side: 1, targetHead: 0, result: null,
      effect: null, events: [], history: [], bufferedPunch: null, finishing: false });
  }
  start() { this.reset(); this.phase = 'playing'; this.emit('FIGHT'); }
  emit(type, data = {}) { const e = { type, at: this.elapsed, data }; this.events.push(e); this.history.push(e); this.effect = e; return e; }
  takeEvents() { return this.events.splice(0); }
  enter(stage) { this.stage = stage; this.stageTime = 0; }
  // A resumed attack always gives a new, full warning. Pausing cannot turn an
  // old camera sample or a queued key into a hit or a counter.
  recoverInput() {
    this.bufferedPunch = null; this.chargeMs = 0; this.freezeMs = 0;
    if (['telegraph', 'strike', 'counter'].includes(this.stage)) this.enter('idle');
  }
  step(dt, input = {}) {
    if (this.phase !== 'playing' || this.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 100); this.elapsed = Math.min(ROUND_MS, this.elapsed + dt);
    if (this.elapsed >= ROUND_MS) { this.finish('TIME UP'); return; }
    this.chargeMs = this.special >= 100 && input.charging ? Math.min(1000, this.chargeMs + dt) : input.punch ? this.chargeMs : 0;
    if (this.freezeMs > 0) {
      this.freezeMs = Math.max(0, this.freezeMs - dt);
      if (input.punch) this.bufferedPunch = input.punch;
      return;
    }
    this.combatTime += dt; this.stageTime += dt;
    if (this.stage === 'idle' && this.stageTime >= 500) {
      this.attacks++; this.side = this.attacks % 2 ? 1 : -1;
      this.targetHead = input.head ?? 0; this.enter('telegraph'); this.emit('WINDUP', { side: this.side });
    } else if (this.stage === 'telegraph' && this.stageTime >= 900) {
      this.enter('strike');
      if (Math.abs((input.head ?? 0) - this.targetHead) >= DODGE_DISTANCE) {
        this.justDodges++; this.enter('counter'); this.freezeMs = 150;
        this.emit('JUST DODGE', { side: this.side });
      } else if (input.guard) { this.guards++; this.emit('GUARD'); }
      else { this.lives--; this.damageTaken++; this.emit('HIT'); if (!this.lives) { this.finish('DOWN'); return; } }
    } else if (this.stage === 'strike' && this.stageTime >= 300) this.enter('recover');
    else if (this.stage === 'counter' && this.stageTime >= 850) this.enter('recover');
    else if (this.stage === 'recover' && this.stageTime >= 450) this.enter('idle');
    const punch = input.punch || this.bufferedPunch; this.bufferedPunch = null;
    if (punch) this.punch(punch);
  }
  punch({ strength = .5 } = {}) {
    const mega = this.special >= 100 && this.chargeMs >= 500;
    if (this.phase !== 'playing' || this.paused || !mega && this.elapsed - this.lastPunchAt < 650) return false;
    if (this.freezeMs > 0) { this.bufferedPunch = { strength }; return false; }
    this.lastPunchAt = this.elapsed; this.hits++;
    const counter = this.stage === 'counter', perfect = counter && this.stageTime <= 300;
    const damage = mega ? 240 : perfect ? 80 : counter ? 40 : 10;
    const type = mega ? 'MEGA PUNCH' : perfect ? 'PERFECT COUNTER' : counter ? 'COUNTER' : 'PUNCH';
    if (counter) { this.counters++; if (perfect) this.perfectCounters++; this.special = Math.min(100, this.special + 25); this.enter('recover'); }
    if (mega) { this.special = 0; this.chargeMs = 0; this.finishing = true; }
    this.enemyHp = Math.max(0, this.enemyHp - damage); this.score += damage * (mega ? 5 : counter ? 3 : 1);
    this.emit(type, { damage, strength: Math.max(.15, Math.min(1, strength)), perfect });
    if (this.enemyHp === 0) this.finish('KO', { perfect: mega || perfect });
    else if (this.special === 100 && !mega) this.emit('SPECIAL READY');
    return true;
  }
  finish(title, { perfect = false } = {}) {
    if (this.result) return;
    this.phase = 'result'; this.emit(title === 'KO' ? 'KO' : 'ROUND END', { title });
    const rank = title === 'KO' && perfect ? 'S+' : this.damageTaken === 0 ? 'S' : this.justDodges >= 5 ? 'A' : this.counters >= 3 ? 'B' : title === 'KO' ? 'C' : 'TRY AGAIN';
    this.result = { title, rank, elapsed: this.elapsed, score: this.score, enemyHp: this.enemyHp, lives: this.lives,
      justDodges: this.justDodges, counters: this.counters, perfectCounters: this.perfectCounters, guards: this.guards,
      damageTaken: this.damageTaken, hits: this.hits, perfectKo: title === 'KO' && perfect };
  }
}
