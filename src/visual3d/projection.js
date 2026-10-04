export const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function normalizedToNdc(point, { mirror = false } = {}) {
  const rawX = clamp01(point?.x);
  const x = mirror ? 1 - rawX : rawX;
  const y = clamp01(point?.y);
  return { x: x * 2 - 1, y: 1 - y * 2 };
}

export function normalizePixels(point, width, height) {
  if (!point || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return { x: clamp01(point.x / width), y: clamp01(point.y / height) };
}

export function syntheticPlaneZ(depth, range = 4) {
  return -clamp01(depth) * Math.max(0, Number(range) || 0);
}
