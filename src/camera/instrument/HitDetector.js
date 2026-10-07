import { zoneDistance } from './InstrumentZone.js';

export class HitDetector {
  constructor() { this.reset(); }
  reset() { this.previous = null; this.point = null; this.velocity = 0; }
  update(zones, raw, at, viewport) {
    if (!raw || !Number.isFinite(at) || ![raw.x, raw.y].every(Number.isFinite)) {
      this.reset();
      for (const zone of zones) { zone.state = 'IDLE'; zone.armed = false; }
      return null;
    }
    const previous = this.previous, dt = previous ? at - previous.at : 0;
    if (previous && dt <= 0) return null;
    const fresh = !previous || dt > 250;
    // Time-based smoothing gives the same response across camera frame rates.
    const alpha = fresh ? 1 : 1 - Math.exp(-dt / 45);
    const point = fresh ? { ...raw } : { x: previous.x + alpha * (raw.x - previous.x), y: previous.y + alpha * (raw.y - previous.y) };
    const short = Math.min(viewport.width, viewport.height), seconds = Math.max(.001, dt / 1000);
    const down = fresh ? 0 : (point.y - previous.y) * viewport.height / short / seconds;
    this.velocity = fresh ? 0 : zoneDistance(previous, point, viewport) / seconds;
    this.point = point; this.previous = { ...point, at };
    const candidates = [];
    for (const zone of zones) {
      const distance = zoneDistance(zone, point, viewport);
      if (distance > zone.radius * 1.2 && at - zone.lastHit >= zone.cooldownMs) { zone.armed = true; zone.state = 'IDLE'; }
      if (fresh && distance <= zone.radius * 1.2) zone.armed = false; // acquisition/recovery never strikes
      if (!zone.armed || at - zone.lastHit < zone.cooldownMs) { zone.state = 'COOLDOWN'; continue; }
      zone.state = distance <= zone.radius * 1.25 ? 'HOVER' : 'IDLE';
      if (fresh || distance > zone.radius) continue;
      const oldDistance = zoneDistance(zone, previous, viewport), inward = (oldDistance - distance) / seconds;
      const penetration = (zone.radius - distance) / zone.radius;
      const crossed = oldDistance > zone.radius && distance <= zone.radius;
      // A slow deliberate press may also reach the central half of the spot.
      // Boundary jitter still cannot fire; acquisition inside is disarmed above.
      const deepPress = penetration >= .5 && inward > .015;
      const hit = zone.triggerMode === 'enter' ? crossed : penetration >= .12 && (down > .45 || inward > .5 || deepPress);
      if (hit) candidates.push({ zone, distance: distance / zone.radius, velocity: this.velocity });
    }
    // Overlapping zones choose the nearest centre, never two notes from one tap.
    candidates.sort((a, b) => a.distance - b.distance);
    const chosen = candidates[0] ?? null;
    if (chosen) for (const zone of zones) {
      // Consume the whole contact, including overlapping spots whose deeper
      // threshold would otherwise fire in a subsequent camera frame.
      if (zoneDistance(zone, point, viewport) <= zone.radius * 1.2) zone.armed = false;
    }
    return chosen;
  }
}
