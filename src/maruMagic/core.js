import { DwellTarget } from '../cameraUi/core.js';
// Score v0.1: screen-space geometry only. No camera, renderer, time or input source.
export const SIZE = 600;
export const RULES = Object.freeze({ holdMs: 300, stillPx: 14, startPx: 20, timeoutMs: 8000, graceMs: 550, minRadius: 42 });
export const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inside = (p, target) => p && target && p.x >= target.left && p.x <= target.right && p.y >= target.top && p.y <= target.bottom;
const angleDelta = a => Math.atan2(Math.sin(a), Math.cos(a));
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
export const spiritFor = score => score >= 95 ? 3 : score >= 80 ? 2 : score >= 50 ? 1 : 0;

export function cleanTrajectory(input) {
  const points = [];
  for (const p of input ?? []) if (Number.isFinite(p?.x) && Number.isFinite(p?.y) && (!points.length || distance(points.at(-1), p) > .01)) points.push({ x: p.x, y: p.y });
  const step = median(points.slice(1).map((p, i) => distance(p, points[i])));
  // Only isolated out-and-back jumps, never persistent deviations or drawing noise.
  const threshold = Math.max(18, step * 7);
  return points.filter((p, i) => !i || i === points.length - 1 || !(distance(points[i - 1], p) > threshold && distance(p, points[i + 1]) > threshold && distance(points[i - 1], points[i + 1]) < Math.max(8, step * 3)));
}

export function resample(points, count = 128) {
  if (points.length < 2) return points;
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths.at(-1) + distance(points[i - 1], points[i]));
  const total = lengths.at(-1); if (!total) return [points[0]];
  const result = []; let j = 1;
  for (let i = 0; i < count; i++) {
    const target = total * i / (count - 1);
    while (j < lengths.length - 1 && lengths[j] < target) j++;
    const t = (target - lengths[j - 1]) / (lengths[j] - lengths[j - 1] || 1);
    result.push({ x: points[j - 1].x + (points[j].x - points[j - 1].x) * t, y: points[j - 1].y + (points[j].y - points[j - 1].y) * t });
  }
  return result;
}

export function fitCircle(points) {
  if (points.length < 3) return null;
  const n = points.length, mx = points.reduce((s, p) => s + p.x, 0) / n, my = points.reduce((s, p) => s + p.y, 0) / n;
  let xx = 0, xy = 0, yy = 0, bx = 0, by = 0;
  for (const p of points) { const x = p.x - mx, y = p.y - my, q = x * x + y * y; xx += x * x; xy += x * y; yy += y * y; bx += x * q / 2; by += y * q / 2; }
  const det = xx * yy - xy * xy;
  if (det < 1e-10 * (xx + yy) ** 2) return null;
  const x = (bx * yy - by * xy) / det, y = (by * xx - bx * xy) / det;
  return { x: mx + x, y: my + y, radius: Math.sqrt((xx + yy) / n + x * x + y * y) };
}

export function winding(points, circle) {
  const angles = points.map(p => Math.atan2(p.y - circle.y, p.x - circle.x));
  let signed = 0, travel = 0;
  for (let i = 1; i < angles.length; i++) { const d = angleDelta(angles[i] - angles[i - 1]); signed += d; travel += Math.abs(d); }
  const sorted = angles.map(a => (a + TAU) % TAU).sort((a, b) => a - b);
  let gap = sorted[0] + TAU - sorted.at(-1);
  for (let i = 1; i < sorted.length; i++) gap = Math.max(gap, sorted[i] - sorted[i - 1]);
  return { turns: Math.abs(signed) / TAU, coverage: (TAU - gap) / TAU, reverse: (travel - Math.abs(signed)) / TAU / 2, travel: travel / TAU };
}

export function scoreCircle(input, { minRadius = RULES.minRadius } = {}) {
  const cleaned = cleanTrajectory(input), points = resample(cleaned), circle = fitCircle(points);
  const base = { score: 0, spirit: 0, valid: false, reason: 'line', parts: { roundness: 0, closure: 0, smoothness: 0 }, circle, removed: (input?.length ?? 0) - cleaned.length };
  if (cleaned.length < 12 || !circle || !Number.isFinite(circle.radius)) return base;
  const r = circle.radius, w = winding(points, circle), gap = distance(cleaned[0], cleaned.at(-1)) / r;
  const radialError = Math.sqrt(points.reduce((s, p) => s + (distance(p, circle) / r - 1) ** 2, 0) / points.length);
  const roundness = Math.exp(-7 * Math.max(0, radialError - .01));
  const closure = clamp(1 - gap / 1.5);
  const headings = points.slice(1).map((p, i) => Math.atan2(p.y - points[i].y, p.x - points[i].x));
  const bends = headings.slice(1).map((a, i) => angleDelta(a - headings[i]));
  const direction = Math.sign(bends.reduce((a, b) => a + b, 0)) || 1;
  const roughness = bends.reduce((s, a) => s + Math.abs(a - direction * TAU / points.length), 0) / bends.length;
  const smoothness = 1 / (1 + roughness * 3);
  let reason = null;
  if (r < minRadius) reason = 'small';
  else if (w.turns > 1.23 || w.travel > 1.65) reason = 'multiple';
  else if (w.reverse > .16) reason = 'reverse';
  else if (w.turns < .86 || w.coverage < .86 || gap > .65) reason = 'open';
  const parts = { roundness: Math.round(roundness * 100), closure: Math.round(closure * 100), smoothness: Math.round(smoothness * 100) };
  // Guards cap a malformed attempt. Speed never adds points.
  const score = Math.min(reason ? 49 : 100, Math.round(75 * roundness + 15 * closure + 10 * smoothness));
  return { ...base, score, spirit: spiritFor(score), valid: !reason, reason, parts, circle, radialError, ...w, gap };
}

