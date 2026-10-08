// Opt-in A/B lab. Existing effects stay untouched unless motionLab=B is explicit.
export const MOTION_LAB_PRESETS = Object.freeze({
  'solo-maru-magic': 'sigil',
  'solo-hand-spell': 'rune',
  'solo-toy-drum': 'beat',
});

export function motionLabVariant(gameId, search = '') {
  if (!Object.hasOwn(MOTION_LAB_PRESETS, gameId)) return 'A';
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  return params.get('motionLab') === 'B' ? 'B' : 'A';
}

export function motionLabPreset(gameId) {
  return MOTION_LAB_PRESETS[gameId] ?? null;
}
