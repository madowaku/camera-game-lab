const valid = p => p && [p.x, p.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1);

// Geometry uses the actual video aspect, so portrait and landscape cameras
// have the same opening threshold. Neither gaze nor head angles are inputs.
export function noteEaterSignal(result, aspect = 1) {
  if (result?.faceLandmarks?.length !== 1 || !Number.isFinite(aspect) || aspect <= 0) return null;
  const points = result.faceLandmarks[0];
  const lips = [13, 14, 61, 291].map(i => points?.[i]);
  const bounds = [10, 152, 234, 454].map(i => points?.[i]);
  if (![...lips, ...bounds].every(valid)) return null;
  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const width = distance(lips[2], lips[3]);
  const ratio = distance(lips[0], lips[1]) / width;
  if (width < .025 || !Number.isFinite(ratio) || ratio > 1.5) return null;
  return {
    faceX: (bounds[2].x + bounds[3].x) / 2,
    faceY: (bounds[0].y + bounds[1].y) / 2,
    mouth: { x: (lips[0].x + lips[1].x) / 2, y: (lips[0].y + lips[1].y) / 2 },
    leftLip: lips[2], rightLip: lips[3], ratio,
  };
}

export class MouthState {
  constructor() { this.reset(); }
  reset() { this.state = "UNKNOWN"; this.pending = null; this.since = 0; this.last = null; }
  update(ratio, now) {
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1.5 || !Number.isFinite(now)) { this.reset(); return this.state; }
    if (this.last !== null && (now - this.last > 250 || now < this.last)) this.reset();
    this.last = now;
    const next = ratio >= .24 ? "OPEN" : ratio <= .12 ? "CLOSED" : this.state;
    if (next === this.state || next === "UNKNOWN") { this.pending = null; return this.state; }
    if (this.pending !== next) { this.pending = next; this.since = now; }
    if (now - this.since >= (next === "OPEN" ? 45 : 65)) { this.state = next; this.pending = null; }
    return this.state;
  }
}
