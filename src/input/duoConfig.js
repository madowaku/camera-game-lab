// Camera thresholds live here so device playtests can tune one shared contract.
export const DUO_CONFIG = Object.freeze({
  inferenceIntervalMs: 50,
  maxFrameGapMs: 350,
  playerLostGraceMs: 800,
  recoveryTimeoutMs: 5000,
  calibrationMs: 900,
  calibrationSamples: 10,
  stablePosition: 0.025,
  stableScaleRatio: 0.12,
  stableTilt: 0.09,
  maxMatchDistance: 0.24,
  ambiguousMatchMargin: 0.035,
  maxScaleRatio: 2.2,
  faceRange: 0.45,
  tiltRange: 0.45,
  closedMouthMax: 0.16,
  mouthOpenDelta: 0.18,
  mouthCloseDelta: 0.09,
  mouthHoldMs: 80,
  eyesClosedRatio: 0.12
});

export const clamp = (value, min = -1, max = 1) => Math.max(min, Math.min(max, value));
