export const FRAME_MARGIN = .08;
export const FRAME_STALE_MS = 500;

// Match the visible, object-fit: cover viewport, including front-camera mirroring.
export function projectCargo(point, videoWidth, videoHeight, width, height, mirrored = false) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const x = (point.x * videoWidth * scale - (videoWidth * scale - width) / 2) / width;
  return { x: mirrored ? 1 - x : x, y: (point.y * videoHeight * scale - (videoHeight * scale - height) / 2) / height };
}

const valid = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const inside = (p) => p.x >= FRAME_MARGIN && p.x <= 1 - FRAME_MARGIN && p.y >= FRAME_MARGIN && p.y <= 1 - FRAME_MARGIN;
const beyond = (p) => p.x < -.02 || p.x > 1.02 || p.y < -.02 || p.y > 1.02;
const leaving = (a, b) => (b.x < FRAME_MARGIN && b.x < a.x - .004) || (b.x > 1 - FRAME_MARGIN && b.x > a.x + .004) || (b.y < FRAME_MARGIN && b.y < a.y - .004) || (b.y > 1 - FRAME_MARGIN && b.y > a.y + .004);

export class CargoFrame {
  constructor() { this.reset(); }
  reset() { this.state = 'lost'; this.point = null; this.lastPoint = null; this.lastSeen = -Infinity; this.lastFrame = -Infinity; this.exitArmed = false; this.missingSince = null; }
  update(point, now) {
    if (now - this.lastFrame > FRAME_STALE_MS) this.reset();
    this.lastFrame = now;
    if (valid(point)) {
      const previous = this.lastPoint;
      this.exitArmed = !!previous && now - this.lastSeen <= 300 && leaving(previous, point);
      this.lastPoint = { ...point }; this.lastSeen = now; this.point = { ...point }; this.missingSince = null;
      this.state = inside(point) ? 'inside' : beyond(point) ? 'outside' : 'edge';
    } else {
      this.point = null;
      if (this.missingSince === null) {
        this.missingSince = now;
        this.exitArmed = (this.exitArmed || this.state === 'outside') && now - this.lastSeen <= 300;
      }
      this.state = this.exitArmed && now - this.missingSince >= 180 ? 'outside' : 'lost';
    }
    return this.snapshot(now);
  }
  snapshot(now) { return { state: now - this.lastFrame > FRAME_STALE_MS ? 'stale' : this.state, point: this.point }; }
}
