// All geometry uses the same 16 × 9 units. No DOM, camera or render clock here.
export const W = 16, H = 9, STEP = 1 / 120, DURATION = 30;
export const R = .013 * W, HALF = .12 * H, THICKNESS = .024 * W;
export const ANGLE_OFFSETS = [8, -10, 12, -8, 10, -12];
const EPS = 1e-8;
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function inZone(p, side) {
  return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= (side ? .58 : .10) * W && p.x <= (side ? .90 : .42) * W && p.y >= .17 * H && p.y <= .83 * H;
}
export function returnVelocity(side, ballY, paddleY, rally) {
  const u = clamp((ballY - paddleY) / (HALF + R), -1, 1);
  const angle = clamp(36 * u + ANGLE_OFFSETS[(rally - 1) % ANGLE_OFFSETS.length], -42, 42) * Math.PI / 180;
  const speed = Math.min(.78, .50 + .014 * rally) * W;
  return { vx: (side ? -1 : 1) * speed * Math.cos(angle), vy: speed * Math.sin(angle), u, angle, speed };
}
let roundSequence = 0;
export class PalmPongGame {
  constructor() { this.reset(); }
  reset(source = "camera") {
    this.source = source; this.roundId = `palm-pong-${++roundSequence}`; this.phase = "calibration";
    this.elapsed = 0; this.clock = 0; this.rally = 0; this.best = 0; this.total = 0; this.returns = [0, 0]; this.misses = 0;
    this.nextReceiver = 0; this.ball = { x: W / 2, y: H / 2, vx: -W * .5, vy: 0 };
    this.paddles = [0, 1].map(side => ({ x: (side ? .72 : .28) * W, y: H / 2, present: false, active: false, continuous: false, lost: 0 }));
    this.previous = this.paddles.map(p => ({ ...p })); this.events = []; this.eventId = 0; this.result = null;
    this.stable = 0; this.ready = false; this.countdown = 3; this.serveWait = 0; this.endWait = 0;
    this.pauseAge = 0; this.recovery = 0; this.resumeCount = null; this.pauseReason = null; this.resumeRequested = false;
    this.trail = []; this.lastHit = null; this.milestone = null; this.pausedSeconds = 0;
  }
  get paused() { return this.phase === "paused"; }
  emit(type, data = {}) { this.events.push({ type, roundId: this.roundId, id: ++this.eventId, time: this.elapsed, ...data }); }
  takeEvents() { const events = this.events; this.events = []; return events; }
  setPaddles(points) {
    this.previous = this.paddles.map(p => ({ ...p }));
    points.forEach((point, side) => {
      const old = this.paddles[side];
      if (!point?.present || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        this.paddles[side] = { ...old, present: false, continuous: false }; return;
      }
      const continuous = point.continuous !== false && old.present;
      this.paddles[side] = { ...point, present: true, continuous, active: inZone(point, side), lost: 0 };
      // A reappearance/teleport is not a swept paddle movement.
      if (!continuous) this.previous[side] = { ...this.paddles[side] };
    });
  }
  start() {
    if (this.phase !== "calibration" || !this.ready) return false;
    this.phase = "countdown"; this.countdown = 3; return true;
  }
  serve() {
    this.ball = { x: W / 2, y: H / 2, vx: (this.nextReceiver ? 1 : -1) * .5 * W, vy: 0 };
    this.trail = []; this.phase = "playing"; this.emit("SERVE", { player: this.nextReceiver + 1 });
  }
  pause(reason = "user") {
    if (["paused", "result", "round_end", "calibration"].includes(this.phase)) return;
    this.beforePause = this.phase; this.phase = "paused"; this.pauseReason = reason;
    this.pauseAge = 0; this.recovery = 0; this.resumeCount = null; this.resumeRequested = reason === "tracking";
    this.previous = this.paddles.map(p => ({ ...p }));
    if (reason === "tracking") this.emit("TRACK_LOST", { player: this.paddles.findIndex(p => !p.present) + 1 });
  }
  requestResume() { if (this.paused) { this.resumeRequested = true; this.recovery = 0; this.resumeCount = null; } }
  separateAfterPause() {
    const side = this.nextReceiver, p = this.paddles[side], b = this.ball;
    if (!p.active || Math.abs(b.y - p.y) > HALF + R) return;
    const face = p.x + (side ? -1 : 1) * (THICKNESS / 2 + R);
    if (Math.abs(b.x - p.x) <= THICKNESS / 2 + R + EPS) b.x = face + (side ? -EPS : EPS);
  }
  finish(reason = "TIME_UP") {
    if (this.result) return;
    this.phase = "round_end"; this.endWait = .35;
    this.result = Object.freeze({ outcome: "rally", scored: false, reason, source: this.source, bestRally: this.best, totalReturns: this.total,
      playerReturns: [...this.returns], misses: this.misses, elapsed: this.elapsed, trackingPauseSeconds: this.pausedSeconds, roundId: this.roundId,
      summaryJa: `ふたりで ${this.best}ラリー！`, summaryEn: `${this.best} rallies together!` });
    this.emit("ROUND_END", { bestRally: this.best, totalReturns: this.total });
  }
  step(dt = STEP) {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === "result") return;
    this.clock += dt;
    if (this.phase === "round_end") { this.endWait -= dt; if (this.endWait <= EPS) this.phase = "result"; return; }
    for (const p of this.paddles) if (!p.present) p.lost += dt;
    const stable = this.paddles.every(p => p.present && p.active);
    if (this.phase === "calibration") { this.stable = stable ? this.stable + dt : 0; this.ready = this.stable >= .5 - EPS; return; }
    if (this.paused) {
      this.pauseAge += dt; if (this.pauseReason === "tracking") this.pausedSeconds += dt;
      if (!this.resumeRequested || !stable) { this.recovery = 0; this.resumeCount = null; return; }
      if (this.resumeCount == null) {
        this.recovery += dt; if (this.recovery >= .5 - EPS) this.resumeCount = 1;
      } else {
        this.resumeCount -= dt;
        if (this.resumeCount <= EPS) {
          this.separateAfterPause(); this.previous = this.paddles.map(p => ({ ...p }));
          if (this.pauseReason === "tracking") this.emit("TRACK_RETURNED");
          this.phase = this.beforePause; this.pauseReason = null; this.resumeCount = null;
        }
      }
      return;
    }
    if (this.paddles.some(p => !p.present && p.lost > .15 + EPS)) { this.pause("tracking"); return; }
    if (this.phase === "countdown") { this.countdown -= dt; if (this.countdown <= EPS) this.serve(); return; }
    const available = DURATION - this.elapsed;
    const horizon = Math.min(dt, available);
    if (this.phase === "serve_wait") {
      this.elapsed += horizon;
      if (available <= dt + EPS) { this.elapsed = DURATION; this.finish(); return; }
      this.serveWait -= horizon; if (this.serveWait <= EPS) this.serve(); return;
    }
    if (this.phase !== "playing") return;
    const used = this.simulate(horizon, dt, available <= dt + EPS);
    this.elapsed += used;
    if (!this.paused && this.elapsed >= DURATION - EPS) { this.elapsed = DURATION; this.finish(); }
    this.trail.push({ x: this.ball.x, y: this.ball.y, time: this.elapsed });
    this.trail = this.trail.filter(p => this.elapsed - p.time <= .16).slice(-24);
  }
  // Earliest swept face/wall/miss event wins. Tie order: wall, paddle, miss;
  // an event exactly at the round boundary loses to the clock.
  simulate(duration, frameDuration, endsRound) {
    let used = 0;
    for (let iteration = 0; iteration < 12 && used < duration - EPS; iteration++) {
      const b = this.ball, remain = duration - used, options = [];
      const candidate = (time, type, priority, data = {}) => {
        if (time >= -EPS && time <= remain + EPS && !(endsRound && time >= remain - EPS)) options.push({ time: Math.max(0, time), type, priority, ...data });
      };
      if (b.vy < -EPS) candidate((R - b.y) / b.vy, "wall", 0);
      if (b.vy > EPS) candidate((H - R - b.y) / b.vy, "wall", 0);
      const side = this.nextReceiver, p = this.paddles[side], old = this.previous[side];
      const direction = side ? 1 : -1;
      // Only the incoming front face, with trustworthy movement, can score.
      if (b.vx * direction > 0 && ((p.present && p.continuous && old.present) || (!p.present && p.active))) {
        const moving = p.present && p.continuous && old.present;
        const pvx = moving ? (p.x - old.x) / frameDuration : 0, pvy = moving ? (p.y - old.y) / frameDuration : 0;
        const px = moving ? old.x + pvx * used : p.x, py = moving ? old.y + pvy * used : p.y;
        const face = px - direction * (THICKNESS / 2 + R), relative = b.vx - pvx;
        const gap = (b.x - face) * direction;
        if (gap <= EPS && relative * direction > EPS) {
          const time = (face - b.x) / relative, hitY = b.y + b.vy * time, paddleY = py + pvy * time;
          const contact = { x: px + pvx * time, y: paddleY };
          if (Math.abs(hitY - paddleY) <= HALF + R + EPS && inZone(contact, side)) candidate(time, "paddle", 1, { side, paddleY });
        }
      }
      if (b.vx < -EPS) candidate((-R - b.x) / b.vx, "miss", 2);
      if (b.vx > EPS) candidate((W + R - b.x) / b.vx, "miss", 2);
      options.sort((a, c) => Math.abs(a.time - c.time) < EPS ? a.priority - c.priority : a.time - c.time);
      const contact = options[0];
      if (!contact) { b.x += b.vx * remain; b.y += b.vy * remain; used += remain; break; }
      if (contact.type !== "wall" && !this.paddles[this.nextReceiver].present) {
        const before = Math.max(0, contact.time - EPS); b.x += b.vx * before; b.y += b.vy * before; used += before;
        this.pause("tracking"); break;
      }
      b.x += b.vx * contact.time; b.y += b.vy * contact.time; used += contact.time;
      if (contact.type === "wall") {
        b.y = clamp(b.y, R, H - R); b.vy *= -1; this.emit("WALL_BOUNCE", { x: b.x, y: b.y });
      } else if (contact.type === "paddle") {
        this.rally++; this.total++; this.returns[contact.side]++; this.best = Math.max(this.best, this.rally);
        const velocity = returnVelocity(contact.side, b.y, contact.paddleY, this.rally);
        b.vx = velocity.vx; b.vy = velocity.vy; b.x += contact.side ? -EPS : EPS;
        this.nextReceiver = 1 - contact.side;
        this.lastHit = { side: contact.side, at: this.clock, x: b.x, y: b.y };
        this.emit("RETURN", { player: contact.side + 1, rally: this.rally, x: b.x, y: b.y, offset: velocity.u });
        if ([5, 10, 20].includes(this.rally)) { this.milestone = { rally: this.rally, at: this.clock }; this.emit("RALLY_MILESTONE", { rally: this.rally }); }
      } else {
        this.misses++; this.emit("MISS", { player: this.nextReceiver + 1, rally: this.rally });
        this.rally = 0; this.phase = "serve_wait"; this.serveWait = .65;
        this.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }; this.trail = [];
        // A miss does not suspend the active round's clock.
        this.serveWait -= remain - contact.time; used = duration; break;
      }
    }
    return used;
  }
}
// Prediction follows existing velocity, including walls, and ends at the
// receiver's face. It never guesses a future return or changes ball velocity.
export function predictGuide(game, horizon = .8) {
  if (game.phase !== "playing") return { points: [], target: null };
  const b = { ...game.ball }, side = game.nextReceiver, p = game.paddles[side];
  const face = p.x + (side ? -1 : 1) * (THICKNESS / 2 + R);
  const faceTime = (face - b.x) / b.vx;
  const targetTime = faceTime >= 0 ? faceTime : Infinity;
  const limit = Math.min(horizon, targetTime), points = [{ x: b.x, y: b.y }];
  const reflect = y => { const range = H - 2 * R, t = ((y - R) % (2 * range) + 2 * range) % (2 * range); return R + (t <= range ? t : 2 * range - t); };
  for (let time = .04; time < limit; time += .04) points.push({ x: b.x + b.vx * time, y: reflect(b.y + b.vy * time) });
  points.push({ x: b.x + b.vx * limit, y: reflect(b.y + b.vy * limit) });
  return { points, target: Number.isFinite(targetTime) ? { x: face, y: reflect(b.y + b.vy * targetTime) } : null };
}
