// Starting points for A401OP comparison, not measured claims of better feel.
// Each preset selects one temporal primitive; games compose only what they need.
export const FEEL_PRESETS = Object.freeze({
  direct: Object.freeze({ tau: 0 }),
  steering: Object.freeze({ tau: .07, deadZone: .2, exponent: .85 }),
  softFollow: Object.freeze({ frequency: 7, damping: 1, maxVelocity: Infinity }),
  sport: Object.freeze({ tau: .012, maxOffset: .08 }),
  inertial: Object.freeze({ friction: 5, maxVelocity: Infinity, stopThreshold: .001 }),
});
