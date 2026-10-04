import { POSES, clamp } from './poses.js';
export const ROUND_SECONDS = 15, WALL_SECONDS = 3, CONTACT = 2, HOLD = .3;
export const rankFor = score => score >= 90 ? 'PERFECT' : score >= 70 ? 'CLEAR' : score >= 50 ? 'SQUEEZE' : 'CRASH';
// Time-weighted average: a single good frame cannot erase the prior 300ms.
export function heldScore(samples, end, window = HOLD) {
  const start = end - window; let sum = 0, covered = 0;
  for (let i = 0; i < samples.length; i++) {
    const from = Math.max(start, samples[i].at), to = Math.min(end, samples[i + 1]?.at ?? end);
    if (to > from) { sum += samples[i].score * (to - from); covered += to - from; }
  }
  return Math.round(sum / Math.max(window, covered));
}
export class PoseWallGame {
  constructor() { this.reset(); }
  reset() { this.phase = 'waiting'; this.elapsed = 0; this.paused = false; this.wallIndex = 0; this.samples = []; this.walls = []; this.events = []; this.combo = 0; this.perfectStreak = 0; this.bestCombo = 0; this.result = null; }
  get target() { return POSES[this.wallIndex]; }
  get wallTime() { return this.elapsed - this.wallIndex * WALL_SECONDS; }
  get stage() { return this.wallTime < .5 ? 'show' : this.wallTime < CONTACT ? 'approach' : this.wallTime < 2.4 ? 'judge' : 'pass'; }
  start() { this.reset(); this.phase = 'playing'; this.events.push({ type: 'wall', index: 0 }); }
  clearHold() { this.samples = []; }
  step(dt, score = 0) {
    if (this.phase !== 'playing' || this.paused || !Number.isFinite(dt) || dt <= 0) return;
    const end = Math.min(ROUND_SECONDS, this.elapsed + dt);
    // Split large debug/test steps at contacts and wall boundaries.
    while (this.elapsed < end - 1e-8) {
      const base = this.wallIndex * WALL_SECONDS, contact = base + CONTACT, boundary = base + WALL_SECONDS;
      this.samples.push({ at: this.elapsed, score: clamp(Number.isFinite(score) ? score : 0, 0, 100) });
      this.samples = this.samples.filter((s, i, a) => i === a.length - 1 || a[i + 1].at >= this.elapsed - HOLD - .1);
      const next = Math.min(end, this.elapsed < contact - 1e-8 ? contact : boundary);
      this.elapsed = next;
      if (Math.abs(next - contact) < 1e-8 && this.walls.length === this.wallIndex) {
        const held = heldScore(this.samples, contact), rank = rankFor(held);
        if (rank === 'CRASH') this.combo = 0; else this.combo++;
        this.perfectStreak = rank === 'PERFECT' ? this.perfectStreak + 1 : 0;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.walls.push({ index: this.wallIndex, name: this.target.name, score: held, rank });
        this.events.push({ type: 'judge', rank, score: held, combo: this.combo });
      }
      if (Math.abs(next - boundary) < 1e-8) {
        this.samples = [];
        if (this.wallIndex === 4) { this.finish(); break; }
        this.wallIndex++; this.events.push({ type: 'wall', index: this.wallIndex });
      }
    }
  }
  finish() {
    this.phase = 'result';
    const score = Math.round(this.walls.reduce((sum, w) => sum + w.score, 0) / 5);
    const counts = Object.fromEntries(['PERFECT', 'CLEAR', 'SQUEEZE', 'CRASH'].map(r => [r, this.walls.filter(w => w.rank === r).length]));
    const best = this.walls.reduce((a, b) => b.score > a.score ? b : a);
    this.result = { score, accuracy: score, counts, best: { ...best }, bestCombo: this.bestCombo, walls: this.walls.map(w => ({ ...w })), title: score >= 90 ? 'POSE MASTER' : score >= 70 ? 'WALL STAR' : score >= 50 ? 'SQUEEZE CLUB' : 'CRASH PARTY' };
  }
  takeEvents() { return this.events.splice(0); }
}
