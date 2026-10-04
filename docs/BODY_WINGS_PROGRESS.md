# EXP-046 BODY WINGS v0.1

2026-10-05: BODY WINGS now reuses the shared Three.js Visual Layer for its sky,
clouds, rings and BOOST effects. See [3D integration and verification](BODY_WINGS_THREE_V01.md)
for the current rendering/lifecycle checks and Canvas2D replay limitation.

Implemented and verified locally on 2026-10-04. Open
`http://127.0.0.1:5176/#/game/solo-body-wings` while the Vite server is running.
Canonical ID is `solo-body-wings`; `#body-wings` and `#wings` remain valid aliases.

## Playable implementation

- Front-camera PoseLandmarker, one person, shoulders/wrists/nose. Start requires
  two visible, sufficiently spread wrists for 500 continuous milliseconds.
- One-second wing deployment, CHAK sound, engine ignition and slight camera
  pullback. A left-lean tutorial runs before the 30-second timer. It requires
  deliberate left movement to show a practice PERFECT; after 8.5 seconds it
  advances without awarding a false tutorial success.
- Shoulder slope is computed in mirrored screen coordinates, with video aspect
  correction, .04 dead zone and frame-rate-adjusted .7/.3 smoothing. Tilt drives
  lateral velocity. Neutral returns gently. Wrists are optional after takeoff.
- Lost tracking holds the last tilt for 300ms, fades it to neutral by 800ms,
  then shows the return-to-frame cue. The round continues; explicit pause and
  background blur freeze it. Stalled frames over 500ms do not sweep the course.
- A deterministic 30-ring course, easy first five seconds, PERFECT +100 / GOOD
  +50 / MISS 0, combo reset on miss. Every five consecutive successes triggers
  two-second BOOST; a ring crossed during BOOST scores ×2. 5/10 combos show
  FLOW / SUPER FLIGHT. Trails, clouds, flame, wind, ring sparkles and wing shake
  reinforce speed without changing the input rule or locking control.
- Segmented live player occupies the lower sky; generated wings follow the
  shoulder line. The actual person stays visible in camera play. Only camera-free
  practice or temporary tracking loss uses a small illustrative pilot.
- JA/EN, keyboard arrows or A/D, held pointer / touch drag and side presses,
  portrait board, pause, SE and shared BGM controls. Retrying retains the source
  and CREATOR settings; Back / NEXT return to discovery.
- Flight result shows distance, rings, best combo and maximum speed. Distance
  and speed are explicitly fictional. Numeric receipts retain the last 50
  rounds locally; no camera frames or landmarks are stored in receipts.

## CREATOR and assets

PLAY does not record. CREATOR uses the existing bounded shared recorder and
Replay. ORIGINAL retains the face, EFFECT adds goggles, and HIDE covers the face;
untracked/unbounded faces never show a raw fallback in HIDE. A continuous six-second
window is selected around the strongest real event, with a one-second brand outro.
Frames stay in device memory and are discarded on exit or retry. Replay is silent.

Built-in **Imagegen** generated both production raster assets. Complete prompts,
generation provenance and music links are in [body-wings-assets.json](body-wings-assets.json).

| Final asset | Purpose | SHA-256 |
| --- | --- | --- |
| `src/wings/assets/cover-v1.webp` | Launcher key art | `a7939f9921812e4671c1853e91f095a5244c87386f47bea85816bb369474651b` |
| `src/wings/assets/wings-v1.webp` | Transparent wing overlay | `2ab374ac8edd2c7867dc35dc18517703b049d02fbf66ea90c868a4e2031002ea` |
| `public/previews/body-wings.webp` | Lazy feed / Explore preview | Resized cover |

BGM is [8-bit Stage1 by もっぴーさうんど](https://opentracks.com/bgm/detail/1982),
reusing the already downloaded local asset. The site audio-source license and the
creator's site-conforming conditions were checked. Commercial game BGM is allowed.
Credit appears in game information and How to fly. The shared inline JS music
delivery avoids a standalone music download. Exact source/asset hashes and
processing details are in [opentracks-music.json](opentracks-music.json) and
[the music license file](../src/assets/music/LICENSE.md). No BGM is embedded in
BEST FLIGHT or offered as a creator music asset.

## Verification

- `npm test`: **274 passed, 0 failed**, including 12 new BODY WINGS tests. Covers
  mirrored sign/aspect, visibility, continuous holds, tutorial intent, dead zone,
  velocity, relaxed wrists, 300/800ms loss, pause/stall, score/BOOST, exact 30s
  completion, five simulated flights, highlight window and registry/music.
- `npm run build`: passed. Existing large inline-audio chunk warnings remain.
- `git diff --check`: passed.
- In-app browser: 360×800, 390×844 and 1440×900. JA/EN launch, generated assets,
  nonblank animated canvas, portrait game framing, reachable controls, live
  locale switch, CREATOR/HIDE selection, real-time practice completion, replay,
  retry provenance and feed recovery. Fixed the 360px launch button clipping.
- The UI Pause button froze `18.8 SEC` across a two-second wait; Resume continued.
- [Dev-only camera harness](../scripts/qa/body-wings.html): **23 checks passed**.
  Uses canvas-generated video with no camera permission or human images. Exercises
  the actual input mask conversion and controller, mirrored steering, relaxed arms,
  ORIGINAL/EFFECT/HIDE pixel checks, tracking loss/recovery, disposal, complete
  30-ring camera round, actual BOOST events, encoded six-second replay, denied
  camera and recovery into practice. Synthetic receipts are suppressed.
- Actual MediaPipe 1.0.1 WASM plus pose-lite model loaded with the production
  recognizer options and CPU delegate, and inferred a generated frame with
  segmentation enabled. No real camera was opened for this check.
- Production preview also completed an ordinary camera-free round (14/30 rings,
  best combo ×5, 1585m), with generated wing assets and no browser errors.

Browser artifacts are in ignored `output/playwright/`:
`body-wings-launch-360.jpg`, `body-wings-launch-1440.jpg`,
`body-wings-game-390.jpg`, `body-wings-game-1440.jpg`,
`body-wings-result-390.jpg`, `body-wings-camera-checks.txt` and
`body-wings-model-check.txt`.

## Pending human gates

Physical phone/webcam recognition, fatigue, cold-start understanding, latency,
enjoyment and third-party appeal have not been measured. Use
[BODY_WINGS_PLAYTEST.md](BODY_WINGS_PLAYTEST.md) for the required five people or
five rounds. These gates cannot be passed by synthetic camera or automated play.
No v0.2 vertical input, obstacles, customization, multiplayer or rankings were added.
