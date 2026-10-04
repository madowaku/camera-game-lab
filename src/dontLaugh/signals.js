export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const dist = (a, b, aspect) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

export function faceInFrame(signal, aspect) {
  if (!signal?.box || !Number.isFinite(aspect) || aspect <= 0) return false;
  const target = 9 / 16, sx = Math.max(1, aspect / target), sy = Math.max(1, target / aspect), b = signal.box;
  const left = .5 + (b.x - .5) * sx, right = left + b.w * sx, top = .5 + (b.y - .5) * sy, bottom = top + b.h * sy;
  return left >= .025 && right <= .975 && top >= .18 && bottom <= .81;
}

// Measurements use the original camera frame, before any joke, mirror or crop.
export function measureFace(result, aspect = 1) {
  if (result?.faceLandmarks?.length !== 1) return null;
  const p = result.faceLandmarks[0];
  const indices = [1, 4, 10, 13, 14, 33, 61, 133, 145, 152, 159, 168, 234, 263, 291, 362, 374, 386, 454];
  if (!indices.every(i => finite(p[i])) || !Number.isFinite(aspect) || aspect <= 0) return null;
  const width = dist(p[234], p[454], aspect), height = dist(p[10], p[152], aspect);
  const mouthWidth = dist(p[61], p[291], aspect);
  if (width < .12 || height < .16 || mouthWidth < .025) return null;
  const down = { x: (p[152].x - p[10].x) * aspect / height, y: (p[152].y - p[10].y) / height };
  const mid = { x: (p[13].x + p[14].x) / 2, y: (p[13].y + p[14].y) / 2 };
  const cornerRise = mean([61, 291].map(i => ((mid.x - p[i].x) * aspect * down.x + (mid.y - p[i].y) * down.y) / mouthWidth));
  const eye = mean([[159, 145, 33, 133], [386, 374, 263, 362]].map(([a, b, l, r]) => dist(p[a], p[b], aspect) / dist(p[l], p[r], aspect)));
  if (!Number.isFinite(eye)) return null;
  const shapes = Object.fromEntries((result.faceBlendshapes?.[0]?.categories ?? []).map(c => [c.categoryName, c.score]));
  const pair = name => mean(['Left', 'Right'].map(side => clamp(Number(shapes[name + side]) || 0)));
  return { cornerRise, width: mouthWidth / width, open: dist(p[13], p[14], aspect) / mouthWidth, eye,
    smile: pair('mouthSmile'), cheek: pair('cheekSquint'), squint: pair('eyeSquint'), points: p,
    box: { x: Math.min(p[234].x, p[454].x), y: p[10].y, w: Math.abs(p[454].x - p[234].x), h: Math.abs(p[152].y - p[10].y) } };
}

export function smileScore(signal, neutral) {
  if (!signal || !neutral) return 0;
  const corners = clamp((signal.cornerRise - neutral.cornerRise - .012) / .105);
  const wide = clamp((signal.width - neutral.width - .015) / .09);
  const mouth = clamp((signal.open - neutral.open - .025) / .3);
  const eyes = clamp((neutral.eye - signal.eye - .018) / .095);
  const cheeks = clamp((signal.cheek - neutral.cheek) / .45);
  const smile = clamp((signal.smile - neutral.smile - .04) / .55);
  // Opening the mouth, speaking or blinking alone cannot reach the threshold.
  const geometry = .62 * corners + .22 * wide + .08 * mouth + .08 * eyes * Math.max(corners, wide);
  const blend = .78 * smile + .14 * cheeks * smile + .08 * clamp(signal.squint) * smile;
  return 100 * clamp(Math.max(geometry, blend) + .06 * mouth * Math.max(corners, smile));
}

export class SmileTracker {
  constructor() { this.reset(); }
  reset() { this.neutral = null; this.samples = []; this.lastAt = null; this.score = 0; this.progress = 0; }
  update(signal, now) {
    const gap = this.lastAt == null ? 0 : now - this.lastAt; this.lastAt = now;
    if (!signal) { this.samples = []; this.progress = 0; this.score = 0; return { visible: false, ready: false, score: 0, progress: 0 }; }
    if (!this.neutral) {
      if (gap > 200 || gap < 0 || signal.open > .17 || signal.smile > .32) this.samples = [];
      if (signal.open <= .17 && signal.smile <= .32) this.samples.push({ ...signal, at: now });
      const span = this.samples.length ? now - this.samples[0].at : 0;
      this.progress = clamp(span / 800);
      if (span >= 800 && this.samples.length >= 8) {
        const keys = ['cornerRise', 'width', 'open', 'eye', 'smile', 'cheek'];
        this.neutral = Object.fromEntries(keys.map(key => [key, mean(this.samples.map(s => s[key]))]));
        this.samples = [];
      }
    }
    const raw = smileScore(signal, this.neutral);
    this.score = gap > 200 || gap < 0 ? raw : this.score + (raw - this.score) * (1 - Math.exp(-Math.max(1, gap) / 55));
    return { visible: true, ready: !!this.neutral, score: this.score, progress: this.progress, signal };
  }
}
