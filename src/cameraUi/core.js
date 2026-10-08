// Input-source-independent camera UI intents. All timestamps are milliseconds.
const finite = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inside = (p, b) => finite(p) && b && p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
const clamp = n => Math.max(0, Math.min(1, n));

// Source behavior matches the physically tested MARU MAGIC retry dwell.
export class DwellTarget {
  constructor({ holdMs = 700, tolerancePx = 24, maxGapMs = 150 } = {}) {
    if (!(holdMs > 0 && tolerancePx >= 0 && maxGapMs > 0)) throw new RangeError('Invalid dwell settings');
    this.holdMs = holdMs; this.tolerancePx = tolerancePx; this.maxGapMs = maxGapMs;
    this.reset();
  }
  reset() { this.anchor = null; this.startedAt = null; this.lastAt = null; this.progress = 0; }
  update(point, at, target) {
    if (!Number.isFinite(at) || !inside(point, target)) { this.reset(); return false; }
    if (!this.anchor || at < this.lastAt || distance(point, this.anchor) > this.tolerancePx || at - this.lastAt > this.maxGapMs) {
      this.anchor = { x: point.x, y: point.y }; this.startedAt = at;
    }
    this.lastAt = at;
    this.progress = clamp((at - this.startedAt) / this.holdMs);
    if (this.progress >= 1) { this.reset(); return true; }
    return false;
  }
}

// A deliberately bounded flick inside the left-hand FEED navigation lane.
// No continuous page scrolling: exactly one snapped card per intentional gesture.
export class AirSwipe {
  constructor({ lane = .24, minTravel = 110, maxTravelMs = 650, maxGapMs = 180, minSamples = 3, settleMs = 240 } = {}) {
    this.lane = lane; this.minTravel = minTravel; this.maxTravelMs = maxTravelMs;
    this.maxGapMs = maxGapMs; this.minSamples = minSamples; this.settleMs = settleMs;
    this.reset();
  }
  reset() { this.anchor = null; this.last = null; this.startAt = null; this.lastAt = null; this.samples = 0; this.locked = false; this.settleFrom = null; }
  update(point, at, { width, height, blocked = false } = {}) {
    if (!Number.isFinite(at) || !finite(point) || !Number.isFinite(width) || !Number.isFinite(height)
      || width <= 0 || height <= 0 || blocked || point.x > width * this.lane) { this.reset(); return 0; }
    if (this.locked) {
      if (!this.last || distance(this.last, point) > 6) this.settleFrom = null;
      else this.settleFrom ??= at;
      this.last = { ...point };
      if (this.settleFrom !== null && at - this.settleFrom >= this.settleMs) this.reset();
      return 0;
    }
    if (!this.anchor || at <= this.lastAt || at - this.lastAt > this.maxGapMs
      || distance(point, this.last) > height * .38) {
      this.anchor = { ...point }; this.startAt = at; this.samples = 1;
    } else this.samples++;
    this.lastAt = at; this.last = { ...point };
    const dx = point.x - this.anchor.x, dy = point.y - this.anchor.y, elapsed = at - this.startAt;
    if (elapsed > this.maxTravelMs || Math.abs(dx) > Math.max(45, Math.abs(dy) * .65)) {
      this.anchor = { ...point }; this.startAt = at; this.samples = 1; return 0;
    }
    if (this.samples < this.minSamples || Math.abs(dy) < Math.max(this.minTravel, height * .14) || elapsed < 90) return 0;
    this.locked = true; this.settleFrom = null;
    return dy < 0 ? 1 : -1;
  }
}

// Whole-frame mirrored landmark projection; no camera or DOM dependency.
export function projectHandCursor(result, width, height) {
  const tip = result?.landmarks?.[0]?.[8];
  if (!(width > 0 && height > 0) || !Number.isFinite(tip?.x) || !Number.isFinite(tip?.y)) return null;
  const x = (1 - tip.x) * width, y = tip.y * height;
  return x >= 0 && x <= width && y >= 0 && y <= height ? { x, y } : null;
}
