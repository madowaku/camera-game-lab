export const W = 540, H = 960, ROUND_MS = 15000;
export const SPEED = Object.freeze({ medium: 180, slash: 650, power: 1500 });
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function segmentDistance(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
  const t = d ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / d, 0, 1) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function intersection(a, b, c, d) {
  const x = b.x - a.x, y = b.y - a.y, u = d.x - c.x, v = d.y - c.y, det = x * v - y * u;
  if (Math.abs(det) < .001) return null;
  const t = ((c.x - a.x) * v - (c.y - a.y) * u) / det;
  const s = ((c.x - a.x) * y - (c.y - a.y) * x) / det;
  return t >= 0 && t <= 1 && s >= 0 && s <= 1 ? { x: a.x + t * x, y: a.y + t * y } : null;
}

// Observations carry inference timestamps: repeated animation frames cannot manufacture speed.
export class BladeTracker {
  constructor() { this.reset(); }
  reset() { this.hands = new Map(); }
  sample(points, now) {
    const strokes = [], present = new Set();
    for (const p of points) {
      if (!p || ![p.x, p.y, p.at].every(Number.isFinite) || now - p.at > 160 || p.at > now + 1 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
      present.add(p.id);
      let h = this.hands.get(p.id);
      if (!h || p.at - h.last.at > 160) {
        h = { last: p, armedAt: p.at + 180, history: [p], speed: 0 }; this.hands.set(p.id, h); continue;
      }
      if (p.at <= h.last.at) continue;
      const dt = p.at - h.last.at, distance = Math.hypot(p.x - h.last.x, p.y - h.last.y);
      if (distance > 240 || distance / dt > 5.5 || dt > 160) {
        h.last = p; h.history = [p]; h.armedAt = p.at + 180; h.speed = 0; continue;
      }
      h.speed = distance / dt * 1000;
      h.history = h.history.filter(q => p.at - q.at <= 130); h.history.push(p);
      if (p.at >= h.armedAt && h.speed >= SPEED.medium) {
        strokes.push({ id: p.id, a: h.last, b: p, at: p.at, speed: h.speed, active: h.speed >= SPEED.slash, power: h.speed >= SPEED.power, angle: Math.atan2(p.y - h.last.y, p.x - h.last.x), trail: [...h.history] });
      }
      h.last = p;
    }
    for (const id of this.hands.keys()) if (!present.has(id)) this.hands.delete(id);
    return strokes;
  }
}

const FRUIT_TIMES = [250, 2150, 2700, 3250, 3800, 4350, 4900, 5500, 6200, 6800, 7400, 8000, 8600, 9200, 9300, 10000, 10100, 10800, 10900, 11600, 11700, 12400, 12500, 13000, 13200, 13450, 13700, 13950, 14200];
const BOMB_TIMES = [6500, 8300, 11300, 13300];
export class AirSlashGame {
  constructor({ seed = 54, source = 'demo' } = {}) {
    this.seed = seed >>> 0; this.source = source; this.phase = 'waiting'; this.elapsed = 0; this.clock = 0;
    this.fruits = []; this.events = []; this.log = []; this.serial = 0; this.score = 0; this.combo = 0; this.bestCombo = 0;
    this.sliced = 0; this.bombs = 0; this.missed = 0; this.powerSlashes = 0; this.xSlashes = 0;
    this.hitstop = 0; this.paused = false; this.readyAge = 0; this.lostAge = 0; this.recoveryAge = 0;
    this.blades = new BladeTracker(); this.recent = new Map(); this.lastX = -Infinity; this.bonusStorm = false; this.finalStorm = false;
    this.schedule = [...FRUIT_TIMES.map(at => ({ at, type: 'fruit' })), ...BOMB_TIMES.map(at => ({ at, type: 'bomb' }))].sort((a, b) => a.at - b.at);
  }
  random() { this.seed = (1664525 * this.seed + 1013904223) >>> 0; return this.seed / 4294967296; }
  emit(type, data = {}) { const e = { type, at: this.elapsed, ...data }; this.events.push(e); this.log.push(e); }
  pause(reason = 'user') { if (this.phase === 'result') return; this.paused = true; this.pauseReason = reason; this.blades.reset(); this.recent.clear(); this.recoveryAge = 0; }
  resume() { this.paused = false; this.pauseReason = null; this.blades.reset(); this.recent.clear(); this.lostAge = 0; this.recoveryAge = 0; }
  spawn(type = 'fruit', special = {}) {
    const x = this.elapsed < 2000 ? W / 2 : 95 + this.random() * (W - 190);
    const f = { id: ++this.serial, type, kind: Math.floor(this.random() * 5), x, y: H + 65, prevX: x, prevY: H + 65,
      vx: (W / 2 - x) * .3 + (this.random() - .5) * 90, vy: -1240 - this.random() * 180,
      r: type === 'bomb' ? 39 : 43 + this.random() * 8, rotation: (this.random() - .5) * .5, spin: (this.random() - .5) * 2, ...special };
    this.fruits.push(f); return f;
  }
  storm(final = false) {
    this.emit('storm', { final });
    if (!final) {
      for (let i = 0; i < 6; i++) this.schedule.push({ at: this.elapsed + 150 + i * 200, type: 'fruit' });
      this.schedule.push({ at: this.elapsed + 650, type: 'bomb' }); this.schedule.sort((a, b) => a.at - b.at);
    }
  }
  slash(f, stroke) {
    f.dead = true;
    if (f.type === 'bomb') {
      this.score -= 300; this.combo = 0; this.bombs++; this.hitstop = Math.max(this.hitstop, 60);
      this.emit('bomb', { fruit: { ...f }, angle: stroke.angle, points: -300 }); return;
    }
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.sliced++;
    if (stroke.power) this.powerSlashes++;
    if (f.giant) this.xSlashes++;
    const points = 100 + 20 * this.combo + (stroke.power ? 50 : 0) + (f.giant ? 300 : 0);
    this.score += points; this.hitstop = Math.max(this.hitstop, stroke.power ? 60 : 45);
    this.emit('slice', { fruit: { ...f }, angle: stroke.angle, power: stroke.power, points, combo: this.combo, giant: !!f.giant });
    if (this.sliced === 1) this.emit('first');
    if (this.combo === 5) this.emit('juicy');
    if (this.combo === 10) { this.emit('combo10'); if (!this.bonusStorm) { this.bonusStorm = true; this.storm(); } }
  }
  step(delta, hands = [], now = this.clock + delta) {
    this.events = []; this.clock = now;
    if (this.phase === 'result') return;
    const dt = clamp(delta, 0, 100), hasHands = hands.some(p => p && [p.at, p.x, p.y].every(Number.isFinite) && p.at <= now + 1 && now - p.at <= 160 && p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H);
    if (this.paused) {
      if (this.pauseReason === 'tracking') { this.recoveryAge = hasHands ? this.recoveryAge + dt : 0; if (this.recoveryAge >= 350) this.resume(); }
      return;
    }
    if (this.phase === 'waiting' || this.phase === 'ready') {
      this.readyAge = hasHands || this.source === 'demo' ? this.readyAge + dt : 0;
      this.phase = this.readyAge ? 'ready' : 'waiting';
      this.blades.sample(hands, now);
      if (this.readyAge >= 600) { this.phase = 'playing'; this.emit('start'); } return;
    }
    if (this.source === 'camera') {
      this.lostAge = hasHands ? 0 : this.lostAge + dt;
      if (this.lostAge >= 450) { this.pause('tracking'); return; }
    }
    this.elapsed = Math.min(ROUND_MS, this.elapsed + dt);
    if (this.elapsed >= ROUND_MS) { this.phase = 'result'; this.blades.reset(); this.recent.clear(); this.result = this.getResult(); this.emit('finish'); return; }
    if (this.elapsed >= 13000 && !this.finalStorm) { this.finalStorm = true; this.storm(true); }
    while (this.schedule[0]?.at <= this.elapsed) this.spawn(this.schedule.shift().type);
    const frozen = Math.min(this.hitstop, dt); this.hitstop = Math.max(0, this.hitstop - dt);
    const physics = (dt - frozen) / 1000;
    for (const f of this.fruits) {
      f.prevX = f.x; f.prevY = f.y; f.x += f.vx * physics; f.y += f.vy * physics; f.vy += 1350 * physics; f.rotation += f.spin * physics;
      if (f.y > H + 150 && f.vy > 0) { f.dead = true; if (f.type === 'fruit') { this.missed++; this.combo = 0; this.emit('miss'); } }
    }
    const strokes = this.blades.sample(hands, now), active = strokes.filter(s => s.active);
    for (const stroke of strokes) this.emit('trail', { stroke });
    for (const stroke of active) {
      for (const [id, other] of this.recent) {
        if (id === stroke.id || now - other.at > 120 || now - this.lastX < 1800) continue;
        const p = intersection(stroke.a, stroke.b, other.a, other.b);
        if (p && p.x > 65 && p.x < W - 65 && p.y > 180 && p.y < H - 100) {
          this.lastX = now; const giant = this.spawn('fruit', { x: p.x, y: p.y, r: 72, giant: true, kind: 2, vx: 0, vy: -150 });
          this.emit('xslash', { point: p }); this.slash(giant, stroke); break;
        }
      }
      this.recent.set(stroke.id, stroke);
    }
    // New observed segments are swept; a retained trail is visual only, so resting hands cannot keep cutting.
    for (const stroke of active) for (const f of this.fruits) {
      if (f.dead) continue;
      const relativeA = { x: stroke.a.x - f.prevX, y: stroke.a.y - f.prevY }, relativeB = { x: stroke.b.x - f.x, y: stroke.b.y - f.y };
      if (segmentDistance(relativeA, relativeB, { x: 0, y: 0 }) <= f.r) this.slash(f, stroke);
    }
    this.fruits = this.fruits.filter(f => !f.dead);
  }
  getResult() { return { source: this.source, score: this.score, sliced: this.sliced, missed: this.missed, bombs: this.bombs, bestCombo: this.bestCombo,
    powerSlashes: this.powerSlashes, xSlashes: this.xSlashes, elapsed: this.elapsed, title: this.score >= 3500 ? 'JUICY NINJA' : this.score >= 1800 ? 'FRUIT SAMURAI' : this.score > 0 ? 'FRESH CUT' : 'NEXT SLASH!' }; }
}
