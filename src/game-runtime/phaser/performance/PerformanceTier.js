export const STANDARD = Object.freeze({ name: 'STANDARD', targetFps: 60, maxParticles: 96, maxPopups: 12, maxDpr: 1.5, trails: true, postFX: false });
export function renderSize(width, height, dpr = 1) {
  const ratio = Math.min(STANDARD.maxDpr, Math.max(1, dpr));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}
