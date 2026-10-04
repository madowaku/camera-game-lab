export const ROUND_SECONDS = 30;
export const DRUMS = Object.freeze([
  { id: 0, x: .27, y: .38, rx: .17, ry: .078, color: "#ff6659", name: "DON", shape: "star" },
  { id: 1, x: .73, y: .38, rx: .17, ry: .078, color: "#ffc928", name: "PON", shape: "circle" },
  { id: 2, x: .27, y: .76, rx: .17, ry: .078, color: "#4cbcff", name: "BOM", shape: "bubble" },
  { id: 3, x: .73, y: .76, rx: .17, ry: .078, color: "#52d59b", name: "PA", shape: "confetti" },
]);
export const BIG_DRUM = Object.freeze({ id: 4, x: .5, y: .72, rx: .3, ry: .14, color: "#ffc928", name: "BIG DRUM" });
export const PATTERN = Object.freeze([
  { at: 5.8, drums: [0], level: 1 }, { at: 7.1, drums: [1], level: 1 }, { at: 8.4, drums: [2], level: 1 },
  { at: 9.7, drums: [0], level: 2 }, { at: 10.55, drums: [1], level: 2 },
  { at: 11.4, drums: [2], level: 2 }, { at: 12.25, drums: [3], level: 2 },
  { at: 13.3, drums: [0, 1], level: 2 },
  { at: 14.5, drums: [0], level: 3 }, { at: 15.35, drums: [3], level: 3 },
  { at: 16.2, drums: [1], level: 3 }, { at: 17.05, drums: [2], level: 3 },
  { at: 18.0, drums: [2, 3], level: 3 }, { at: 19.2, drums: [0, 3], level: 3 },
]);
export const inside = (p, d, scale = 1) => ((p.x - d.x) / (d.rx * scale)) ** 2 + ((p.y - d.y) / (d.ry * scale)) ** 2 <= 1;

// The swept path catches fast swings that skip the drum between camera frames.
export function entryOnSegment(a, b, d) {
  if (inside(a, d) || a.y >= d.y || b.y <= a.y) return null;
  const x = (a.x - d.x) / d.rx, y = (a.y - d.y) / d.ry;
  const dx = (b.x - a.x) / d.rx, dy = (b.y - a.y) / d.ry;
  const A = dx * dx + dy * dy, B = 2 * (x * dx + y * dy), C = x * x + y * y - 1;
  const discriminant = B * B - 4 * A * C;
  if (A === 0 || discriminant < 0) return null;
  const t = (-B - Math.sqrt(discriminant)) / (2 * A);
  return t >= 0 && t <= 1 ? t : null;
}

export class DrumHitDetector {
  constructor() { this.reset(); }
  reset() { this.previous = new Map(); this.latched = new Map(); this.lastHit = new Map(); }
  clearMotion() { this.previous.clear(); this.latched.clear(); }
  update(hands, now, targets = DRUMS) {
    const hits = [], seen = new Set();
    for (const h of hands) {
      const slot = h.slot;
      if (!h.present || !Number.isFinite(h.x) || !Number.isFinite(h.y)) { this.previous.delete(slot); this.latched.delete(slot); continue; }
      seen.add(slot);
      const old = this.previous.get(slot), blocked = this.latched.get(slot);
      if (blocked != null && !inside(h, targets.find(d => d.id === blocked) ?? BIG_DRUM, 1.2)) this.latched.delete(slot);
      this.previous.set(slot, { ...h, at: now });
      const dt = old ? now - old.at : 0;
      if (!old || dt < .008 || dt > .22 || this.latched.has(slot) || h.y - old.y < .008 || (h.y - old.y) / dt < .35) continue;
      const entries = targets.map(d => ({ d, t: entryOnSegment(old, h, d) })).filter(e => e.t != null).sort((a, b) => a.t - b.t);
      if (!entries.length) continue;
      const d = entries[0].d;
      // Global drum cooldown; BIG DRUM accepts the other hand in the same frame.
      const key = d.id === 4 ? `4:${slot}` : d.id;
      this.latched.set(slot, d.id);
      if (now - (this.lastHit.get(key) ?? -Infinity) < .2) continue;
      this.lastHit.set(key, now); hits.push({ drum: d.id, hand: slot, at: now });
    }
    for (const slot of this.previous.keys()) if (!seen.has(slot)) { this.previous.delete(slot); this.latched.delete(slot); }
    return hits;
  }
}

