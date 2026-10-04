# EXP-048 POSE WALL — implementation v0.1

Implemented on 2026-10-04 from [the supplied design](POSE_WALL_SPEC_V01.md).
Open `#/game/solo-pose-wall` or `#pose-wall`. The registry keeps the existing
DUO PALM PONG and its URL intact; display numbers are namespaced by collection.

## Playable scope

- Portrait upper-body camera game. One player, five walls, 15 active seconds.
- Y, T, ONE UP, MUSCLE, HERO. HERO uses one arm diagonally up and the other
  diagonally down to make the last asymmetric shape distinct from ONE UP.
- MediaPipe PoseLandmarker Lite, one pose, no segmentation. Only Nose and both
  Shoulders, Elbows and Wrists enter the game. No hips, legs, fingers or mic.
- Mirror the front-camera image and landmarks once. Arm identity follows its
  shoulder. Aspect ratio and center-cover crop match the canvas/video mapping.
- Score each shoulder→elbow and elbow→wrist direction relative to the shoulder
  line in physical image pixels. Length, position and shoulder width do not
  drive the direction score. Four segments contribute 95%; relative head
  placement contributes 5%. A 12° dead zone absorbs small angle noise.
- Grade the time-weighted average of the final 300ms before contact. Ranks:
  PERFECT ≥90, CLEAR ≥70, SQUEEZE ≥50, CRASH <50. Missing parts receive no score.
- Each wall: 500ms reveal, 1500ms approach, 400ms verdict, 600ms pass/break.
  The wall is drawn over the camera, with a generous real transparent cutout.
  Its shoulder/face placement follows the player while all targets stay inside
  the frame. Success flashes a ring and confetti; SQUEEZE flexes the opening;
  CRASH throws foam pieces while keeping the face visible. Every crash continues.
- Successful passes build a combo; three consecutive PERFECTs give HOT STREAK.
- Results show actual average, all rank counts, best wall, best combo and five
  per-wall scores. RETRY, NEXT and practice-aware challenge sharing use the shell.
- Camera-free practice starts no model or camera. Select poses with buttons or
  keys 1–5; 0 lowers arms. Independently drag the elbow/wrist dots for partial
  matches. Practice never supplies pose input during camera play.
- Japanese/English, accessible named controls, status announcements, 44px touch
  buttons, natural scrolling on short displays and reduced-motion rendering.

## Framing and recovery

PLAY is the only sensor/model activation path. Framing shows one face guide,
with center/distance hints based on visible shoulders. Face plus shoulders in
the safe frame trigger READY, followed by a 500ms delay. No extra calibration.
The first wall never requires raised hands to start.

Each joint retains its last valid position for at most 150ms. Longer wrist/elbow
loss displays a localized left/right arm-in-frame hint. Missing face/shoulders
pause the active clock after the joint grace and 350ms core timeout; 200ms stable
core recovery resumes it. Pause, visibility loss and blur stop the game/music.
Resuming during an approach rewinds at most 300ms, clears the old hold and gives
a fresh grading window. Pausing cannot force an incomplete-window CRASH.

Denied/unavailable cameras offer reconnect and practice. Model creation falls
back from GPU to CPU. Result/exit releases stream tracks, model, animation loop,
listeners and sound. A camera granted after navigation is immediately released.

## Assets and audio

Built-in Imagegen produced the game-show cover. Original PNG and optimized WebP
are in `src/poseWall/assets/`; discovery uses `public/previews/pose-wall.webp`.
The exact prompt and hashes are in [the asset manifest](pose-wall-assets.json).
Animated holes and foam walls are native canvas geometry, allowing them to fit
the tracked player and deform during SQUEEZE.

BGM is 「おもちゃの一日」 by いまたく, reused from the already downloaded OpenTracks
source in this workspace. Current site license, site terms and creator conditions
were checked; commercial game background use and editing are allowed. The
18-second edit is normalized and fades in/out. Its Vite `?inline` import is in a
lazy music JS chunk, with no standalone MP3 in public/dist. Shared BGM ON/OFF,
pause, focus, result and exit handling applies. Rank sounds are original Web Audio.
No recording or downstream music provision is implemented in this MVP.

## Verification

- `npm test`: 372 tests pass, including 13 POSE WALL cases. Covers all five
  targets at multiple aspects, length/position/tilt independence, crossed wrists,
  seven-point tracking, 150ms expiry, invalid data, crop/framing alignment,
  threshold edges, time-weighted holds, continued crashes, pauses, retries,
  measured results, aliases and practice-aware sharing.
- `npm run build`: passes. Existing large music-chunk warning remains.
- `scripts/qa/pose-wall.js`: 35 browser checks. Generated art and entrances at
  1440×900, 360×800, 390×844 and 720×1280; instructions/focus, JA/EN, actual joint
  drag, four verdicts, five-wall result, pause/retry/exit, BGM mute and isolation
  of cached styles. No browser exceptions.
- `scripts/qa/pose-wall-camera.js`: 19 checks using synthetic upper-body
  landmarks and real canvas MediaStream tracks. Automatic READY, GPU→CPU
  fallback, wrist grace/guide, core loss/recovery, all five matching poses,
  result release, late permission cancellation, denial and practice recovery.
- `scripts/qa/pose-wall-model.js`: actual MediaPipe 1.0.1 WASM and Lite model
  loaded and inferred on GPU, then closed. Empty canvas intentionally detected
  zero people. First cold inference took 4217ms on this browser; a later cached
  run took 351ms then 11/10/9ms. These are desktop test observations, not phone
  performance or human accuracy measurements.
- `scripts/qa/pose-wall-production.js`: 9 built-output checks at 360×800. Cover,
  no pre-PLAY model/BGM, five PERFECTs / 100%, practice label, inline music,
  retry, all practice controls within the viewport and no browser exceptions.
- Screenshots and run logs: ignored `output/playwright/pose-wall-*` and
  `output/pose-wall/`. The dev server is `http://127.0.0.1:5173/`.

## Remaining evidence and next phase

Five-person gates, real front-camera accuracy, offscreen-hand frequency, cold
start under three seconds, mobile Safari/Chrome and real GPU/CPU performance
remain unverified. A cold model download/shader compile can exceed the three-
second startup goal. See [the playtest sheet](POSE_WALL_PLAYTEST.md).

CREATOR MODE, AUTO DIRECTOR, edited replay, dynamic/fake final walls, unusual
silhouettes and DUO are the design's next phase. The fifth MVP wall is labeled
FINAL WALL, without changing its pose midway. No production deployment was made.
