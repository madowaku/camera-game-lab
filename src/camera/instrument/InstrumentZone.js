const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function createZone(options, id) {
  if (![options.x, options.y].every(Number.isFinite) || typeof options.soundId !== 'string' || !options.soundId) throw new TypeError('A zone needs normalized x/y and a soundId.');
  if (options.triggerMode && !['tap', 'enter'].includes(options.triggerMode)) throw new TypeError('Unknown trigger mode.');
  if (options.radius !== undefined && !Number.isFinite(options.radius)) throw new TypeError('Zone radius must be finite.');
  if (options.cooldownMs !== undefined && !Number.isFinite(options.cooldownMs)) throw new TypeError('Zone cooldown must be finite.');
  return { id, x: clamp(options.x, 0, 1), y: clamp(options.y, 0, 1), radius: clamp(options.radius ?? .09, .04, .2),
    soundId: options.soundId, label: options.label ?? options.soundId, triggerMode: options.triggerMode ?? 'tap',
    cooldownMs: Math.max(60, options.cooldownMs ?? 120), visualStyle: options.visualStyle ?? 'ripple', state: 'IDLE',
    lastHit: -Infinity, armed: true };
}
// Radius is a fraction of the short screen edge: zones remain circles in portrait/landscape.
export function zoneDistance(zone, point, { width = 1, height = 1 } = {}) {
  const short = Math.min(width, height);
  return Math.hypot((point.x - zone.x) * width / short, (point.y - zone.y) * height / short);
}
export function projectCameraPoint(point, videoWidth, videoHeight, width, height, mirror = false) {
  if (!point || ![point.x, point.y, videoWidth, videoHeight, width, height].every(Number.isFinite) || Math.min(videoWidth, videoHeight, width, height) <= 0) return null;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const x = (point.x * videoWidth * scale - (videoWidth * scale - width) / 2) / width;
  return { x: mirror ? 1 - x : x, y: (point.y * videoHeight * scale - (videoHeight * scale - height) / 2) / height };
}
