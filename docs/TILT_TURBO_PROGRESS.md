# EXP-053 TILT TURBO — implementation and verification

Implemented 2026-10-04 in the existing Camera Game Lab. Routes:
`#/game/solo-tilt-turbo` and `#tilt-turbo`. The ten MVP tasks are complete.
Existing staged/uncommitted work and concurrent games were preserved.

## Delivered

- One front-camera FaceLandmarker; pixel-aspect-correct eye-line roll with
  mirrored direction. GPU with CPU fallback, neutral calibration, dead zone,
  saturation, smoothing, and graph warm-up before interactive calibration.
- Live tutorial/short countdown, responsive lateral toy car, automatic speed,
  deterministic 20-second scrolling course, walls/cones, rebound and temporary
  slowdown. Near misses/drift award bonuses. The final sequence includes fast
  turns, jump with visual slowdown and a spinning/confetti finish.
- Face loss and stale inference never pause the race; gentle centering,
  FACE HERE, episode counts and immediate calibrated recovery. Manual pause
  and background pause; startup error/practice recovery and runtime reconnect.
- Keyboard A/D/arrows and held screen halves/buttons, with practice provenance.
  JA/EN, shared BGM toggle, SE toggle, RETRY/NEXT/SHARE and Feed/Explore entry.
- CREATOR 9:16 player-above-road framing, ORIGINAL/EFFECT/HIDE, local transient
  capture, event candidates and final six seconds plus a one-second end card.
  Silent seven-second browser video export; teardown discards recordings.
- Two built-in Imagegen assets, optimized WebP with real car alpha. Exact
  prompts, originals, hashes, OpenTracks source/author/license and Kenney CC0
  provenance are in `tilt-turbo-assets.json` and `tilt-turbo-image-prompts.txt`.

## Verification

- All seven input/simulation tests pass: portrait/landscape roll direction,
  jitter/saturation, phone-neutral correction, loss/recovery, bonk/finish,
  single near-miss payment, pause and frame-size consistency.
- Affected integration suite: **30/30** tests (tiltTurbo, platform, gameMusic).
- Earlier complete workspace run: **415/415**. During later concurrent work,
  the workspace expanded to **432 tests, 430 pass, 2 fail** in untouched BLINK
  HORROR/eye input: missing `rushWindows` export and changed natural-blink
  timing. TILT TURBO does not import or modify those modules. Those separate
  changes were left intact; the affected 30-test suite still passes.
- `npm run build` passes, including PWA output. Existing large lazy music
  chunks still produce Vite's size advisory.
- Playwright development checks cover 1440×900, 360×800, 390×844, assets, touch
  targets, locale/credits, no entry-time sensors/models, tutorial movement,
  pause, stale input/recovery, touch, exact finish, creator/retry/exit and
  isolated theme. Camera checks use synthetic landmarks with real local
  MediaStream teardown, denial, late permission, CPU fallback and phone roll.
- Actual FaceLandmarker and WASM load/inference pass with a blank frame and
  zero invented faces. After warm-up: first measured inference 9ms, next three
  5/4/5ms on this browser; blank inference does not establish face accuracy or
  phone performance. The initial cold shader compilation was about 3.9s;
  warm-up now runs while the loading screen is visible.
- Production preview checks pass for aliases/assets, mobile controls, car/
  avatar drawing, 20.00s finish, practice provenance, creator replay, download,
  retry and Feed. No browser exceptions in gameplay or camera lifecycle checks.
- Exported `output/playwright/tilt-turbo-4853.webm`: VP9, **6.969 seconds**, one
  video stream, **no audio**, confirmed with ffprobe. Original/practice assets
  are local, and no standalone music MP3 is emitted to dist.

Repro scripts: `scripts/qa/tilt-turbo.js`, `tilt-turbo-camera.js`,
`tilt-turbo-model.js`, `tilt-turbo-production.js`. Screenshots and export evidence
are under ignored `output/playwright/tilt-turbo-*`.

## Remaining human gate

Physical iOS/Android camera alignment, first-use understanding, comfort, actual
loss frequency, spontaneous retry and whether the clip communicates controls
are **pending**. Run five people or ten initial comfort rounds using
`TILT_TURBO_PLAYTEST.md`; no human observations are fabricated.

This implements v0.1 only. No enemy AI, mouth turbo, items, rankings or extra
courses. The 20-second fixed round shows 20.00 SEC; score combines distance,
clean driving, near miss and drift rather than inventing a variable race time.
