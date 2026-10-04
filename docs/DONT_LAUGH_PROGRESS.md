# EXP-055 DON’T LAUGH implementation and verification

Implemented the NORMAL MVP and a small local adaptive attack preference.
Rules, signals, renderer, lifecycle, localized copy, audio and presentation are
separate modules under `src/dontLaugh`; front-camera input is
`src/input/dontLaughInput.js`. The registry owns routing and lazy loading;
the shared MusicBed owns BGM. No new package or plugin installation was needed.

## Automated checks — 2026-10-04

- `npm test`: 451 tests passed, zero failures in the final full suite. Dedicated
  DON’T LAUGH tests cover aspect/roll correction, calibration, speaking/blinking,
  malformed input, portrait cropping, 399/400ms, exact deadline, pauses, attack
  order, preference learning, independent routes and licensed music.
- `npm run build`: success. Existing large music chunk advisories remain.
- Playwright development QA: 40 checks passed, zero page exceptions. Entry and
  result at 1440x900, 390x844 and 360x800; timed survival, short smile tolerance,
  failure, pauses, stages, bounded replay, HIDE options, retry cleanup, JA/EN,
  BGM/SFX toggles, instruction focus and cached-style isolation.
- Synthetic front-camera QA: 15 checks passed, zero page exceptions. Real canvas
  stream plus deterministic landmarks exercised neutral calibration, countdown,
  missing/multiple/stalled input, stable recovery, sustained smile, separate
  camera/practice bests, numeric preference storage, permission denial, fallback
  and acquired-track teardown. This is not a physical webcam accuracy test.
- Real FaceLandmarker/WASM on an Imagegen face crop: GPU creation succeeded;
  one face, 52 blendshape categories, neutral calibration completed and score0.
  Warm inference on this host: approximately 10–15ms. First inference/model
  initialization took about 2.4 seconds. MediaPipe writes its informational
  XNNPACK delegate message to stderr; there was no JavaScript exception.
- Production preview QA: 11 checks passed, zero page exceptions. Bundled art
  and game rendered at desktop/mobile sizes; a real pointer hold caused defeat,
  result contained pixel evidence, CREATOR controls and retry worked, practice
  requested no camera or tracking model.
- CREATOR export verified with real wall-clock timing, using a fresh browser:
  `output/dont-laugh/replay.webm`, 53,254 bytes, 2.956 seconds, 270x480 video only.
  No audio stream. Virtual browser clocks are deliberately not used for encoding.
- `git diff --check`: no whitespace errors.

Source PNGs and optimized WebP assets are retained in `src/dontLaugh/assets`.
The bird has genuine alpha. Exact prompts, hashes, commercially licensed BGM
reuse and CC0 shared SE provenance are recorded in `dont-laugh-assets.json`
and `dont-laugh-image-prompts.txt`. The OpenTracks music is inline encoded in
its existing lazy JS chunk, and is absent from the silent exported video.

The workspace contains other experiments being edited in parallel. Their files
were preserved. Final verification used the shared workspace state at that time.

## Remaining physical checks

Individual face accuracy, laugh-inducing effectiveness and iOS/Android hardware
behavior require the playtest in `DONT_LAUGH_PLAYTEST.md`. Threshold64 and the
55ms smoothing constant are initial tuning values. HARD / IMPOSSIBLE and DUO
are subsequent phases rather than playable modes in this MVP.