export class ToyDrumGame {
  constructor() { this.detector = new DrumHitDetector(); this.reset(); }
  reset() {
    this.elapsed = 0; this.phase = "waiting"; this.paused = false; this.result = null;
    this.score = 0; this.hits = 0; this.perfects = 0; this.doubles = 0; this.combo = 0; this.bestCombo = 0;
    this.finishSuccess = false; this.finishAt = null; this.events = []; this.hitAt = Array(5).fill(-Infinity);
    this.notes = PATTERN.map(n => ({ ...n, drums: [...n.drums], hit: new Set(), attempts: new Map(), done: false }));
    this.lastHits = []; this.bigHands = new Map(); this.demoCooldown = new Map(); this.detector.reset();
  }
  start() { this.reset(); this.phase = "free"; }
  get targets() { return this.phase === "finish" ? [BIG_DRUM] : DRUMS; }
  get cue() { return this.phase === "rhythm" ? this.notes.find(n => !n.done && this.elapsed >= n.at - .65 && this.elapsed <= n.at + .65) : null; }
  get level() { return this.cue?.level ?? (this.elapsed < 9 ? 1 : this.elapsed < 14 ? 2 : 3); }
  takeEvents() { return this.events.splice(0); }
  clearMotion() { this.detector.clearMotion(); this.lastHits = []; this.bigHands.clear(); }
  input(hands, timestamp) {
    if (this.paused || !["free", "rhythm", "fever", "finish"].includes(this.phase)) { this.clearMotion(); return; }
    for (const hit of this.detector.update(hands, timestamp, this.targets)) this.hit(hit.drum, hit.hand);
  }
  practiceHit(drum, hand = drum % 2) {
    const key = drum === 4 ? `4:${hand}` : drum;
    if (this.elapsed - (this.demoCooldown.get(key) ?? -Infinity) < .2) return false;
    if (!this.hit(drum, hand)) return false;
    this.demoCooldown.set(key, this.elapsed); return true;
  }
  hit(drum, hand) {
    if (this.paused || !this.targets.some(d => d.id === drum) || !["free", "rhythm", "fever", "finish"].includes(this.phase)) return false;
    if (this.phase === "finish" && this.finishSuccess) return false;
    this.hitAt[drum] = this.elapsed;
    this.events.push({ type: "hit", drum, at: this.elapsed });
    if (drum === 4) {
      this.bigHands.set(hand, this.elapsed);
      if ([...this.bigHands].some(([slot, at]) => slot !== hand && this.elapsed - at <= .3)) {
        this.finishSuccess = true; this.finishAt = this.elapsed; this.score += 300; this.doubles++;
        this.hitAt.fill(this.elapsed); this.addCombo(); this.events.push({ type: "finish", at: this.elapsed });
      }
      return true;
    }
    this.hits++;
    const note = this.phase === "rhythm" ? this.notes.find(n => !n.done && n.drums.includes(drum) && !n.hit.has(drum) && Math.abs(this.elapsed - n.at) <= .65) : null;
    let perfect = false, double = false;
    if (note) {
      // Paired cues need distinct hands within a forgiving 300ms window.
      if (note.drums.length === 2) {
        const other = [...note.attempts].find(([id, a]) => id !== drum && a.hand !== hand && this.elapsed - a.at <= .3);
        note.attempts.set(drum, { hand, at: this.elapsed });
        if (other) { note.hit = new Set(note.drums); note.done = true; double = true; this.addCombo(); }
      } else { note.hit.add(drum); note.done = true; this.addCombo(); perfect = Math.abs(this.elapsed - note.at) <= .22; }
    } else if (this.phase !== "rhythm") this.addCombo();
    if (perfect) this.perfects++;
    this.score += perfect ? 200 : 100;
    if (!double) {
      const other = this.lastHits.find(h => h.hand !== hand && h.drum !== drum && this.elapsed - h.at <= .15);
      if (other) { double = true; this.lastHits = []; } else this.lastHits = [{ drum, hand, at: this.elapsed }];
    } else this.lastHits = [];
    if (double) { this.doubles++; this.score += 100; this.events.push({ type: "double", at: this.elapsed }); }
    else if (perfect) this.events.push({ type: "perfect", at: this.elapsed });
    return true;
  }
  addCombo() { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); }
  step(dt) {
    if (this.paused || ["waiting", "result"].includes(this.phase)) return;
    this.elapsed = Math.min(ROUND_SECONDS, this.elapsed + Math.max(0, dt));
    for (const n of this.notes) if (!n.done && this.elapsed > n.at + .65) { n.done = true; if (this.phase === "rhythm") this.combo = 0; }
    const phase = this.elapsed < 5 ? "free" : this.elapsed < 20 ? "rhythm" : this.elapsed < 25 ? "fever" : this.elapsed < 30 ? "finish" : "result";
    if (phase !== this.phase) { this.phase = phase; this.clearMotion(); this.events.push({ type: phase, at: this.elapsed }); }
    if (phase === "result") this.result = { score: this.score, hits: this.hits, perfects: this.perfects, doubles: this.doubles, bestCombo: this.bestCombo, finishSuccess: this.finishSuccess, duration: this.elapsed, reason: "COMPLETE" };
  }
}