export class MaruGame {
  constructor() { this.reset(); }
  reset() { this.phase = 'ready'; this.points = []; this.result = null; this.anchor = null; this.anchorAt = null; this.armed = false; this.lastPresent = null; this.missingAt = null; this.excludedMs = 0; this.elapsedMs = 0; this.message = null; this.paused = false; this.startExclusion = null; }
  waitOutside(target) { this.startExclusion = target ? { ...target } : null; this.anchor = null; this.anchorAt = null; this.armed = false; }
  begin(p, at) { this.phase = 'drawing'; this.points = [{ ...p }]; this.startAt = at; this.elapsedMs = 0; this.excludedMs = 0; this.message = null; }
  sample(p, at, source = 'camera') {
    if (this.paused || !['ready', 'drawing'].includes(this.phase) || !Number.isFinite(p?.x) || !Number.isFinite(p?.y) || !Number.isFinite(at)) return false;
    if (this.missingAt !== null) {
      const lost = at - this.missingAt;
      if (lost > RULES.graceMs || (this.phase === 'drawing' && distance(this.points.at(-1), p) > 100)) { this.cancel('tracking'); }
      else this.excludedMs += lost;
      this.missingAt = null;
    }
    this.lastPresent = at;
    if (this.phase === 'ready') {
      // A retry dwell expresses retry intent, never the next circle's start point.
      if (source === 'camera' && this.startExclusion) {
        if (inside(p, this.startExclusion)) return false;
        this.startExclusion = null; this.anchor = null; this.anchorAt = null; this.armed = false;
      }
      if (source === 'touch') { this.begin(p, at); return true; }
      if (!this.anchor || (!this.armed && distance(p, this.anchor) > RULES.stillPx)) { this.anchor = { ...p }; this.anchorAt = at; this.armed = false; }
      if (!this.armed && at - this.anchorAt >= RULES.holdMs) { this.armed = true; this.message = null; }
      if (this.armed && distance(p, this.anchor) >= RULES.startPx) { this.begin(this.anchor, at); this.points.push({ ...p }); return true; }
      return false;
    }
    if (distance(p, this.points.at(-1)) >= .5) this.points.push({ ...p });
    this.elapsedMs = Math.max(0, at - this.startAt - this.excludedMs);
    if (this.points.length >= 16) {
      const circle = fitCircle(resample(cleanTrajectory(this.points), 64));
      if (circle && circle.radius >= RULES.minRadius) {
        const w = winding(this.points, circle);
        if (w.turns >= .91 && w.coverage >= .88 && distance(p, this.points[0]) <= Math.max(14, circle.radius * .23)) return this.finish(at, 'closed');
      }
    }
    if (this.elapsedMs >= RULES.timeoutMs) return this.finish(at, 'timeout');
    return false;
  }
  missing(at) {
    if (this.paused || !['ready', 'drawing'].includes(this.phase)) return;
    if (this.lastPresent === null) return;
    this.missingAt ??= this.lastPresent;
    if (this.phase === 'ready') { this.anchor = null; this.anchorAt = null; this.armed = false; }
    if (at - this.missingAt > RULES.graceMs) this.cancel('tracking');
  }
  tick(at) {
    if (this.paused || this.phase !== 'drawing') return;
    if (this.missingAt !== null) { this.missing(at); return; }
    this.elapsedMs = Math.max(0, at - this.startAt - this.excludedMs);
    if (this.elapsedMs >= RULES.timeoutMs) this.finish(at, 'timeout');
  }
  finish(at, ending = 'release') {
    if (this.phase !== 'drawing') return false;
    this.elapsedMs = Math.min(RULES.timeoutMs, Math.max(0, at - this.startAt - this.excludedMs));
    const evaluated = scoreCircle(this.points);
    this.result = { ...evaluated, elapsedMs: this.elapsedMs, ending, version: '0.1' };
    this.phase = 'summoned'; return true;
  }
  cancel(message = null) { const paused = this.paused, exclusion = this.startExclusion; this.reset(); this.paused = paused; this.message = message; this.startExclusion = exclusion; }
  pause() { this.cancel('pause'); this.paused = true; }
  resume() { this.paused = false; this.lastPresent = null; }
}

export function updateRecords(current, result) {
  const best = Math.max(Number.isFinite(current?.best) ? clamp(current.best, 0, 100) : 0, result.score);
  const previous = Number.isFinite(current?.fastestMs) && current.fastestMs > 0 ? current.fastestMs : null;
  // Fastest is meaningful only for a complete, at-least-80-point circle.
  const qualifies = result.valid && result.score >= 80 && result.elapsedMs >= 150 && result.ending === 'closed';
  return { best, fastestMs: qualifies ? Math.min(previous ?? Infinity, result.elapsedMs) : previous };
}

// Keep the tested MARU MAGIC API and defaults; share the dwell implementation.
export class DwellRetry extends DwellTarget {}
