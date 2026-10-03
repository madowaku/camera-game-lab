const valid = (p) => p && [p.x, p.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1);
export function handCenter(result) {
  const points = result?.landmarks?.[0], palm = [0, 5, 9].map(i => points?.[i]);
  if (!palm.every(valid)) return null;
  return { x: palm.reduce((n, p) => n + p.x, 0) / 3, y: palm.reduce((n, p) => n + p.y, 0) / 3 };
}
export function mouthSignal(result, aspect = 1) {
  if (result?.faceLandmarks?.length !== 1) return null;
  const face = result.faceLandmarks[0], lips = [13, 14, 61, 291].map(i => face?.[i]);
  if (!lips.every(valid)) return null;
  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const width = distance(lips[2], lips[3]);
  if (width < .025) return null;
  return { x: (lips[0].x + lips[1].x) / 2, y: (lips[0].y + lips[1].y) / 2, ratio: distance(lips[0], lips[1]) / width };
}
