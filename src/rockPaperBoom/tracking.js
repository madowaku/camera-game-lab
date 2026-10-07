const signs = { Closed_Fist: 'ROCK', Victory: 'SCISSORS', Open_Palm: 'PAPER' };
export const ZONES = Object.freeze([{ x: .06, y: .28, w: .38, h: .44 }, { x: .56, y: .28, w: .38, h: .44 }]);
export function containRect(videoAspect, stageAspect = 9 / 16) {
  if (!(videoAspect > 0) || !(stageAspect > 0)) return { x: 0, y: 0, w: 1, h: 1 };
  if (videoAspect > stageAspect) { const h = stageAspect / videoAspect; return { x: 0, y: (1 - h) / 2, w: 1, h }; }
  const w = videoAspect / stageAspect; return { x: (1 - w) / 2, y: 0, w, h: 1 };
}
// Rear feed is never mirrored. Handedness is not player identity: screen zones are.
export function assignHands(result, videoAspect, stageAspect = 9 / 16) {
  const rect = containRect(videoAspect, stageAspect), candidates = [[], []];
  for (const [i, points] of (result?.landmarks ?? []).entries()) {
    if (points.length < 21 || [0, 5, 9, 13, 17].some(n => !Number.isFinite(points[n]?.x) || !Number.isFinite(points[n]?.y))) continue;
    const center = [0, 5, 9, 13, 17].reduce((p, n) => ({ x: p.x + points[n].x / 5, y: p.y + points[n].y / 5 }), { x: 0, y: 0 });
    const x = rect.x + center.x * rect.w, y = rect.y + center.y * rect.h;
    const gesture = result.gestures?.[i]?.[0], sign = signs[gesture?.categoryName] ?? 'UNKNOWN';
    const side = ZONES.findIndex(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    if (side >= 0) candidates[side].push({ x, y, sign, confidence: gesture?.score ?? 0 });
  }
  return candidates.map(list => list.length === 1 ? list[0] : { sign: 'UNKNOWN', confidence: 0, ambiguous: list.length > 1 });
}
