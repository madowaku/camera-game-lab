export const BLASTER_RULES = Object.freeze({ duration: 30000, fireInterval: 240, feverCombo: 20, feverDuration: 5000, breachX: 0.27 });
export const laneY = (lane) => 0.68 - lane * 0.045;

export class NoteBlasterGame {
  constructor({ random = Math.random, onFeedback = () => {} } = {}) {
    this.random = random;
    this.onFeedback = onFeedback;
    this.reset();
  }
  reset() {
    this.running = false;
    this.elapsed = 0;
    this.hp = 3;
    this.score = this.shots = this.hits = this.perfects = this.combo = this.maxCombo = 0;
    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.fireIn = 0;
    this.spawnIn = 700;
    this.feverUntil = 0;
    this.result = null;
    this.feedback = null;
    this.serial = 0;
  }
  start() { this.reset(); this.running = true; }
  get level() { return this.elapsed < 8000 ? 1 : this.elapsed < 16000 ? 2 : 3; }
  get fever() { return this.elapsed < this.feverUntil; }
  spawn() {
    const lanes = this.level === 1 ? [0, 2] : this.level === 2 ? [0, 1, 2] : [0, 1, 2, 3, 4];
    const lane = lanes[Math.min(lanes.length - 1, Math.floor(this.random() * lanes.length))];
    this.enemies.push({ id: ++this.serial, lane, x: 1.01, y: laneY(lane), age: 0 });
  }
  step(delta, { voiced = false, note = null, mouth = null } = {}) {
    if (!this.running) return;
    // Callers freeze on input loss/hidden tabs. Clamp delayed frames instead of
    // fast-forwarding enemies through the player after a main-thread stall.
    const dt = Math.min(100, Math.max(0, delta), BLASTER_RULES.duration - this.elapsed);
    this.elapsed += dt;
    this.fireIn = Math.max(0, this.fireIn - dt);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawn();
      this.spawnIn += this.level === 1 ? 1450 : this.level === 2 ? 1250 : 1050;
    }
    if (voiced && note && note.grade !== "MISS" && mouth && this.fireIn <= 0) {
      this.bullets.push({ id: ++this.serial, lane: note.lane, grade: note.grade,
        x: mouth.x, y: mouth.y, origin: { ...mouth }, age: 0,
        fever: this.fever, hitIds: new Set(), hit: false });
      this.shots += 1;
      this.fireIn = BLASTER_RULES.fireInterval;
    }
    if (!voiced) this.fireIn = 0;
    for (const enemy of this.enemies) {
      enemy.age += dt;
      enemy.x -= dt * (0.000078 + (this.level - 1) * 0.000007);
    }
    for (const bullet of this.bullets) {
      const previousX = bullet.x;
      bullet.age += dt;
      if (bullet.age < 180) {
        const t = bullet.age / 180;
        const smooth = t * t * (3 - 2 * t);
        bullet.x = bullet.origin.x + (0.33 - bullet.origin.x) * t;
        bullet.y = bullet.origin.y + (laneY(bullet.lane) - bullet.origin.y) * smooth;
      } else {
        bullet.x = 0.33 + (bullet.age - 180) * 0.0007;
        bullet.y = laneY(bullet.lane);
        for (const enemy of this.enemies) {
          if (enemy.dead || enemy.lane !== bullet.lane || bullet.hitIds.has(enemy.id) ||
              enemy.x < previousX - 0.022 || enemy.x > bullet.x + 0.022) continue;
          enemy.dead = true;
          bullet.hitIds.add(enemy.id);
          if (!bullet.hit) {
            this.hits += 1;
            if (bullet.grade === "PERFECT") this.perfects += 1;
          }
          bullet.hit = true;
          this.combo += 1;
          this.maxCombo = Math.max(this.combo, this.maxCombo);
          const multiplier = this.combo >= 20 ? 2 : this.combo >= 10 ? 1.5 : this.combo >= 5 ? 1.2 : 1;
          this.score += Math.round((100 + (bullet.grade === "PERFECT" ? 50 : 0)) * multiplier * (bullet.fever ? 2 : 1));
          if (this.combo % BLASTER_RULES.feverCombo === 0) this.feverUntil = this.elapsed + BLASTER_RULES.feverDuration;
          this.feedback = { grade: bullet.grade, until: this.elapsed + 650 };
          this.effects.push({ x: enemy.x, y: enemy.y, lane: enemy.lane, age: 0 });
          this.onFeedback({ type: "hit", lane: enemy.lane, grade: bullet.grade });
          if (!bullet.fever) { bullet.dead = true; break; }
        }
      }
      if (bullet.x > 1.07) {
        bullet.dead = true;
        if (!bullet.hit) this.combo = 0;
      }
    }
    for (const enemy of this.enemies) {
      if (!enemy.dead && enemy.x <= BLASTER_RULES.breachX) {
        enemy.dead = true;
        this.hp = Math.max(0, this.hp - 1);
        this.combo = 0;
        this.feedback = { grade: "MISS", until: this.elapsed + 650 };
        this.onFeedback({ type: "breach" });
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter((e) => e.age < 550);
    if (this.hp <= 0 || this.elapsed >= BLASTER_RULES.duration) this.finish(this.hp <= 0 ? "GAME_OVER" : "TIME");
  }
  finish(reason) {
    this.running = false;
    this.result = { reason, score: this.score, shots: this.shots, hits: this.hits,
      accuracy: this.shots ? Math.round(this.hits / this.shots * 100) : 0,
      perfectRate: this.hits ? Math.round(this.perfects / this.hits * 100) : 0, maxCombo: this.maxCombo };
  }
}
