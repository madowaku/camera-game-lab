# EXP-054 AIR SLASH — implemented 2026-10-04

Open `#/game/solo-air-slash` / `#air-slash` / `#airSlash`.

The game uses the existing platform launcher, BodyInput camera lifecycle,
MediaPipe package, music owner and creator/export primitives. Simulation,
input mapping, canvas rendering, DOM HUD/menus, sound and presentation have
separate owners under `src/airSlash/` and `src/input/airSlashInput.js`.

Implemented: 15 seconds, two palm centers without hand-shape gestures,
130ms trails, speed AND swept collision, 180ms camera reacquisition guard,
coordinate-jump rejection, real slash angles and separating clipped halves,
juice, white blade light, 45–60ms hitstop, layered swoosh/chop, filtered-noise
explosion, tracked-face soot, camera shake, combo scoring, power, X-SLASH giant,
29-fruit/four-bomb base schedule, ten-combo bonus and final FRUIT STORM.
Overlapping same-frame cues prioritize BOOM / X-SLASH over first-slash GOOD.

UI includes Japanese/English, responsive entry/results, 44px+ controls,
pointer / two-touch / arrows and WASD / X practice, Space pause, user/background
pause, 450ms tracking-loss pause, 350ms stable recovery, explicit permission
failure recovery, BGM/SE mute and shared RETRY/NEXT/challenge sharing.

CREATOR marks first slash, X-SLASH, ten combo, explosion and storm. The best
actual event selects six seconds with lead-in/reaction plus a one-second score
card. ORIGINAL/EFFECT/HIDE are composed before recording; HIDE excludes all
raw camera pixels, even without face data. Frames stay in memory and are
discarded on exit. Optional MP4/WebM encoding happens after the round and is
silent. Export capability failures have localized recovery text.

Assets: built-in Imagegen cover and native RGBA 3×2 atlas; source PNGs retained.
Runtime cover 145680 bytes, feed preview 60862 bytes, atlas 109570 bytes.
No semantic post-generation edits; WebP encoding preserves alpha.
OpenTracks “イケイケな気分” / ハヤシユウ, official download track 1,
commercial game BGM conditions checked; first 20 seconds normalized and
bundled as inline data in a lazy JS module. Shared Kenney RPG/Impact CC0 samples
and original Web Audio effects. Exact paths, hashes and conditions in
`docs/air-slash-assets.json`; exact built-in generation prompts in
`docs/air-slash-image-prompts.txt`.

Verification:

- `node --test test/airSlash.test.js`: 14 passed. Geometry, speed categories,
  stale observations, reacquisition/jumps, stationary hands, direction, score,
  bombs/misses, X-SLASH/cooldown, storm, exact timer, tracking recovery,
  palm/face projection, director selection and registry/music integration.
- Latest full `npm test`: 451 passed, zero failed. Earlier unrelated in-flight
  BLINK HORROR failures resolved by that task; AIR SLASH did not edit its files.
- `npm run build`: passed. Existing large lazy-music chunk advisories remain.
  No standalone MP3 is emitted into `dist/`.
- `scripts/qa/air-slash.js`: 36 browser checks, zero exceptions. Mobile 360/390,
  desktop 1440, assets, no sensors on entry, JA/EN, directional halves, keyboard
  and pointer cuts, bomb, X-SLASH, pause/mutes, results/retry/exit/alias/creator.
- `scripts/qa/air-slash-camera.js`: 10 synthetic stream/lifecycle checks.
  HIDE pixel exclusion, tracking loss/stable recovery, no recovery slash,
  all tracks ended on result, permission refusal and practice fallback.
- `scripts/qa/air-slash-production.js`: 13 checks against the compiled Vite
  preview. Generated assets/credit, first-slash X-SLASH cue precedence,
  measured score, pause, results/replay/retry/feed, mobile width, no browser
  exceptions and no failed HTTP assets. 59 browser checks in total.
- `scripts/qa/air-slash-model.js`: actual downloaded HandLandmarker and
  BlazeFace FaceDetector loaded and inferred with GPU; first cold inference
  5388ms, warm paired inference 41/41/47ms on this desktop. Blank-frame
  inference requested no physical camera and establishes no human-input gate.
- `scripts/qa/air-slash-export.js`: actual MediaRecorder MP4 saved as
  `output/playwright/air-slash-highlight.mp4`, 479330 bytes, 540×960,
  HIDE composition, video-only, ffprobe duration 6.867267s for the seven-second
  plan (browser encoder final-frame timing). Save/replay capability exercised.

Logs are in ignored `output/air-slash/`; screenshots/video in
`output/playwright/air-slash-*`. Physical-device hand feel, motion blur,
anatomical side labeling and five-round player delight checks remain pending
in `docs/AIR_SLASH_PLAYTEST.md`. No deployment was performed.
