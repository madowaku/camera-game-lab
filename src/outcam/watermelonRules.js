export const WATERMELON_RULES = Object.freeze({
  durationMs: 30000,
  targetCount: 3,
  hitRadius: 0.115,
  closeRadius: 0.22,
  swingMinSpeed: 0.9,
  swingMinTravel: 0.055,
  swingCooldownMs: 650
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createWatermelonTarget(random = Math.random) {
  return {
    x: 0.2 + clamp(random(), 0, 1) * 0.6,
    y: 0.5 + clamp(random(), 0, 1) * 0.32,
    radius: WATERMELON_RULES.hitRadius
  };
}

export function gradeStrike(target, strike, aspectRatio = 0.78) {
  if (!target || !strike) return { grade: "MISS", points: 0, distance: Infinity };
  const dx = (strike.x - target.x) * aspectRatio;
  const dy = strike.y - target.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= WATERMELON_RULES.hitRadius) return { grade: "HIT", points: 100, distance };
  if (distance <= WATERMELON_RULES.closeRadius) return { grade: "CLOSE", points: 35, distance };
  return { grade: "MISS", points: 0, distance };
}

export function detectDownwardSwing(previous, current, elapsedMs) {
  if (!previous || !current || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 220) return false;
  const dy = current.y - previous.y;
  const dx = current.x - previous.x;
  const speed = dy / (elapsedMs / 1000);
  return dy >= WATERMELON_RULES.swingMinTravel && speed >= WATERMELON_RULES.swingMinSpeed && Math.abs(dx) < 0.28;
}
