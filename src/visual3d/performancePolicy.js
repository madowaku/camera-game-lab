export const QUALITY_PROFILES = Object.freeze({
  low: Object.freeze({ id: 'low', maxPixelRatio: 1, particles: 80, trailLength: 12, postFx: false, antialias: false }),
  standard: Object.freeze({ id: 'standard', maxPixelRatio: 1.5, particles: 180, trailLength: 24, postFx: false, antialias: true }),
  high: Object.freeze({ id: 'high', maxPixelRatio: 2, particles: 400, trailLength: 36, postFx: true, antialias: true }),
});
const ORDER = ['low', 'standard', 'high'];

export function initialQuality({ devicePixelRatio = 1, hardwareConcurrency = 4, reducedMotion = false } = {}) {
  if (reducedMotion || hardwareConcurrency <= 2) return QUALITY_PROFILES.low;
  if (hardwareConcurrency >= 8 && devicePixelRatio <= 2.5) return QUALITY_PROFILES.high;
  return QUALITY_PROFILES.standard;
}

export function degradeQuality(profile) {
  const id = typeof profile === 'string' ? profile : profile?.id;
  const index = Math.max(0, ORDER.indexOf(id));
  return QUALITY_PROFILES[ORDER[Math.max(0, index - 1)]];
}

export class PerformanceGovernor {
  constructor(profile = QUALITY_PROFILES.standard, { sampleWindow = 45, slowMs = 27 } = {}) {
    this.profile = typeof profile === 'string' ? QUALITY_PROFILES[profile] : profile;
    this.sampleWindow = sampleWindow; this.slowMs = slowMs; this.samples = []; this.changes = 0;
  }
  sample(frameMs) {
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) return null;
    this.samples.push(frameMs);
    if (this.samples.length < this.sampleWindow) return null;
    const average = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.samples.length = 0;
    if (average <= this.slowMs || this.profile.id === 'low' || this.changes >= 2) return null;
    this.profile = degradeQuality(this.profile); this.changes++; return this.profile;
  }
}
