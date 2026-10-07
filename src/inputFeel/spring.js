function springOptions({ frequency = 12, damping = 1, maxVelocity = Infinity } = {}) {
  if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError('frequency must be positive (Hz)');
  if (!Number.isFinite(damping) || damping < 0) throw new RangeError('damping must be nonnegative');
  if (!(maxVelocity >= 0) || (maxVelocity !== Infinity && !Number.isFinite(maxVelocity))) throw new RangeError('maxVelocity must be nonnegative');
  return { omega: 2 * Math.PI * frequency, damping, maxVelocity };
}

// Exact damped oscillator transition for a held target. No Euler substeps or
// dt clamp: even a ten-second stall is stable at every damping ratio.
function coefficients(omega, damping, dt, out) {
  if (Math.abs(damping - 1) < 1e-6) {
    const e = Math.exp(-omega * dt), t = dt * e;
    out.a = e + omega * t; out.b = t; out.c = -omega * omega * t; out.d = e - omega * t;
    return out;
  }
  if (damping < 1) {
    const a = damping * omega, b = omega * Math.sqrt(1 - damping * damping);
    const e = Math.exp(-a * dt), s = e * Math.sin(b * dt) / b, c = e * Math.cos(b * dt);
    out.a = c + a * s; out.b = s; out.c = -omega * omega * s; out.d = c - a * s;
    return out;
  }
  const root = Math.sqrt(damping * damping - 1);
  const slow = -omega / (damping + root), fast = -omega * (damping + root);
  const a = Math.exp(slow * dt), b = Math.exp(fast * dt), gap = slow - fast;
  out.a = (-fast * a + slow * b) / gap; out.b = (a - b) / gap;
  out.c = -omega * omega * out.b; out.d = (slow * a - fast * b) / gap;
  return out;
}

const validStep = (target, dt) => Number.isFinite(target) && Number.isFinite(dt) && dt > 0;
const finite = value => Number.isFinite(value) ? value : 0;
const limit = (value, max) => Math.max(-max, Math.min(max, value));
const AXES = ['x', 'y'];

export function createSpring1D(options = {}) {
  const { omega, damping, maxVelocity } = springOptions(options);
  const initial = finite(options.value), state = { value: initial, velocity: 0 };
  const transition = {};
  return {
    state,
    update(target, dt) {
      if (!validStep(target, dt)) return state;
      const { a, b, c, d } = coefficients(omega, damping, dt, transition), offset = state.value - target;
      const next = target + a * offset + b * state.velocity;
      state.velocity = limit(c * offset + d * state.velocity, maxVelocity);
      state.value += limit(next - state.value, maxVelocity * dt);
      return state;
    },
    reset(value = initial, velocity = 0) {
      state.value = finite(value); state.velocity = limit(finite(velocity), maxVelocity); return state;
    },
  };
}

export function createSpring2D(options = {}) {
  const { omega, damping, maxVelocity } = springOptions(options);
  const initial = { x: finite(options.value?.x), y: finite(options.value?.y) };
  const state = { value: { ...initial }, velocity: { x: 0, y: 0 } };
  function cap(vector, maximum) {
    const speed = Math.hypot(vector.x, vector.y);
    if (speed > maximum) { vector.x *= maximum / speed; vector.y *= maximum / speed; }
  }
  const delta = { x: 0, y: 0 };
  const transition = {};
  return {
    state,
    update(target, dt) {
      if (!validStep(target?.x, dt) || !Number.isFinite(target?.y)) return state;
      const { a, b, c, d } = coefficients(omega, damping, dt, transition);
      for (const axis of AXES) {
        const offset = state.value[axis] - target[axis], velocity = state.velocity[axis];
        delta[axis] = target[axis] + a * offset + b * velocity - state.value[axis];
        state.velocity[axis] = c * offset + d * velocity;
      }
      cap(state.velocity, maxVelocity); cap(delta, maxVelocity * dt);
      state.value.x += delta.x; state.value.y += delta.y;
      return state;
    },
    reset(value = initial, velocity = { x: 0, y: 0 }) {
      state.value.x = finite(value?.x); state.value.y = finite(value?.y);
      state.velocity.x = finite(velocity?.x); state.velocity.y = finite(velocity?.y);
      cap(state.velocity, maxVelocity); return state;
    },
  };
}
