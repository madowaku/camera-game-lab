const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

class LowPass {
  constructor() {
    this.value = null;
  }

  push(next, alpha) {
    const a = clamp(alpha, 0, 1);
    this.value = this.value === null ? next : this.value + (next - this.value) * a;
    return this.value;
  }

  reset() {
    this.value = null;
  }
}

/**
 * Adaptive low-pass filter for camera landmarks.
 *
 * Slow movement gets stronger smoothing; fast movement raises the cutoff so
 * controls stay responsive. Timestamps are milliseconds, matching
 * performance.now() and MediaPipe's VIDEO APIs.
 */
export class OneEuroFilter {
  constructor({ minCutoff = 1.5, beta = 0.015, dCutoff = 1 } = {}) {
    this.minCutoff = Math.max(0.01, minCutoff);
    this.beta = Math.max(0, beta);
    this.dCutoff = Math.max(0.01, dCutoff);
    this.signal = new LowPass();
    this.derivative = new LowPass();
    this.lastAt = null;
  }

  alpha(dt, cutoff) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value, at) {
    if (!Number.isFinite(value) || !Number.isFinite(at)) {
      return this.signal.value ?? value;
    }

    if (this.lastAt === null) {
      this.lastAt = at;
      return this.signal.push(value, 1);
    }

    const dt = (at - this.lastAt) / 1000;
    if (dt <= 0 || dt > 1) {
      this.reset();
      this.lastAt = at;
      return this.signal.push(value, 1);
    }
    this.lastAt = at;

    const previous = this.signal.value ?? value;
    const velocity = (value - previous) / dt;
    const smoothVelocity = this.derivative.push(
      velocity,
      this.alpha(dt, this.dCutoff)
    );
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothVelocity);

    return this.signal.push(value, this.alpha(dt, cutoff));
  }

  reset() {
    this.signal.reset();
    this.derivative.reset();
    this.lastAt = null;
  }
}

export class OneEuroFilter2D {
  constructor(options = {}) {
    this.x = new OneEuroFilter(options);
    this.y = new OneEuroFilter(options);
  }

  filter(x, y, at) {
    return {
      x: this.x.filter(x, at),
      y: this.y.filter(y, at)
    };
  }

  reset() {
    this.x.reset();
    this.y.reset();
  }
}


/**
 * Keeps independent adaptive filters for multiple tracked points.
 * Missing points reset their slot so reacquisition never eases in from stale
 * coordinates. Raw points remain available to game rules; this is for display
 * or other continuous presentation paths.
 */
export class OneEuroPointBank {
  constructor(options = {}) {
    this.options = options;
    this.filters = new Map();
  }

  filter(points, at, keyOf = point => point?.id ?? point?.slot) {
    const seen = new Set();
    const output = points.map(point => {
      const key = keyOf(point);
      if (key == null || !point?.present || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        if (key != null) this.filters.get(key)?.reset();
        return { ...point };
      }
      seen.add(key);
      let filter = this.filters.get(key);
      if (!filter) {
        filter = new OneEuroFilter2D(this.options);
        this.filters.set(key, filter);
      }
      return { ...point, ...filter.filter(point.x, point.y, at) };
    });
    for (const [key, filter] of this.filters) {
      if (!seen.has(key)) filter.reset();
    }
    return output;
  }

  reset() {
    for (const filter of this.filters.values()) filter.reset();
    this.filters.clear();
  }
}
