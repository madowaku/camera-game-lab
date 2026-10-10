// Opt-in A/B lab. Existing effects stay untouched unless motionLab=B is explicit.
import { W as PONG_WIDTH, H as PONG_HEIGHT } from '../palmPong/core.js';
export const MOTION_LAB_PRESETS = Object.freeze({
  'solo-maru-magic': 'sigil',
  'solo-hand-spell': 'rune',
  'solo-toy-drum': 'beat',
  'solo-air-slash': 'cut',
  'solo-tilt-turbo': 'speed',
  'voice-note-blaster': 'pulse',
  'duo-palm-pong': 'rebound',
});

// Each motif has its own silhouette; sports and speed use CSS geometry only.
export const MOTION_LAB_GLYPHS = Object.freeze({
  sigil: '✦', rune: '✧', beat: '♫', pulse: '♪',
});

export function motionLabVariant(gameId, search = '') {
  if (!Object.hasOwn(MOTION_LAB_PRESETS, gameId)) return 'A';
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  return params.get('motionLab') === 'B' ? 'B' : 'A';
}

export function motionLabPreset(gameId) {
  return MOTION_LAB_PRESETS[gameId] ?? null;
}

export function motionLabPoint(preset, instance, fallback) {
  const game = instance.game ?? {};
  let point = null;
  if (preset === 'pulse') point = game.effects?.at(-1);
  // The Phaser view no longer exposes the old pixel-space scene.ball/canvas.
  // Use the confirmed contact in the rules core's 16 x 9 world instead.
  if (preset === 'rebound' && game.lastHit) {
    point = { x: game.lastHit.x / PONG_WIDTH, y: game.lastHit.y / PONG_HEIGHT };
  }
  return point && [point.x, point.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)
    ? { x: point.x, y: point.y } : fallback;
}
