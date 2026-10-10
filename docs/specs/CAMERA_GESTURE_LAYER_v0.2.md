# Camera Gesture Layer v0.2 — Design Specification

- Status: DESIGN ONLY (not yet implemented)
- Date: 2026-10-10
- Repo: `madowaku/camera-game-lab`
- Reference: [HandCam-Control](https://github.com/fikriaf/HandCam-Control) (MIT)
- Related: [Camera Input Reliability Matrix v0.1](../CAMERA_INPUT_RELIABILITY_V01.md), [Camera Input Feel v0.1](../CAMERA_INPUT_FEEL_V01.md), [MARU MAGIC](EXP-062_MARU_MAGIC_SPEC_v0.1.md)

## 0. Design decision

**Recognize intent, do not demand perfect gestures.** The goal is first-try controllability, not maximizing gesture vocabulary.

Do not replace current games wholesale. Reuse `BodyInput` lifecycle and MediaPipe, current game-specific Reliability, existing `src/inputFeel/`, and existing truth/visual separation.

Important reality check:

- SOFT SERVE has **no pinch primary action**: `SoftServeInput` supplies hand center and mouth, and `SoftServeGame` uses 450 ms alignment under a nozzle. Keep this mechanic.
- `src/input/pinchState.js` already uses normalized thumb/index distance divided by wrist-to-middle-MCP distance, with hysteresis 0.30/0.42, 2-frame qualification and 300 ms stale window. Keep as a research baseline, not primary input.
- `src/input/gripState.js` already recognizes Open_Palm / Closed_Fist with 80 ms hold and has re-arm logic. Keep gameplay behavior until A/B verified.
- MARU MAGIC uses raw-accepted points for circle scoring and independent `smoothVec2` 28 ms visual smoothing. Do not alter truth/scoring.
- PALM PONG already has owner assignment, rejection, and optional **visual-only** Feel A/B. Avoid second game-logic filter.
- `src/inputFeel/` has smoothing, spring, inertia, snapping and response curves; DO NOT reimplement.

## 1. Scope, explicit non-goals

**In scope v0.2:** an opt-in, DOM-free, MediaPipe-free pure-JS gesture analysis core; canonical hand observations; per-track state machines; edge event API; time-based hold/re-arm; freshness and loss policy; developer debug snapshots; deterministic tests; experimental routes for pinch/grip/swipe; SOFT SERVE and MARU observational A/B hooks.

**Out of scope v0.2:** replacing `BodyInput`, requiring a second MediaPipe model simultaneously, global gesture bindings across all games, adding background capture or video recording, changing existing score/truth paths, ML retraining, two-hand "DUO" production migration, worker migration (evaluate after profiling), automatically publishing experiment B to all users.

## 2. Data flow

```text
Camera -> existing BodyInput + chosen MediaPipe task (1 per input path)
       -> ObservationAdapter (hand landmarks, timestamp, mirror/crop contract)
       -> TrackResolver (stable identity, abstain on ambiguous ownership)
       -> Gesture detectors (position/shape/velocity/hold)
       -> Reliability FSM (hysteresis, debounce, stale/lost/re-arm)
       -> snapshot + edge events
       -> game input / Camera Input Feel v0.1 / diagnostics
```

There must be ONE owner for each type of smoothing. A gesture detector may filter an internal metric, but visual/feel filters must not alter authoritative gameplay coordinates without explicit game-level A/B approval.

## 3. New proposed files

```text
src/gesture/
  index.js
  observation.js       # normalize validity, units and coordinate conventions
  trackResolver.js     # per-track ownership (optional in single-hand)
  gestureEngine.js     # orchestrator + advance clock + reset/dispose
  gestureState.js      # reusable enter/leave/hold/rearm FSM
  detectors/
    pinch.js           # research only, reuse ratios from pinchState
    grip.js            # adapter for existing grip readings
    swipe.js           # vector-based velocity/trajectory
    hold.js            # dwell/stillness without touching game time
    push.js            # experimental, screen-scale proxy only
  presets.js
  diagnostics.js       # HUD snapshots, no camera frame capture
test/gestureLayer.test.js
scripts/qa/gesture-layer.js
```

Integrate adapters into existing `src/input/` classes, not a competing camera lifecycle.

## 4. Canonical contracts (proposed)

All timestamps in **monotonic milliseconds** (`performance.now()` domain); no frame-count-based holds. All positions are explicitly tagged with coordinate space and whether mirroring/cover crop was applied. Do not mirror twice. Preserve out-of-crop rejection rather than clamping an absent hand back into view.

```js
// One recognized hand per observation. Null / absent means no safe input.
{
  trackId: "hand-1",          // stable logical identity, not detector array index
  atMs: 123456,
  present: true,
  landmarks: [...],          // 21 MediaPipe normalized image landmarks
  handedness: "Left" | "Right" | "Unknown",
  category: "Open_Palm" | "Closed_Fist" | null,
  categoryScore: 0.87,       // only if supplied by Gesture Recognizer
  palm: { x: 0.4, y: 0.5 },
  tip: { x: 0.35, y: 0.4 },
  space: "video-normalized-unmirrored",
  videoAspect: 0.5625
}

// Output: full state + edge events, no silent repeated START.
{
  trackId: "hand-1",
  atMs: 123456,
  fresh: true,
  status: "TRACKING" | "GRACE" | "LOST" | "AMBIGUOUS",
  gestures: {
    PINCH: { active: false, armed: true, metric: 0.51, progress: 0 }
  },
  events: [
    { type: "GESTURE_START", gesture: "PINCH", trackId: "hand-1", atMs: 123456 }
  ]
}
```

Engine API: `update(observations, atMs)` on actual inference, `advance(atMs)` on animation frames without inference, `reset(reason)`, `getSnapshot()`, `dispose()`. An inference throttling interval is NOT an inference failure. `advance` only updates freshness/loss and never invents detected edges. De-duplicate repeated timestamps and refuse backwards or nonfinite time.

Interpret classification score as **model output**, not as a calibrated probability of intent. HandLandmarker alone has no classifier score. Do not manufacture "70% pinch" for uncalibrated heuristics.

## 5. State machine and loss

```text
UNARMED -> READY -> CANDIDATE -> ACTIVE -> RELEASE_CANDIDATE -> READY
                 |       |            |
                 +--- cancel ---------+
                                       TRACKING -> GRACE -> LOST -> RECOVERING -> READY (must neutral-rearm)
```

- **UNARMED**: on startup, hand reacquisition, ambiguous ownership, stop/resume, require observed neutral/open before any fresh START (configurable per game).
- **CANDIDATE**: accumulate elapsed inference timestamps while metric remains in enter region; do not interpolate missing evidence; short frame gaps invalidate a sustained hold.
- **ACTIVE**: only one START edge; UPDATE is a snapshot, not an unbounded event stream. END requires a confirmed release where visible.
- **GRACE**: on brief missing detection, no new START/END or gameplay motion; freeze/hide presentation as each game specifies. An action can resume after verified continuity, but must not activate from the grace interval alone.
- **LOST**: mark `fresh:false`, stop emitting action input; emit separate `TRACK_LOST` exactly once. Game chooses cancellation/drop/pause; never synthesize successful release as a deliberate action.
- **RECOVERING**: invalid old velocity/filter samples discarded, ownership revalidated; require neutral pose to rearm discrete actions. If a game explicitly preserves continuous hold on return, that is per-game config and cannot fire a new START.

Defaults are only tuning seeds, NOT verified A401OP results:
- `maxFreshGapMs: 150`, `lossMs: 300`, `reacquireNeutralMs: 80`;
- `PINCH`: existing ratios enter <= 0.30 / leave >= 0.42, initially require >= 2 valid observations, and compare 50-100 ms timed confirmation as **experimental** alternative;
- `GRIP`: keep confidence >= 0.60, hold 80 ms and Open_Palm rearm;
- `SWIPE`: minimum displacement + velocity along dominant axis + release/cooldown; use valid x/y vectors and compute `hypot(vx, vy)` AFTER smoothing, never read a non-existent `magnitude` field;
- `HOLD`: radius in explicitly named coordinate space and duration in ms; progress cannot advance on stale frames;
- `PUSH`: not a production action without real-user validation; bounding-box growth conflates depth with pose.

The HandCam-Control `PinchDetector` uses separate enter/leave thresholds, but does not provide per-hand state separation; its `SwipeDetector` accesses `magnitude` after an XY-only moving average. Adapt concepts, not copy defects.

## 6. Hand identity

For one hand, keep a stable track while movement, scale and handedness are consistent. For two hands, track assignment needs minimum-cost motion/scale matching, independent per-track filters/FSM, and abstention on ambiguous crossover. Never assign authority solely from result array order, nor assume Left/Right labels represent distinct persistent identities. Production DUO migration is deferred; unit-test two-hand identity now. Do not add a second recognizer merely to detect a second hand. Use each game's required `numHands` and profile.

## 7. Game integration / evaluation sequence

1. **Baseline-only instrumentation**: capture current `pinchState`, `gripState`, `SoftServeGame`, and MARU behavior; no game mechanics changes.
2. **SOFT SERVE A/B**: A remains current 450 ms nozzle dwell plus current 65 ms cone tracking. B experiments with small visual/nozzle assist only if intended, without double-smoothing. Start-zone eligibility remains based on raw, unclamped hand coordinate. Never require pinch.
3. **MARU MAGIC A/B**: score stays on accepted raw path; compare visual filter presets only and do not mutate circle completion or records. Existing 28 ms trail is A.
4. **PINCH WORLD research-only**: compare current Fist/Open Palm playable against pinch research behind debug flag. Do not change default without Gates A-E.
5. **AIR SLASH**: compare existing slash input vs velocity + minimum path thresholds; no default replacement without real-device results.
6. **PALM PONG / DUO**: leave Truth path unchanged. Track isolation tests first; human two-player tests later.

Proposed debug flags (URL query, opt-in): `?debug=1&gesture=A` current vs `gesture=B` experimental. Variant B must have a reset path and never share filters/state with A. Recording policy: ephemeral numeric landmark samples only for tests/debug; no automatic uploaded camera frames or video; manual export opt-in.

## 8. Debug HUD

Show `RAW` (observed), `STABLE` (reliability), `FEEL` (visual, only when meaningful), plus `trackId`, hand present/fresh, current gesture, candidate duration, armed status, inference Hz, longest inference gap, dropped/rejected samples and recent edge. Indicate coordinate units per value; do not present stale observations as live. Retain existing HUD where possible instead of adding a second overlay. Make debug optional for resource-constrained phones.

## 9. Performance and compatibility

Current `BodyInput` already has camera ownership, GPU->CPU fallback, cancellation and disposal. Keep these. MediaPipe JavaScript video methods are synchronous; do not infer twice per video frame or run two models solely for gestures. Existing SOFT SERVE dual-model path is deliberately throttled at 20 Hz; MARU is about 25 Hz. Measure on A401OP with the existing pipeline before recommending worker migration.

The core must be deterministic, depend on no DOM/Web APIs except passing time from its caller, work at 20/25/30/60/120 Hz input and tolerate irregular timestamps, without frame-based speed thresholds. If adding a One Euro filter, apply it to one named signal only and tune on real device; do not stack over equivalent existing smoothing.

## 10. Acceptance gates

**Automated (required)**:
- Valid/invalid landmarks, aspect ratios, cover cropping and mirror-once.
- 20/25/30/60/120 Hz plus irregular frame spacing with equivalent time semantics.
- Pinch 0.30/0.42 hysteresis, no chatter, no false trigger on startup.
- Exactly one START, update while active, END only after real release, rearm after LOST.
- Continuous hold does not progress without fresh inference.
- 150/300 ms gaps, backward/non-finite timestamps, pause/stop/dispose/restart.
- Both hands, crossing/collision ambiguity, no identity swap-induced gestures.
- Swipe valid vector magnitude and min-distance thresholds.
- No change to MARU truth scores and SOFT SERVE default transitions.
- No subscription/state/resource leaks; gameplay fallback and touch preserved.
- `npm test` / `npm run build` pass.

**Real A401OP (separate, not claimed by synthetic tests)**:
- A/B 5 runs per variant, alternating order, same light/distance/browser; log false triggers, missed intent, recovery, visible lag, and ability to explain the failure.
- Reliability Gates A-E: >=9/10 deliberate successes; <=1 false event/30 sec; cold start 4/5 new players; reliable recovery; actionable on-screen feedback.
- Acceptance: no gameplay regression; choose B only if human success improves without perceptible latency or unfair scoring. Tiny samples are exploratory, not statistical proof.

## 11. Delivery order and stop rules

- P0: baseline snapshots + pure observation/state engine + tests + debug adapter.
- P1: PINCH and GRIP test adapters; no primary action migration.
- P2: SOFT SERVE visual/assist A/B and MARU visual-only A/B; verify truth parity.
- P3: swipe experiments and two-hand isolation. Defer push and mass migration.
- Stop/rollback if an extra filter causes lag, frame budget grows too much on A401OP, loss generates a spurious input, or a game changes Truth in a visual-only experiment.

## 12. Implementer checklist

Keep all edits localized. Add only the proposed pure module and tests at first. Respect existing API/export semantics of `BodyInput`, `PinchState`, `GripState`, `SoftServeInput`, `SoftServeGame`, MARU scorer, `PalmTracker`, and `inputFeel`. Do not patch HandCam-Control verbatim; extract transferable principles under MIT terms if code is later reused and document attribution. Mark every measured outcome (or not-yet-measured assumption) clearly.
