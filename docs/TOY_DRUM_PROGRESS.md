# EXP-047 TOY DRUM v0.1

Implemented from [the supplied specification](specs/EXP-047_TOY_DRUM_SPEC_v0.1.md).
Open `#/game/solo-toy-drum`, `#toy-drum` or `#drum`. It appears in Feed and Explore.

The portrait 9:16 stage overlays four large, non-overlapping Imagegen toy drums
on the mirrored live camera. MediaPipe HandLandmarker tracks two palm centers;
no finger gesture or handedness label determines a hit. Geometric prediction
maintains hand slots. Projection matches the rendered camera cover crop.

The red/yellow drums sit in the upper row at 38% stage height; blue/green sit
in the lower row at 76%. Both rows share their positions with camera hit
ellipses and touch controls. The space between rows gives hands room to move;
the practice silhouette and DOUBLE/PERFECT feedback occupy this middle space.

Downward speed ≥0.35 stage-heights/s, a swept ellipse crossing, minimum movement,
per-drum 200ms cooldown and leave-to-rearm prevent resting, slow, sideways,
repeated or upward hits. Swept intersection also catches a swing crossing the
entire target between frames. Stale frames and reacquisition clear motion.
Every hit immediately schedules rounded percussion, 80ms squash / 120ms return,
a corresponding colored burst and a maximum two-canvas-pixel shake. Reduced
motion disables the squash, pulse and shake. Particles are capped at 280.

The 30-second active round is FREE PLAY (0–5), RHYTHM (5–20), FEVER (20–25),
BIG DRUM FINISH (25–30), then RESULT. The deterministic sequence grows from
single notes to short phrases, alternating sides and paired hits. Cue windows
are ±650ms; PERFECT is within 220ms. Off-cue hits still make a sound and earn
100 points. Correct cues build combo; expired cues reset combo without stopping
play. Two distinct hands on two different drums within 150ms earn a free-play
DOUBLE; paired rhythm cues allow 300ms. Two basic hits plus a 100-point bonus
total 300. BIG DRUM requires two distinct hands within 300ms and succeeds once.

The licensed OpenTracks song is a quiet background bed. Shared BGM ON/OFF works;
FEVER raises playback speed to 1.18 and keeps the accumulated source offset
correct through pauses. Separate SOUND ON/OFF controls original percussion.
Song and generated image provenance are in [the manifest](toy-drum-assets.json).

Practice uses large touch targets or D/F/J/K; BIG DRUM accepts D+K or two
simultaneous touches on opposite sides. Practice cannot score in camera mode.
Results use measured score, hit count, best combo, DOUBLE count and actual finish
success, label practice, and expose RETRY/NEXT/SHARE with preserved input source.
JA/EN switching, keyboard focus and error recovery use the existing shell.

Initial camera loading and denied permission offer concrete recovery. Missing
hands for 650ms pauses the active clock; 200ms of stable return resumes it without
a phantom strike. Manual pause, hidden tab and blur freeze play. Navigation,
late camera permission and results release tracks, model, loops and audio.
No video recording, upload or microphone is used. CREATOR replay / AUTO DIRECTOR
and the animal parade remain the post-MVP ideas identified in the specification.

Verification, 2026-10-04:

- 15 new rules/tracking/music-rate tests; all pass, including five simulated rounds.
- Full workspace suite: 328 tests passed (includes other concurrent game work).
  Production build passed with the existing large inline-audio chunk advisory.
- Before commit, the selected TOY DRUM changes were extracted from the index
  into a separate snapshot: all 300 tests and the production build passed there.
- `scripts/qa/toy-drum.js`: 35 browser checks, 390×844, 1440×900 and 320×640.
- `scripts/qa/toy-drum-camera.js`: 14 lifecycle/input checks with real browser
  MediaStream tracks and synthetic landmarks, including CPU fallback, held palms,
  loss/recovery, denial and late permission cancellation. No uncaught errors.
- Screenshots are in ignored `output/playwright/toy-drum-*.png`.
- `scripts/qa/toy-drum-model.js`: real CDN/WASM/HandLandmarker initialization on
  GPU, zero hands on a blank frame, model closed without requesting a webcam.
- `scripts/qa/toy-drum-production.js`: 14 production-bundle checks using public
  controls, real two-pointer touch and real Web Audio nodes. Licensed inline BGM
  decodes, plays and changes to 1.18x in FEVER; DOUBLE scores 300, two-handed
  finish succeeds, measured score persists and all contexts close on result.
  No standalone MP3 is emitted in `dist/`. No uncaught production errors.

Physical mobile acceptance, intended-HIT recognition ≥90%, and five human
playtests remain pending in [the playtest sheet](TOY_DRUM_PLAYTEST.md).

Upper/lower layout revision, 2026-10-04:

- All 15 TOY DRUM unit tests pass; downward/held/upward/slow/sideways coverage
  now exercises all four drums at their actual positions.
- 35 browser checks pass at 390×844, 1440×900 and 320×640; updated sprites,
  central feedback and touch targets were inspected in screenshots.
- 15 synthetic-camera checks pass, including separate strikes on the upper
  and lower rows without retriggering the upper drums.
- Production build and Wrangler dry run pass. All 15 production browser
  checks pass, including real two-pointer strikes on both rows and the finale.
