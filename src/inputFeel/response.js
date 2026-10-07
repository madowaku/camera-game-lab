const unit = value => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));

// Input/output are normalized to [-1, 1]; the dead-zone boundary is continuous.
export function applyDeadZone(value, zone = 0) {
  value = unit(value);
  zone = Math.max(0, Math.min(1, Number.isFinite(zone) ? zone : 0));
  if (Math.abs(value) <= zone) return 0;
  return Math.sign(value) * (Math.abs(value) - zone) / (1 - zone);
}

export function responseCurve(value, exponent = 1) {
  value = unit(value);
  if (!Number.isFinite(exponent) || exponent <= 0) throw new RangeError('exponent must be positive');
  return value === 0 ? 0 : Math.sign(value) * Math.abs(value) ** exponent;
}
