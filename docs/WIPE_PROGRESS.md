# EXP-049 WIPE! — implementation and verification

Verified on 2026-10-04. MVP implemented in the existing Camera Game Lab.

Try locally: `http://127.0.0.1:5173/#/game/solo-wipe` or
`http://127.0.0.1:5173/#/game/duo-wipe`. The entrance mode picker navigates to
the corresponding canonical route, so shared results reopen the correct mode.

## Implemented

- Portrait 9:16, 30-second SOLO and 45-second DUO; automatic palm-ready start.
- Grid-owned dirt appearance and measured CLEAN area. Fog / drops / foam /
  handprint require the same movement with one / two / broad / repeated passes.
- Swept circular sponge, motion-earned scrubbing, forgiving palm radius,
  particles, droplets, trails, 10% sparkles and >=90% remaining-dirt glow.
- Actual 100% only when every cell is clear; final reveal, brightness, sparkle,
  squeak and PERFECT WINDOW. Time-up reports measured partial progress.
- DUO screen-side assignment, independently bounded masks, first-clear win,
  simultaneous-clear draw, time-up area comparison and one-shot BIG BUBBLE
  attacks. Three fresh drops normally; two tiny drops and <=0.8% area above
  90% clean. An untouched opponent also receives visible, tougher droplets.
- MediaPipe Hand Landmarker: average of 0/5/9/13/17, stable IDs across ordering
  changes, mirrored camera-cover projection, 180ms stale rejection, smoothing,
  GPU/CPU fallback. No finger gesture or face identity needed.
- Tracking-loss pause after 350ms with explicit hand-return copy; automatic
  recovery. DUO pauses when either screen side lacks a hand. Manual/background
  pause clears contact history. Reacquisition cannot wipe across a lost path.
- Mouse drag and independent touch pointers. Desktop DUO can wipe each lane
  in turn; two touches can clean simultaneously. Camera-free practice loads
  neither camera nor tracking models.
- JA/EN, BGM/SFX switches, RETRY/NEXT/result sharing, source-labeled practice,
  real measured duration and separate SOLO camera/practice best times.
- CREATOR uses the shared recorder/composer/export foundation. ORIGINAL camera,
  EFFECT pop-color grading, HIDE generated illustration with no raw-camera
  fallback. Preserved opaque first frame, full-round compressed reveal, clear
  finish and end card. Seven-second replay, optional local video encode/save/share.
  BGM and sampled SFX are excluded from the exported clip; video is silent.
- Input, media tracks, models, sound, listeners and animation stop on result/
  exit. Clips stay in memory and are discarded on exit.
- Two built-in Imagegen images, licensed OpenTracks BGM, shared Kenney CC0 SFX;
  provenance/hashes/processing in `docs/wipe-assets.json`, exact prompts in
  `docs/wipe-image-prompts.txt`.

## Verification

`npm test`: **407/407 passed**. Twelve WIPE tests cover actual mask completion,
resisting dirt and stillness, swept paths, side isolation, tracking gaps,
single splash/90% cap/untouched rival, timeout/draw/retry, palm projection,
stale identity, full-reveal replay and measured result sharing.

`npm run build`: passed. The build retains the repository's lazy inline-audio
chunk-size warnings; the WIPE BGM is loaded only after player activation.
`git diff --check`: passed. Existing unrelated work was preserved. Two shared
tests now locate HAND BEAT by canonical ID instead of assuming catalog index 0.

Playwright CLI browser checks: **62 passed**, no game exceptions or failed
built-asset requests:

- `scripts/qa/wipe.js`: 34 checks, including 1440×900 / 390×844 / 360×800
  entrance layouts, real mouse drag, SOLO/DUO completion, canonical mode switch,
  splash, mute, pause, retry, privacy provenance, replay and actual video saving.
- `scripts/qa/wipe-camera.js`: 19 checks using synthetic palm landmarks and
  real canvas MediaStream tracks. Covers GPU fallback, no pre-PLAY sensors,
  lost-hand pause/recovery, two hands on one side, reordered DUO hands, HIDE
  sanitized rendering, stream/model teardown and permission-denial practice.
- `scripts/qa/wipe-production.js`: 9 checks against the built preview on port
  4173, including real dragging and nonblank canvas pixels at mobile/desktop sizes.
- `scripts/qa/wipe-model.js`: actual CDN/WASM and HandLandmarker float16 model
  loaded with GPU; a blank 720×1280 image inferred zero palms. No webcam used.

Saved CREATOR artifact:
`output/playwright/camera-game-049-7s.mp4`, H.264, **540×960**, **6.912 seconds**,
232,496 bytes, no audio track (verified with ffprobe). Synthetic QA completes
the round quickly; its duration is not a physical-player performance claim.

Screenshots live in `output/playwright/wipe-*.png`. Latest test/build/browser
logs live in ignored `output/wipe/`. The temporary port-5177 QA server disabled
hot reload to isolate checks from concurrent workspace changes; the normal
port-5173 dev server remains available.

## Pending human verification

Physical-phone tracking, lighting/corner coverage, real-world latency, mobile
codec/share support and the user's five-round enjoyment gate remain untested.
Use `docs/WIPE_PLAYTEST.md` for the requested five qualities and the shared
input gates. Neither synthetic landmarks nor blank-frame inference establishes
that humans find the game intuitive, forgiving or satisfying.

The implementation verification above preceded the production release.
Physical-device results and external clip sharing remain unverified.
