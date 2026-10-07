// All time arguments in this package are seconds. Invalid/nonpositive dt holds.
export function exponentialSmooth(current, target, dt, tau) {
  if (!Number.isFinite(target) || !Number.isFinite(dt) || dt <= 0) return current;
  if (!Number.isFinite(current) || tau === 0) return target;
  if (!Number.isFinite(tau) || tau < 0) return current;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

// Supply out to reuse storage in a frame loop; neither input is mutated by default.
export function smoothVec2(current, target, dt, tau, out = {}) {
  out.x = exponentialSmooth(current.x, target.x, dt, tau);
  out.y = exponentialSmooth(current.y, target.y, dt, tau);
  return out;
}
