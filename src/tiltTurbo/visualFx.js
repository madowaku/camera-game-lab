export const clamp01 = value => Math.max(0, Math.min(1, value));

export function speedFxAmount(speed, reducedMotion = false) {
  if (reducedMotion || !Number.isFinite(speed)) return 0;
  return clamp01((speed - 38) / 48);
}

export function speedSway(time, amount) {
  const a = clamp01(amount);
  if (!a || !Number.isFinite(time)) return { x: 0, y: 0 };
  return {
    x: Math.sin(time * .021) * 1.35 * a,
    y: Math.cos(time * .017) * .65 * a,
  };
}
