const DURATION_MS = 15_000;
const TARGET_RADIUS = 0.095;
const noop = () => {};

export class FingerGunGame {
  constructor({ onTime, onScore, onTarget, onFeedback, onFinish } = {}) {
    this.onTime = onTime ?? noop;
    this.onScore = onScore ?? noop;
    this.onTarget = onTarget ?? noop;
    this.onFeedback = onFeedback ?? noop;
    this.onFinish = onFinish ?? noop;
    this.running = false;
    this.timer = null;
    this.target = null;
    this.targetId = 0;
    this.startedAt = 0;
    this.score = 0;
    this.hits = 0;
    this.shots = 0;
  }

  start() {
    this.stop();
    this.score = 0;
    this.hits = 0;
    this.shots = 0;
    this.targetId = 0;
    this.startedAt = performance.now();
    this.running = true;
    this.onScore(this.getScore());
    this.nextTarget();
    this.tick();
    this.timer = setInterval(() => this.tick(), 50);
  }

  getScore() {
    return {
      score: this.score,
      hits: this.hits,
      shots: this.shots,
      accuracy: this.shots ? Math.round(this.hits / this.shots * 100) : 0
    };
  }

  tick() {
    if (!this.running) return;
    const remainingMs = Math.max(0, DURATION_MS - (performance.now() - this.startedAt));
    if (remainingMs === 0) {
      this.finish();
      return;
    }
    this.onTime({
      remainingMs,
      seconds: Math.ceil(remainingMs / 1000),
      progress: 1 - remainingMs / DURATION_MS
    });
  }

  nextTarget() {
    const previous = this.target;
    let next;
    // Keep targets clear of the HUD and avoid repeatedly spawning in one spot.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      next = {
        id: ++this.targetId,
        x: 0.18 + Math.random() * 0.64,
        y: 0.22 + Math.random() * 0.56,
        radius: TARGET_RADIUS
      };
      if (!previous || Math.hypot(next.x - previous.x, next.y - previous.y) > 0.25) break;
    }
    this.target = next;
    this.onTarget({ ...next });
  }

  shoot(aim) {
    if (!this.running || !this.target) return false;
    // Enforce the deadline even if a background tab delayed the timer callback.
    if (performance.now() - this.startedAt >= DURATION_MS) {
      this.finish();
      return false;
    }
    if (!aim || !Number.isFinite(aim.x) || !Number.isFinite(aim.y) ||
      aim.x < 0 || aim.x > 1 || aim.y < 0 || aim.y > 1 || aim.visible === false) {
      return false;
    }

    this.shots += 1;
    const hit = Math.hypot(aim.x - this.target.x, aim.y - this.target.y) <= this.target.radius;
    const points = hit ? 100 : 0;
    if (hit) {
      this.hits += 1;
      this.score += points;
    }
    this.onScore(this.getScore());
    this.onFeedback({ grade: hit ? "HIT" : "MISS", points, aim: { x: aim.x, y: aim.y } });
    if (hit) this.nextTarget();
    return hit;
  }

  finish() {
    if (!this.running) return;
    this.stop();
    this.onTime({ remainingMs: 0, seconds: 0, progress: 1 });
    this.onFinish({ ...this.getScore(), durationMs: DURATION_MS });
  }

  stop() {
    this.running = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.target = null;
    this.onTarget(null);
  }
}
