# Camera Gesture Layer v0.2 — P0 Implementation

Date: 2026-10-10  
Status: **P0 code + pure-JS unit tests implemented on branch** `feat/camera-gesture-layer-p0`; no existing game is switched over.  
Design: [CAMERA_GESTURE_LAYER_v0.2.md](specs/CAMERA_GESTURE_LAYER_v0.2.md)

## Added

- `src/gesture/observation.js`: input validation, immutable-by-copy 21-point canonical video-normalized **unmirrored** observations; MediaPipe Gesture Recognizer / HandLandmarker adapter. No cover crop or mirror applied inside the core.
- `src/gesture/trackResolver.js`: at most two logical hand tracks, motion/scale assignment, ambiguity abstention. Identity is NOT tied to MediaPipe array index. Two-hand production gameplay is deferred.
- `src/gesture/gestureState.js`: neutral rearm, timed candidate and release hold, exactly-once START/END edges, unknown signal does not fabricate release.
- `src/gesture/gestureEngine.js`: `update()` for inference, `advance()` for render-clock freshness, `getSnapshot()`, `drainEvents()` one-shot delivery, `reset()`, `dispose()`. A brief absence emits `TRACK_GRACE`; long absence emits `TRACK_LOST` once; an actual return emits `TRACK_RETURNED`. Ownership ambiguity emits `TRACK_AMBIGUOUS`.
- `src/gesture/diagnostics.js`: plain-data diagnostic snapshot, with stale hand coordinates hidden. It does not access a camera, network, or DOM.
- `test/gestureLayer.test.js`: 16 focused tests covering validation, timestamps, 20/25/30/60/120 Hz, one-shot edges, loss/rearm and 2-hand identity.
- `.github/workflows/gesture-layer-p0.yml`: `npm ci`, `npm test`, `npm run build` on relevant PRs/feature-branch pushes.

## Proposed usage (not yet wired into playable games)

```js
import { createGestureEngine, observationsFromMediaPipe } from '../src/gesture/index.js';

const engine = createGestureEngine({
  maxHands: 1,
  gestures: { GRIP: { neutralMs: 80, enterMs: 60, leaveMs: 80 } },
  signalReader: hand => ({
    GRIP: {
      signal: hand.category === 'Closed_Fist' ? 'active'
        : hand.category === 'Open_Palm' ? 'neutral' : 'unknown',
      metric: hand.categoryScore
    }
  })
});

// Call only for NEW MediaPipe inference output, with monotonic milliseconds:
const observations = observationsFromMediaPipe(result, atMs, {
  videoAspect: video.videoWidth / video.videoHeight
});
engine.update(observations, atMs);

// Called from the render loop; it never advances gesture qualification:
// engine.advance(renderAtMs);

// Consume the pending events once, even if a render update intervened:
for (const event of engine.drainEvents()) {
  if (event.type === 'TRACK_GRACE' || event.type === 'TRACK_LOST' ||
      event.type === 'TRACK_AMBIGUOUS') {
    // Game decides how to pause, freeze, or release safely.
  }
  if (event.type === 'GESTURE_START') {
    // Opt-in game action.
  }
}
const diagnostics = engine.getSnapshot();
```

Never apply the video-mirror or cover-crop transform twice. Each game owns conversion into its own screen/court coordinate space. Do not use `getSnapshot().events` for repeated game event dispatch; use `drainEvents()` to consume each event exactly once. `getSnapshot().events` describes only the latest invocation for diagnostics.

P0 intentionally accepts a `signalReader` rather than introducing duplicate posture detectors. Existing `GripState`/`PinchState`, SOFT SERVE, MARU MAGIC, PALM PONG, `BodyInput`, and `inputFeel` are left unchanged. Converting them to P1 adapters requires controlled A/B and real-device acceptance gates.

## Validation

- On an isolated Node 22 ESM copy of the new sources: `node --test test/gestureLayer.test.js`: **16 passed, 0 failed**.
- `npm test` for the whole repository and `npm run build`: **not executed locally** because the entire repository and its dependencies are not mounted into this execution environment. GitHub Actions workflow is added for those checks; inspect its result on the PR.
- Android A401OP camera, touch/gesture usability, and two-player real-camera tests: **not performed**.
- No gameplay behavior or scores were modified by P0.

## P1 gate

Before adopting a gesture in a playable game, measure the existing input (A), then the proposed shared adapter (B), with alternating trials on A401OP. Record success, false triggers, lost-state recovery, and perceived lag. Synthetic tests do not establish first-time-player success or physical input reliability. Keep PINCH research-only; SOFT SERVE retains its no-pinch, 450 ms nozzle-dwell mechanic.
