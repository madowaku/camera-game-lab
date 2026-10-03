export const AIM_LOCK_MS = 250;

// Active target overlap, never a thumb joint, is the firing input.
export class AimLock {
  constructor() { this.reset(); }
  reset() { this.targetId = null; this.since = null; this.lastAt = null; this.fired = false; }
  update(aim, target, timestamp) {
    if (!Number.isFinite(timestamp)) { this.reset(); return { progress: 0, fire: false }; }
    if (this.lastAt !== null && (timestamp < this.lastAt || timestamp - this.lastAt > 150)) this.since = null;
    this.lastAt = timestamp;
    const id = target?.id ?? null;
    if (id !== this.targetId) { this.targetId = id; this.since = null; this.fired = false; }
    const inside = aim?.visible && target && Number.isFinite(aim.x) && Number.isFinite(aim.y)
      && Math.hypot(aim.x - target.x, aim.y - target.y) <= target.radius;
    if (!inside) { this.since = null; return { progress: 0, fire: false }; }
    this.since ??= timestamp;
    const progress = Math.min(1, (timestamp - this.since) / AIM_LOCK_MS);
    const fire = progress === 1 && !this.fired;
    if (fire) this.fired = true;
    return { progress, fire };
  }
}
