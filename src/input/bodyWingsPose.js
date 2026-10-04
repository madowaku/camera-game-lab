export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const visible = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && (p.visibility ?? 1) >= .5;
const mirror = p => visible(p) ? { x: 1 - p.x, y: p.y } : null;

// Work in mirrored screen space. Correct Y/X for the actual video aspect,
// so a landscape webcam and a portrait phone have the same turn strength.
export function extractWingsPose(landmarks, aspect = 1) {
  if (!landmarks || !Number.isFinite(aspect) || aspect <= 0) return null;
  const shoulders = [mirror(landmarks[11]), mirror(landmarks[12])];
  if (shoulders.some(p => !p)) return null;
  const [left, right] = shoulders.sort((a, b) => a.x - b.x);
  const width = right.x - left.x;
  if (width < .055) return null;
  const wrists = [mirror(landmarks[15]), mirror(landmarks[16])].filter(Boolean).sort((a, b) => a.x - b.x);
  const spread = wrists.length === 2 && wrists[0].x < left.x - width * .32 && wrists[1].x > right.x + width * .32;
  const nose = mirror(landmarks[0]), ears = [mirror(landmarks[7]), mirror(landmarks[8])];
  const face = nose && ears.every(Boolean) ? {
    x: nose.x, y: nose.y, width: Math.max(Math.abs(ears[0].x - ears[1].x), width * .5),
  } : null;
  return { left, right, wrists, nose, face, width, spread,
    center: { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 },
    tilt: clamp((right.y - left.y) / (width * aspect), -.65, .65) };
}

export function turnStrength(tilt) {
  if (!Number.isFinite(tilt) || Math.abs(tilt) < .04) return 0;
  return Math.sign(tilt) * clamp((Math.abs(tilt) - .04) / .24);
}

export function lossInput(tilt, missingMs) {
  if (missingMs <= 300) return tilt;
  return tilt * clamp(1 - (missingMs - 300) / 500);
}
