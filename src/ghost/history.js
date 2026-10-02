// A bounded coordinate-only ring. Camera frames never enter the history.
export class PositionHistory {
  constructor(capacity = 2048, keepMs = 13000) {
    this.capacity = capacity; this.keepMs = keepMs; this.clear();
  }
  clear() { this.samples = new Array(this.capacity); this.head = 0; this.length = 0; }
  get(index) { return this.samples[(this.head + index) % this.capacity]; }
  add(time, point, segment = 0) {
    if (![time, point?.x, point?.y].every(Number.isFinite)) return;
    const sample = { time, x: point.x, y: point.y, segment }, last = this.get(this.length - 1);
    if (last && time < last.time) return;
    if (last?.time === time) { this.samples[(this.head + this.length - 1) % this.capacity] = sample; return; }
    // Keep the latest point in each 16ms bucket. Even 240Hz+ displays retain
    // the full 12-second echo horizon without growing memory every frame.
    if (this.length >= 2 && this.get(this.length - 2).segment === segment && last.segment === segment && Math.floor(last.time / 16) === Math.floor(time / 16)) {
      this.samples[(this.head + this.length - 1) % this.capacity] = sample; return;
    }
    if (this.length === this.capacity) { this.head = (this.head + 1) % this.capacity; this.length--; }
    this.samples[(this.head + this.length++) % this.capacity] = sample;
    // Keep the sample preceding the retention boundary for interpolation.
    while (this.length > 2 && this.get(1).time < time - this.keepMs) {
      this.head = (this.head + 1) % this.capacity; this.length--;
    }
  }
  at(time) {
    if (!this.length || time < this.get(0).time || time > this.get(this.length - 1).time) return null;
    let low = 0, high = this.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (this.get(mid).time <= time) low = mid; else high = mid - 1;
    }
    const a = this.get(low), b = this.get(low + 1);
    if (a.time === time) return { ...a };
    if (!b || a.segment !== b.segment) return null;
    const t = (time - a.time) / (b.time - a.time);
    return { time, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, segment: a.segment };
  }
}
