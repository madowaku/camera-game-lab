function settings({ friction = 5, maxVelocity = Infinity, stopThreshold = .001 } = {}) {
  if (!Number.isFinite(friction) || friction < 0) throw new RangeError('friction must be nonnegative (1/s)');
  if (!(maxVelocity >= 0) || (maxVelocity !== Infinity && !Number.isFinite(maxVelocity))) throw new RangeError('maxVelocity must be nonnegative');
  if (!Number.isFinite(stopThreshold) || stopThreshold < 0) throw new RangeError('stopThreshold must be nonnegative');
  return { friction, maxVelocity, stopThreshold };
}
const finite = n => Number.isFinite(n) ? n : 0;

// Integrate both velocity AND displacement analytically, including the exact
// instant stopThreshold is reached, so stopping distance is independent of FPS.
function travel(speed, dt, friction, threshold, out) {
  if (speed <= threshold) { out.distance = 0; out.decay = 0; return out; }
  const untilStop = friction > 0 && threshold > 0 ? Math.log(speed / threshold) / friction : Infinity;
  const time = Math.min(dt, untilStop), decay = Math.exp(-friction * time);
  out.distance = friction === 0 ? time : -Math.expm1(-friction * time) / friction;
  out.decay = dt >= untilStop ? 0 : decay;
  return out;
}

export function createInertia1D(options = {}) {
  const { friction, maxVelocity, stopThreshold } = settings(options);
  const initial = finite(options.position), state = { position: initial, velocity: 0 };
  const step = {};
  const cap = n => Math.max(-maxVelocity, Math.min(maxVelocity, n));
  return {
    state,
    push(impulse) { state.velocity = cap(state.velocity + finite(impulse)); return state; },
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return state;
      const { distance, decay } = travel(Math.abs(state.velocity), dt, friction, stopThreshold, step);
      state.position += state.velocity * distance; state.velocity *= decay; return state;
    },
    reset(position = initial, velocity = 0) { state.position = finite(position); state.velocity = cap(finite(velocity)); return state; },
  };
}

export function createInertia2D(options = {}) {
  const { friction, maxVelocity, stopThreshold } = settings(options);
  const initial = { x: finite(options.position?.x), y: finite(options.position?.y) };
  const state = { position: { ...initial }, velocity: { x: 0, y: 0 } };
  const step = {};
  function cap() {
    const speed = Math.hypot(state.velocity.x, state.velocity.y);
    if (speed > maxVelocity) { state.velocity.x *= maxVelocity / speed; state.velocity.y *= maxVelocity / speed; }
  }
  return {
    state,
    push(impulse) { state.velocity.x += finite(impulse?.x); state.velocity.y += finite(impulse?.y); cap(); return state; },
    update(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return state;
      const { distance, decay } = travel(Math.hypot(state.velocity.x, state.velocity.y), dt, friction, stopThreshold, step);
      state.position.x += state.velocity.x * distance; state.position.y += state.velocity.y * distance;
      state.velocity.x *= decay; state.velocity.y *= decay; return state;
    },
    reset(position = initial, velocity = { x: 0, y: 0 }) {
      state.position.x = finite(position?.x); state.position.y = finite(position?.y);
      state.velocity.x = finite(velocity?.x); state.velocity.y = finite(velocity?.y); cap(); return state;
    },
  };
}
