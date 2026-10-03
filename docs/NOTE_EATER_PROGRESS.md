# EXP-016 NOTE EATER v0.2

Implemented locally on 2026-10-03 from the [provided specification](specs/EXP-016_NOTE_EATER_SPEC_v0.2.md).
Open `http://127.0.0.1:5173/#/game/solo-note-eater` or the `#note-eater` alias.
It also appears in Feed and Explore. No deployment was performed.

## Playable implementation

- One front-camera stream, on-device Face Landmarker, face-center XY and
  mouth OPEN / CLOSED / UNKNOWN only. No microphone, pitch recognition or hands.
  Shared camera cancellation, GPU-to-CPU fallback and teardown are reused.
- Aspect-correct lip gap, hysteresis (.24 open / .12 closed), short 45/65ms
  state holds. Unknown/stale/ambiguous input disarms acquisition and never
  counts as CLOSED. Returning closed re-arms automatically.
- A single forgiving first note, a bite with immediate sound, 3/2/1, then
  exactly 30 active seconds. The tutorial note is excluded from round metrics.
- Three independent moving choices, five colored shapes mapped to C/D/E/G/A.
  Radius is mouth width ×2.25 with practical bounds; wider magnet assistance
  pulls nearby notes, adds a halo and enlarges them. Each eat takes the nearest
  eligible choice and requires another CLOSE before the next eat.
- Bite sound uses AudioContext.currentTime, without beat quantization. The
  shape accelerates into the mouth, shrinks, vanishes and emits waves/particles.
  Passed notes sound quietly; no MISS, punishment, ranks or combo resets.
- GROOVE 0–100 rises with bites and decays gradually. At 104 BPM, kick, bass,
  hi-hat, chord and sparkle layers join at thresholds 0/20/40/60/80. Fixed
  soundtrack integration is explicitly excluded through `audioStrategy`.
- Result records notes eaten, max groove, unique types and the complete
  ordered melody. YOUR MELODY waits for audio activation, replays in the same
  order, and can stop. RETRY, NEXT, SHARE and JA/EN use the shared shell.
- Camera-free drag/arrows to aim, tap/Space to bite; held Space cannot keep
  eating. Practice provenance follows the result and sharing.
- Permission recovery, pause, background interruption, mute and resource
  cleanup. Tracking loss continues music/time and offers a concrete action;
  it does not freeze the whole game.

## Creator and persistence

CREATOR reuses `src/creator/` for 9:16 composition, ORIGINAL/EFFECT/HIDE,
temporary treated frames and the shared seven-second replay player. Game
hooks are FIRST_EAT, FAST_3_EATS, GROOVE_50, GROOVE_80, BIG_NOTE and FINAL_EAT.
The replay prefers a six-second continuous window with two seconds before a
three-bite event above groove 80, followed by a one-second title outro.
Frames are bounded by the shared 8MiB/340-frame limits and discarded on departure.
PLAY never collects replay frames. HIDE uses a full-camera fallback during loss.
Video-file export and direct video posting remain outside this implementation;
the current shared replay player is visual and does not record the soundtrack.

Numeric receipts and ordered notes stay in localStorage
(`camera-game-lab-note-eater-rounds`, last 50). No camera images are stored there
or uploaded. Creator frames are memory-only.

## Verification

- `npm test`: 249/249 pass, including 15 NOTE EATER rule/input/audio checks.
- `npm run build`: Vite/PWA builds; game and presentation remain lazy-loaded.
- `scripts/qa/note-eater.js`: 37 browser assertions across 390×844, 360×800,
  360×500 and 1440×900, including actual public practice controls, pixel
  evidence, full round, exact melody ordering through Web Audio, pause,
  sound, locale, receipts, retry and discovery.
- `scripts/qa/note-eater-camera.js`: actual browser-owned camera tracks with
  synthetic landmarks exercise the real input/controller lifecycle, recovery,
  ambiguous faces, permission failure, retry and all Creator face modes.
- Screenshots are in `output/playwright/note-eater-*.png` (ignored QA output).

The [Face Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)
was checked for VIDEO mode, configuration and inference behavior. Inference
is throttled to 20Hz; physical mobile performance remains unmeasured.

The cover was generated with built-in Imagegen. The original, optimized
workspace assets and exact final prompt are in
[the asset record](../src/noteEater/assets/README.md).
No new plugin installation or external-service account was required.

Android/iOS tracking accuracy, closed-mouth false activation, cold-start
success and the five-round human verdict are **pending**. Use the
[acceptance sheet](NOTE_EATER_PLAYTEST.md); synthetic evidence does not pass
these human gates.
