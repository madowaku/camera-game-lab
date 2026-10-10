import { GestureState } from './gestureState.js';
import { TrackResolver } from './trackResolver.js';
import { normalizeHandObservation } from './observation.js';

const finite = Number.isFinite;
const DEFAULTS = Object.freeze({ maxHands: 1, maxFreshGapMs: 150, lossMs: 300, gestures: {} });
const STATUS = Object.freeze({ TRACKING: 'TRACKING', GRACE: 'GRACE', LOST: 'LOST', AMBIGUOUS: 'AMBIGUOUS' });

// A pure, opt-in analysis engine. Signal readers receive immutable-by-convention observations.
// They return { GRIP: { signal: 'active'|'neutral'|'unknown', metric: 0..1 } }.
export class GestureEngine {
  constructor(options = {}) {
    this.config = { ...DEFAULTS, ...options };
    const { maxHands, maxFreshGapMs, lossMs, gestures } = this.config;
    if (!finite(maxFreshGapMs) || maxFreshGapMs <= 0 || !finite(lossMs) || lossMs <= maxFreshGapMs)
      throw new RangeError('lossMs must exceed positive maxFreshGapMs');
    if (!gestures || typeof gestures !== 'object' || Array.isArray(gestures))
      throw new TypeError('gestures must be an object of named state-machine configurations');
    this.gestureNames = Object.keys(gestures);
    this.signalReader = options.signalReader ?? (() => ({}));
    if (typeof this.signalReader !== 'function') throw new TypeError('signalReader must be a function');
    this.resolver = new TrackResolver({ maxHands, lostMs: lossMs, maxDistance: options.maxMatchDistance,
      ambiguityMargin: options.ambiguityMargin });
    this.reset();
  }
  reset() {
    this.resolver.reset();
    this.states = new Map();
    this.lastClockAt = null;
    this.lastInferenceAt = null;
    this.events = [];
    this.disposed = false;
    this.metrics = { inferenceCount: 0, rejectedFrames: 0, rejectedHands: 0,
      lossCount: 0, ambiguousCount: 0, gapMaxMs: 0 };
    return this.getSnapshot();
  }
  dispose() {
    this.states.clear();
    this.resolver.reset();
    this.events = [];
    this.disposed = true;
  }
  ensureState(id) {
    if (!this.states.has(id)) {
      this.states.set(id, {
        id, status: STATUS.GRACE, lastSeenAt: null, observation: null,
        gestures: new Map(this.gestureNames.map(name =>
          [name, new GestureState(this.config.gestures[name])]))
      });
    }
    return this.states.get(id);
  }
  validClock(atMs) {
    if (this.disposed || !finite(atMs) ||
      (this.lastClockAt !== null && atMs < this.lastClockAt)) return false;
    return true;
  }
  emit(type, id, atMs, extra = {}) {
    this.events.push({ type, trackId: id, atMs, ...extra });
  }
  update(rawObservations, atMs, options = {}) {
    if (!this.validClock(atMs) || (this.lastInferenceAt !== null && atMs <= this.lastInferenceAt)) {
      if (!this.disposed) this.metrics.rejectedFrames++;
      this.events = [];
      return this.getSnapshot();
    }
    this.events = [];
    this.lastClockAt = atMs;
    if (this.lastInferenceAt !== null) {
      const gap = atMs - this.lastInferenceAt;
      this.metrics.gapMaxMs = Math.max(this.metrics.gapMaxMs, gap);
      if (gap > this.config.maxFreshGapMs) this.markStale(atMs);
    }
    this.lastInferenceAt = atMs;
    this.metrics.inferenceCount++;
    const sources = Array.isArray(rawObservations) ? rawObservations : [];
    const observations = sources.map(raw => normalizeHandObservation(raw, atMs, {
      videoAspect: options.videoAspect ?? raw?.videoAspect ?? 1,
    })).filter(Boolean);
    this.metrics.rejectedHands += sources.length - observations.length;
    const { matches, ambiguousIds, trackIds } = this.resolver.resolve(observations, atMs);
    for (const id of trackIds) this.ensureState(id);
    for (const [id, state] of this.states) {
      if (ambiguousIds.has(id)) {
        if (state.status !== STATUS.AMBIGUOUS) this.metrics.ambiguousCount++;
        this.interrupt(state, atMs, STATUS.AMBIGUOUS);
        continue;
      }
      const obs = matches.get(id);
      if (!obs) {
        this.markMissing(state, atMs, true);
        continue;
      }
      // On reacquisition, make old candidates invalid and require neutral rearm.
      // The current frame never triggers a START or END edge.
      const hadContinuity = state.status === STATUS.TRACKING &&
        state.lastSeenAt !== null && atMs - state.lastSeenAt <= this.config.maxFreshGapMs;
      if (state.status !== STATUS.TRACKING || !hadContinuity) {
        for (const gesture of state.gestures.values()) gesture.interrupt();
      }
      const wasLost = state.status === STATUS.LOST;
      state.status = STATUS.TRACKING;
      state.lastSeenAt = atMs;
      state.observation = obs;
      if (wasLost) this.emit('TRACK_RETURNED', id, atMs);
      const signals = this.signalReader(obs, id) ?? {};
      for (const [name, gesture] of state.gestures) {
        const signal = signals[name];
        const edge = gesture.update(signal?.signal ?? 'unknown', atMs, signal?.metric);
        if (edge) this.emit(edge, id, atMs, { gesture: name });
      }
    }
    return this.getSnapshot();
  }
  markMissing(state, atMs, explicitMissing = false) {
    if (state.lastSeenAt === null) return;
    if (!explicitMissing && atMs - state.lastSeenAt <= this.config.maxFreshGapMs) return;
    if (atMs - state.lastSeenAt >= this.config.lossMs) {
      if (state.status !== STATUS.LOST) this.interrupt(state, atMs, STATUS.LOST);
    } else if (state.status !== STATUS.AMBIGUOUS && state.status !== STATUS.LOST) {
      state.status = STATUS.GRACE;
      state.observation = null;
      // Freeze the action and cannot re-emit it while unobserved.
      for (const gesture of state.gestures.values()) gesture.interrupt();
    }
  }
  interrupt(state, atMs, status) {
    const wasLost = state.status === STATUS.LOST;
    const wasAmbiguous = state.status === STATUS.AMBIGUOUS;
    state.status = status;
    state.observation = null;
    for (const gesture of state.gestures.values()) gesture.interrupt();
    if (status === STATUS.LOST && !wasLost) {
      this.metrics.lossCount++;
      this.emit('TRACK_LOST', state.id, atMs);
    }
    if (status === STATUS.AMBIGUOUS && !wasAmbiguous) this.emit('TRACK_AMBIGUOUS', state.id, atMs);
  }
  markStale(atMs) {
    for (const state of this.states.values()) this.markMissing(state, atMs);
  }
  advance(atMs) {
    if (!this.validClock(atMs)) { this.events = []; return this.getSnapshot(); }
    this.events = [];
    this.lastClockAt = atMs;
    this.markStale(atMs);
    return this.getSnapshot();
  }
  getSnapshot() {
    return {
      atMs: this.lastClockAt,
      events: this.events.map(event => ({ ...event })),
      tracks: [...this.states.values()].map(state => ({
        trackId: state.id,
        status: state.status,
        fresh: state.status === STATUS.TRACKING && state.lastSeenAt !== null &&
          (this.lastClockAt - state.lastSeenAt <= this.config.maxFreshGapMs),
        lastSeenAt: state.lastSeenAt,
        palm: state.status === STATUS.TRACKING && state.observation ? { ...state.observation.palm } : null,
        gestures: Object.fromEntries([...state.gestures].map(([name, gesture]) =>
          [name, gesture.snapshot(gesture.lastAtMs)])),
      })),
      metrics: { ...this.metrics },
    };
  }
}

export function createGestureEngine(options) { return new GestureEngine(options); }
