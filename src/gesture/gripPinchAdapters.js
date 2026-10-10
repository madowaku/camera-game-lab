// P1 adapters: reuse existing thresholds and geometry; do not change gameplay.
import { GRIP_CONFIG } from '../input/gripState.js';
import { PINCH_CONFIG, readPinch } from '../input/pinchState.js';

// A score is a classifier confidence, not a calibrated probability of intent.
export function gripSignal(hand, confidence = GRIP_CONFIG.confidence) {
  const score = hand?.categoryScore;
  const type = hand?.category;
  return {
    signal: Number.isFinite(score) && score >= confidence && type === 'Closed_Fist'
      ? 'active'
      : Number.isFinite(score) && score >= confidence && type === 'Open_Palm'
        ? 'neutral' : 'unknown',
    metric: Number.isFinite(score) ? score : null,
  };
}

export function pinchSignal(hand, config = PINCH_CONFIG) {
  // Existing readPinch already measures aspect-corrected tip gap / wrist-to-MCP span.
  // Feed normalized points, without re-mirroring or applying a cover crop.
  const reading = hand ? readPinch({ landmarks: [hand.landmarks] }, hand.videoAspect) : null;
  if (!reading) return { signal: 'unknown', metric: null };
  const ratio = reading.pinchRatio;
  return {
    signal: ratio <= config.enter ? 'active' : ratio >= config.leave ? 'neutral' : 'unknown',
    metric: ratio,
  };
}

export const GESTURE_P1_PRESETS = Object.freeze({
  // Legacy GripState: 80ms to qualify a stable pose and open-palm rearm.
  GRIP: Object.freeze({ neutralMs: 80, enterMs: 80, leaveMs: 80 }),
  // Research-only: compare time-based ~40ms to legacy two consecutive frames.
  PINCH: Object.freeze({ neutralMs: 0, enterMs: 40, leaveMs: 40 }),
});

export function gripPinchSignals(hand) {
  return { GRIP: gripSignal(hand), PINCH: pinchSignal(hand) };
}
