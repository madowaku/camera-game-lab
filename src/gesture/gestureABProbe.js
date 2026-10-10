// P1 shadow A/B observer. A remains authoritative in playable games.
// No camera/model/DOM ownership and no stored images or landmark logs.
import { GripState } from '../input/gripState.js';
import { PinchState } from '../input/pinchState.js';
import { createGestureEngine } from './gestureEngine.js';
import { observationsFromMediaPipe } from './observation.js';
import { GESTURE_P1_PRESETS, gripPinchSignals } from './gripPinchAdapters.js';

const clone = p => p ? { x: p.x, y: p.y } : null;

export class GestureABProbe {
  constructor({ maxHands = 1 } = {}) {
    this.maxHands = maxHands;
    this.reset();
  }
  reset() {
    this.gripA = new GripState();
    this.pinchA = new PinchState();
    this.engine = createGestureEngine({
      maxHands: this.maxHands,
      gestures: GESTURE_P1_PRESETS,
      signalReader: gripPinchSignals,
    });
    this.sampleCount = 0;
    this.disagreements = { GRIP: 0, PINCH: 0 };
    this.lastAtMs = null;
    this.lastA = null;
    this.lastBEvents = [];
    this.latest = null;
    return this.getSnapshot();
  }
  update(result, atMs, videoAspect = 1) {
    if (!Number.isFinite(atMs) || (this.lastAtMs !== null && atMs <= this.lastAtMs)) {
      return this.getSnapshot();
    }
    if (!Number.isFinite(videoAspect) || videoAspect <= 0) return this.getSnapshot();
    // Independent legacy observers; NEVER feed these events into a game action.
    const aGrip = this.gripA.update(result, atMs);
    const aPinch = this.pinchA.update(result, atMs, videoAspect);
    const observations = observationsFromMediaPipe(result, atMs, { videoAspect });
    this.engine.update(observations, atMs, { videoAspect });
    this.lastBEvents = this.engine.drainEvents();
    this.lastA = {
      GRIP: {
        present: !!aGrip.present,
        active: !!aGrip.grabbing,
        armed: !!this.gripA.armed,
        events: aGrip.events.filter(e => e !== 'GRIP_MOVE'),
        position: clone(aGrip.gripPosition),
        classifier: aGrip.gesture,
      },
      PINCH: {
        present: !!aPinch.present,
        active: !!aPinch.pinching,
        armed: !!this.pinchA.armed,
        events: aPinch.events.filter(e => e !== 'PINCH_MOVE'),
        position: clone(aPinch.pinchPosition),
        ratio: aPinch.pinchRatio ?? null,
      },
    };
    this.lastAtMs = atMs;
    this.sampleCount++;
    const b = this.engine.getSnapshot().tracks.find(t => t.status === 'TRACKING' && t.fresh);
    for (const name of ['GRIP', 'PINCH']) {
      // This is disagreement between implementations, NOT a false-positive rate.
      if (this.lastA[name].active !== !!b?.gestures[name]?.active)
        this.disagreements[name]++;
    }
    return this.getSnapshot();
  }
  advance(atMs) {
    // The legacy detector has no clock-only call. Do not invent legacy events.
    this.engine.advance(atMs);
    this.lastBEvents = this.engine.drainEvents();
    return this.getSnapshot();
  }
  getSnapshot() {
    const now = this.engine.getSnapshot();
    const track = now.tracks.find(t => t.trackId === 'hand-1') ?? now.tracks[0];
    const ageMs = this.lastAtMs === null || now.atMs === null ? null : Math.max(0, now.atMs - this.lastAtMs);
    const legacyFresh = ageMs !== null && ageMs <= 300;
    return {
      atMs: now.atMs, sampleCount: this.sampleCount, lastInferenceAtMs: this.lastAtMs,
      ageMs, disagreements: { ...this.disagreements },
      A: this.lastA ? Object.fromEntries(Object.entries(this.lastA).map(([name, value]) => [name, {
        ...value, events: [...value.events], position: legacyFresh ? clone(value.position) : null,
        fresh: legacyFresh && value.present, active: legacyFresh && value.present && value.active,
      }])) : null,
      B: {
        trackId: track?.trackId ?? null, status: track?.status ?? 'NONE',
        fresh: !!track?.fresh,
        gestures: Object.fromEntries(['GRIP', 'PINCH'].map(name => [name, {
          active: !!track?.fresh && !!track?.gestures[name]?.active,
          armed: !!track?.fresh && !!track?.gestures[name]?.armed,
          phase: track?.gestures[name]?.phase ?? 'UNARMED',
          metric: track?.fresh ? (track?.gestures[name]?.metric ?? null) : null,
        }])),
        events: this.lastBEvents.map(e => ({ ...e })),
      },
    };
  }
  dispose() {
    this.engine.dispose();
    this.lastA = null;
    this.lastBEvents = [];
    this.latest = null;
  }
}
export function createGestureABProbe(options) { return new GestureABProbe(options); }
