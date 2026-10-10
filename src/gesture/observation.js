// Camera Gesture Layer P0: pure, unmirrored video-space observations.
// Rendering adapters own mirroring/cover crop exactly once.
const PALM = [0, 5, 9, 13, 17];
const finite = Number.isFinite;
const pointValid = p => p && finite(p.x) && finite(p.y) &&
  p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 &&
  (p.z === undefined || finite(p.z));

function center(points, indices) {
  return {
    x: indices.reduce((s, i) => s + points[i].x, 0) / indices.length,
    y: indices.reduce((s, i) => s + points[i].y, 0) / indices.length,
  };
}

export function normalizeHandObservation(source, atMs, { videoAspect = 1 } = {}) {
  if (!finite(atMs) || !finite(videoAspect) || videoAspect <= 0 ||
      !Array.isArray(source?.landmarks) || source.landmarks.length !== 21 ||
      !source.landmarks.every(pointValid)) return null;
  const landmarks = source.landmarks.map(p => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
  const handedness = ['Left', 'Right'].includes(source.handedness) ? source.handedness : 'Unknown';
  const category = typeof source.category === 'string' ? source.category : null;
  const score = source.categoryScore;
  const categoryScore = finite(score) && score >= 0 && score <= 1 ? score : null;
  const palm = center(landmarks, PALM);
  const span = Math.hypot((landmarks[0].x - landmarks[9].x) * videoAspect,
    landmarks[0].y - landmarks[9].y);
  if (span < 0.005) return null;
  return {
    atMs, landmarks, handedness, category, categoryScore,
    palm, tip: { x: landmarks[8].x, y: landmarks[8].y },
    handScale: span, videoAspect, space: 'video-normalized-unmirrored',
  };
}

// Recognizer's array order is NOT a persistent hand identity.
export function observationsFromMediaPipe(result, atMs, options = {}) {
  if (!Array.isArray(result?.landmarks)) return [];
  return result.landmarks.map((landmarks, index) => {
    const hand = result.handednesses?.[index]?.[0] ?? result.handedness?.[index]?.[0];
    const gesture = result.gestures?.[index]?.[0];
    return normalizeHandObservation({
      landmarks,
      handedness: hand?.categoryName,
      category: gesture?.categoryName ?? null,
      categoryScore: gesture?.score,
    }, atMs, options);
  }).filter(Boolean);
}
