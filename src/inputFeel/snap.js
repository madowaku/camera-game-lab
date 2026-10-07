export const SNAP_STATES = Object.freeze({ FREE: 'FREE', ATTRACTED: 'ATTRACTED', SNAPPED: 'SNAPPED' });

// Pass the previous result's state in options.state. Distance is always measured
// from the new unmodified input, never from the previous snapped output.
// This is a spatial mapping, not a per-frame easing operation.
export function magneticSnap(position, target, { radius = .1, strength = .5, releaseRadius = radius * 1.4,
  snapRadius = radius * .15, state = SNAP_STATES.FREE } = {}, out = {}) {
  if (![radius, releaseRadius, snapRadius, strength].every(Number.isFinite) || radius <= 0 ||
    releaseRadius < radius || snapRadius < 0 || snapRadius > radius || strength < 0 || strength > 1) throw new RangeError('invalid magnetic snap options');
  const valid = [position?.x, position?.y, target?.x, target?.y].every(Number.isFinite);
  const distance = valid ? Math.hypot(target.x - position.x, target.y - position.y) : Infinity;
  const captured = state === SNAP_STATES.SNAPPED || state === SNAP_STATES.ATTRACTED;
  const within = distance <= (captured ? releaseRadius : radius);
  out.state = !within || strength === 0 ? SNAP_STATES.FREE :
    state === SNAP_STATES.SNAPPED || distance <= snapRadius ? SNAP_STATES.SNAPPED : SNAP_STATES.ATTRACTED;
  const amount = out.state === SNAP_STATES.SNAPPED ? 1 : out.state === SNAP_STATES.ATTRACTED ?
    strength * Math.max(0, 1 - distance / radius) : 0;
  out.x = position?.x; out.y = position?.y;
  if (valid) { out.x += (target.x - position.x) * amount; out.y += (target.y - position.y) * amount; }
  return out;
}
