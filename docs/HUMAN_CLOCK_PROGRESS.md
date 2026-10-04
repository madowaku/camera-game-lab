# HUMAN CLOCK v0.1 — implementation and verification

Implemented 2026-10-04 in `src/humanClock/`, with
`src/input/humanClockInput.js`, registry/music integration and documentation.
Route: `#/game/solo-human-clock`; aliases: `#human-clock` and `#clock`.

The final user clarification is implemented: **each index finger's knuckle-to-tip
direction** is the clock hand. The shoulder center only places the clock dial.
The initial crossed-arm cover was corrected, then replaced by Imagegen art
based on the user's two-hand sketch. The final cover is
`src/humanClock/assets/cover-v3.webp`; its exact prompt is
`docs/human-clock-image-prompt.txt`. Audio sources, license conditions,
processing and checksums are in `docs/human-clock-assets.json`.

## Included behavior

- Real analog hour interpolation, 12/20 shuffled five-minute question decks,
  EASY numerals / NORMAL ticks after three clocks, ±12° and 400ms hold.
- Anatomical left/hour and right/minute ownership, aspect-correct mirrored
  projection, raw plus smoothed angle checks and rejection of curled/end-on fingers.
- Thirty active seconds, TICK / +1 TIME, digital-to-analog fold, fingertip glow,
  colored proximity, directional guidance, combo and five-second TIME RUSH.
- One camera for Hands and Pose, GPU/CPU fallback, readiness, immediate hold
  reset on loss, paused time and stable reacquisition. Permission denial and
  late permission cancellation have recovery/teardown.
- Drag/tap/sliders, A/D and arrows with finer Shift adjustments for camera-free
  practice. These controls do not affect camera mode.
- JA/EN, reduced motion, BGM/SFX preferences, measured result/fastest clock,
  RETRY keeping difficulty/source, NEXT and practice-aware challenge sharing.

BODY CLOCK, HARD one-minute questions and CREATOR/replay remain deferred.

## Verification evidence

- `npm test`: **407 passed**, zero failed at the final full-suite run.
- `test/humanClock.test.js`: **13 targeted tests** passed. Covers exact hour math,
  wraparound, raw/smoothed tolerance, continuous hold, strict deadline, pause,
  rush/skip, shuffle, projection, anatomical crossing, invalid input, finger
  translation invariance, tracking recovery, routes and actual share payload.
- `npm run build`: passed. The repository retains its existing large-chunk
  advisory for inline music; HUMAN CLOCK's audio stays in a lazy JS chunk.
- `scripts/qa/human-clock.js`: **41 checks** passed, zero browser exceptions.
  Screenshots and interaction checks at 1440×900, 390×844 and 360×640 include
  art, no startup sensors/model/audio, JA/EN, radio selection, rendered pixels,
  keyboard, drag/tap/sliders, pause, fresh hold, success, rush, skips, preferences,
  results, share, retry, exit and theme isolation.
- `scripts/qa/human-clock-camera.js`: **18 checks** passed with synthetic
  landmarks and real canvas MediaStream tracks. Exercises partial-model cleanup
  before CPU fallback, one-stream/no-mic constraints, finger and shoulder loss,
  bent-finger rejection, stable recovery, result cleanup, late permission and
  denial-to-practice. No physical camera/human accuracy claim.
- `scripts/qa/human-clock-model.js`: real downloaded HandLandmarker and
  PoseLandmarker Lite loaded with GPU and returned real inference outputs.
  First combined inference 4,890ms; warm combined samples 18/16/15ms on this
  desktop and a blank canvas. This is not a phone or human recognition benchmark.
- `scripts/qa/human-clock-production.js`: **14 built-bundle UI checks** passed;
  the final pass also checks small-screen banner and button fitting after the
  result layout adjustment. Reduced-motion success, actual displayed-time
  completion, measured results, RETRY and exit are exercised without importing
  debug source into the built app.
- `git diff --check`: passed. No standalone HUMAN CLOCK MP3 in the built assets.

Publication preflight on 2026-10-04 isolates HUMAN CLOCK from the other uncommitted
experiments: the existing `main` revision plus this feature passes **372 tests**,
the production build, **14 built-bundle UI checks**, and Wrangler's deployment
dry run. This is the source set used for the HUMAN CLOCK commit and deployment.

Browser artifacts and CLI reports are under ignored `output/playwright/` and
`output/human-clock/`. A fixed source copy in the latter was used for browser
tests to avoid unrelated workspace edits reloading an in-progress round.
The final built preview is served at `http://127.0.0.1:5186/#/game/solo-human-clock`.

## Remaining acceptance

Physical iOS/Android/webcam recognition, wrist comfort, lighting/occlusion,
mobile latency and five-person Input Gates A–E remain unperformed. See
`HUMAN_CLOCK_PLAYTEST.md`. Automated results do not certify these properties.
