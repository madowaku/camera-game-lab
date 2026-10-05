# EXP-057 SONIC INK v0.1

Implemented 2026-10-06 from the supplied [detailed design](EXP_057_SONIC_INK_DETAIL_DESIGN.md).
This replaces AIR ATELIER. Open `#/game/solo-sonic-ink` or `#sonic-ink`.
Legacy game/feed links and `#air-atelier` still resolve to SONIC INK.

## Experience

FREE DRAW only, 15 seconds from the first stable pinch or pointer stroke, at most
three strokes. Release previews the newest line. Finishing the third line or
reaching the time limit plays the sculpture in drawing order. No score screen.
Closed lines show LOOP!, briefly brighten, and repeat. Review retains the live
front camera for posing while stopping hand inference. Replay, a small rotation
control, a new round, and artwork-only PNG export are available.

The pastel paper frame and rose/lavender/mint light preserve the earlier cute
direction. Controls and status are in Japanese and English. The 9:16 stage has a
small timer, stroke dots and note readout; undo, clear and pause sit outside it.

The title screen uses generated pastel glass-heart key art, with a real HTML
title, PLAY/practice/how-to buttons and JA/EN copy. The same art appears in the
feed and experiment index. See the [ImageGen prompt and asset notes](SONIC_INK_TITLE_ART.md).

## Sound and input

- Y quantizes to C4, D4, E4, G4, A4, C5, D5, E5, G5, A5, with pitch hysteresis.
- X maps to stereo pan. Relative apparent palm size gives softly clamped depth,
  changing the 3D position and low-pass cutoff, without affecting loop rules.
- Speed changes attack, volume, brightness, tube thickness and particle density.
  Sharp corners add a short upper partial (SPARK NOTE), with a 220 ms cooldown.
- GLASS MARIMBA uses three sine partials, a short envelope, compressor and gentle
  delay. Audio is armed by a player gesture. There is no separate BGM or microphone.
- The replay head and note scheduler share cumulative distance, independent of
  original recording duration. Completed lines use a centripetal spline.
- HandLandmarker tracks one hand at up to 25 Hz. Index/thumb pinch has three-frame
  stability, enter/exit hysteresis and a four-sample position average.
- Loss under 250 ms holds the line and reconnects. A 250–500 ms reacquisition ends
  the old line and requires an open hand. Loss of 500 ms ends ink and pauses time;
  a stable open hand resumes. Large coordinate jumps also require fresh input.
- Mouse/touch drag has the same core; a depth slider substitutes for hand depth.
  Focus loss and explicit pause freeze time/replay and silence voices and delay.

## Rendering and lifecycle

`src/sonicInk/core.js` owns stroke/note data and timing. `tracking.js` owns pinch
and recovery. `audio.js` owns Web Audio. `scene.js` is the Three scene adapter;
`view.js` owns DOM and lifecycle. The existing `createThreeVisualLayer` supplies
resize, projection, reduced-motion preference, capped pixel ratio, performance
degradation, context-loss detection and disposal. `visual3d/objects/glowStroke.js`
adds a reusable colored tube/spline/glow primitive; existing burst/trail primitives
are shared. No Phaser dependency is used by SONIC INK.

Memory is bounded to 3 × 640 points, at most 192 spline segments per stroke,
36 trail points and 10 simultaneous sound voices. Low quality uses 80 segments
and omits the glow shell. Geometry rebuilds are throttled while drawing. Context
creation failure/loss selects a Canvas fallback sharing the musical core.
Leaving closes camera tracks, the hand model, animation frames, audio context,
Three resources and active visibility listeners. Cached controllers are dormant.
Nothing is recorded or sent; explicit PNG saves contain only artwork.

## Verification

`npm test`, `npm run build`, and `scripts/qa/sonic-ink.js` (Playwright CLI).
Final results: all 508 unit tests pass, production/PWA build succeeds, and all
35 browser checks pass with no uncaught page errors. The build retains the
project's existing large-chunk advisory. Expected model-request aborts are
introduced deliberately in the failure-recovery check.
Browser screenshots are under `output/playwright/sonic-ink-*`.
Desktop 1440px and mobile 390/360px: drawing, closed-loop playback, actual analyser
output, mute/pause silence, undo/clear, three-line review, rotation, PNG, English,
timeout, input recovery, exit cleanup, legacy routes, WebGL context-loss fallback
and model-download failure recovery. Camera integration uses a synthetic portrait
stream and landmarks, not a real-device hand-recognition accuracy claim.

## Next stage and human gate

TRACE, SOUND PUZZLE and the seven-second CREATOR video are outside the specified
initial v0.1 scope. Real phone front-camera accuracy, depth stability, speakers
and headphones, end-to-end latency/FPS, and the design's “want to draw three lines
in a row” human playtest remain to be tried with a person.
