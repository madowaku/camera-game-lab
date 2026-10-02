# EXP-005 PINCH WORLD — implementation record

2026-10-03 (JST). Implemented after EXP-004 on the local Platform v0.1 tree.

- Canonical route: `#/game/solo-pinch-world`; alias: `#pinch-world`.
- Independent view/controller, pure `PinchWorldGame`, shared normalized `PinchState` and `PinchInput`.
- Reuses BodyInput's hand model and cancellable camera lifecycle. HAND BEAT's existing thresholds and implementation are unchanged.
- Aspect-correct pinch ratio, mirrored midpoint and both fingertips, 0.30 / 0.42 hysteresis, two stable frames, fresh start/move/end edges. A hand first seen with closed fingers must open before it can generate a grab edge.
- Three sequential tasks: circular PICK → square CARRY through a generous gap → smaller triangular PLACE. Shape and inset pattern identify matching sockets without relying on color.
- Light exponential carry smoothing; swept collision prevents tunneling across the wall even on large movements. Fingers can cross; the object stops/slides. Returning to a legal location resumes following.
- No throw velocity. Missing tracking freezes the object and active timer; 300ms grace preserves a short hold, then releases gently without granting socket success. Recovery requires a fresh open/pinch before regrabbing.
- Mirrored selfie background with the same cover crop as the normalized geometry; two visible fingertip jaws. Touch drag, mouse drag, or arrow keys + Space as a clearly labeled demo.
- JA/EN, original procedural sounds and inline SVG, debug geometry, counter/time receipt, result/retry/next/share. Completion takes three placements; 20–30 seconds is a playtime target, not a forced time limit.
- All tracks, models, AudioContext/oscillators, rAF, timers and window/document interaction listeners are released on result/exit. Switching between the new games retains one active input session only.
- Generic platform correction: when camera denial recovers into demo within a controller, RETRY now preserves the controller's actual source.

## Verification

- `npm test`: 138 passing (107 baseline + 14 eye/horror + 16 pinch + 1 localized result adapter); zero skips or removed tests.
- `npm run build`: success; both game chunks remain lazy, along with the shared face/hand/MediaPipe chunks.
- `scripts/qa/expansion-pinch.js`: 49 checks across 360×800, 720×1280 and 1440×900. The 360px run uses CDP touch events; the others use mouse, and all verify keyboard controls. Feed → INFO → PLAY → demo → 3 tasks → RESULT → SHARE → JA → RETRY → 3 tasks → NEXT. Barrier and failed-grab evidence are retained.
- `scripts/qa/expansion-pinch-camera.js`: 21 synthetic checks. Raw hand landmarks, mirror/crop alignment, fresh edges, brief/long tracking loss, wall/gap, all three tasks, exact source, real media/audio teardown, cross-game switch, late permission cancellation and camera-denial/demo retry.
- Screenshots and CLI output: `output/playwright/expansion-pinch-*.png`, `pinch-*-qa.txt` (ignored local artifacts).

## Remaining physical checks

Actual fingertip alignment, jitter, 9/10 deliberate pinch/release pairs, five real runs, touch ergonomics on physical phones, HTTPS permissions on iOS/Android, fatigue and the feeling of direct manipulation are not certified by synthetic or browser checks. CRANE TACTICS remains gated on further specification and physical PINCH WORLD research.
