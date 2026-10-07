# Camera Instrument + MAESTRO v0.1

Implemented 2026-10-07 from the supplied [Camera Instrument specification](specs/CAMERA_INSTRUMENT_LAYER_v0.1.md)
and [MAESTRO specification](specs/MAESTRO_MODE_v0.1.md).

## Open and play

Run `npm run dev -- --host 127.0.0.1 --port 5298`.

- `http://127.0.0.1:5298/#/game/tech-camera-instrument` — WORLD INSTRUMENT playground.
- `http://127.0.0.1:5298/#/game/solo-maestro` — MAESTRO free concert.
- Existing feed/explore includes both entries. Short routes `#camera-instrument`,
  `#world-instrument`, `#toy-piano` and `#maestro` also work.
- Both offer camera-free practice, touch/keyboard controls, JA/EN, pause/resume,
  mute, failed-camera retry and Debug HUD. `?debug=1` starts the HUD expanded.
- Phone camera use requires HTTPS or localhost. Use the project's existing
  HTTPS development setup when testing on another device.

WORLD INSTRUMENT: choose three objects on screen to place C/E/G; use the tracked
index fingertip to press each spot, then lift outside it before the next note.
Add up to five, drag to move, tap to remove in edit mode, clear or select a five-spot
preset. MELODY, DRUM and TOY banks are available. The rear camera is requested
explicitly; front-facing cameras are rejected. A metadata-free desktop webcam
can use the fallback. Practice uses direct taps or keys 1–5. Optional licensed
OpenTracks backing starts OFF.

MAESTRO: fix the phone in front of you with shoulders and both wrists visible.
Raise a hand to start strings. Spread arms to make the whole orchestra louder.
Direct both hands left for strings only, right to add brass, downward to add
percussion. Move both hands together and freeze for CUT. With all parts loud,
bring both hands down strongly for FINALE → BRAVO, confetti and applause.
In practice use START, section buttons, the intensity slider, CUT and FINALE;
Space / 1–3 / ↑↓ / X / F also work. No score or round timer.

## Architecture and implementation choices

- The existing project uses JavaScript, so new modules follow it; no TypeScript
  migration was introduced just to match the specification's example filenames.
- `src/camera/instrument/` owns pure zones, smoothing/hit decisions, presets,
  presentation and shared session lifetime. MediaPipe stays in `src/input/`;
  WebAudio in `src/audio/instrument/`; bounded Canvas2D effects in `src/visual/`.
- Both inputs reuse the existing `BodyInput` camera/model lifecycle. One Hand
  Landmarker tracks only the index tip at up to 25Hz in WORLD INSTRUMENT. One Pose
  Landmarker Lite tracks shoulders/wrists at up to 16.7Hz in MAESTRO. Finger shapes
  in the MAESTRO illustration are not a required additional hand-recognition model.
- Normalized coordinates follow the actual object-fit cover crop. MAESTRO mirrors
  its front-camera picture and coordinates together. A zone radius is a fraction
  of the short screen edge, so portrait and landscape circles behave consistently.
- Hit smoothing uses a 45ms time constant. A 120ms cooldown plus leaving 1.2×
  radius re-arms a spot. Initial acquisition, tracking recovery and long gaps do
  not strike. Boundary noise stays silent; slow deliberate central presses work.
  Overlapping spots consume one contact and choose the closest spot.
- MAESTRO normalizes movement to shoulder width, smooths at 70ms, debounces
  section/raise gestures and requires a shared sweep before CUT. Opening and
  holding both arms therefore remains a crescendo. A guarded double downstroke
  gives FINALE priority over percussion/CUT. Accent notes use the next 120BPM beat.
- Pose loss preserves music for 1.5 seconds, then fades over 0.8 seconds; recovery
  resets velocity history. It does not falsely finish the session.
- Canvas2D + generated WebP atlas + CSS animation suffice for these small musical
  scenes. This avoids another WebGL context/engine. DPR is capped at 1.5 and effects
  and event history are bounded; reduced-motion preference is respected.
- Blur/background pauses and silences the session; resuming is an explicit tap.
  Exit closes both possible audio owners, camera tracks, models, RAF and listeners.
  A late camera/audio start cannot reactivate an exited view. Practice needs no
  camera or model downloads. Video is local and is neither recorded nor uploaded.

## Reusable zone API

```js
import { createCameraInstrument } from '../camera/instrument/CameraInstrument.js';
const instrument = createCameraInstrument({ maxZones: 5, soundBank: 'pentatonic', audio });
instrument.addZone({ x: .5, y: .4, radius: .09, soundId: 'C4', cooldownMs: 120 });
const off = instrument.on('hit', ({ zoneId, soundId, velocity }) => { /* game / FX */ });
instrument.update(croppedFingerPoint, performance.now(), { width, height });
// null means tracking lost; direct hit() is available for touch/keyboard practice.
instrument.update(null, performance.now(), { width, height });
off();
```

Audio dispatch precedes visual/game listeners. `setPreset('toy-piano' | 'toy-drum'
| 'toy-sounds')`, `removeZone(id)`, `clear()` and `dispose()` are also available.
The optional audio owner is injected rather than coupled to the tracker.

## Assets and commercial use

OtoLogic is a good match for applause and dramatic accents: its official
[terms](https://otologic.jp/free/license.html) allow commercial use and editing
under CC BY 4.0 with credit. MAESTRO actually uses **拍手 群衆03-3（短）**, edited to
four seconds, with linked OtoLogic/license attribution in the live game and how-to.

For independent musical parts, we render **Little Theatre**, an original fixed
16-bar C-major arrangement at 120BPM from [VSCO 2 Community Edition CC0 recordings](https://github.com/sgossner/VSCO-2-CE).
Strings, brass and percussion are exact 32-second loops, started together in one
AudioContext and mixed with independent gains and a low-pass filter. There is
no runtime composition or AI source separation. This gives reliable part control
without trying to separate a finished OpenTracks song. A sample-based chord plays
at the finale. Kenney CC0 confirmation and OtoLogic applause complete the sounds.

WORLD INSTRUMENT optionally reuses the existing commercially licensed OpenTracks
**おもちゃの一日 / いまたく** as background music, following the existing embedded
delivery and pause/mute/exit policy. The new UI provides no music download or export.

The animal orchestra and cover were generated with the **built-in Imagegen tool**.
Original PNGs and alpha-preserving optimized WebPs are saved under
`src/maestro/assets/`. [Exact prompts](maestro-image-prompts.md),
[image/SE provenance and hashes](maestro-assets.json),
[music recordings, arrangement and hashes](maestro-audio-assets.json) are retained.
`node scripts/manifest-maestro-assets.mjs` rebuilds the manifest. The music renderer
is `python scripts/prepare-maestro-audio.py` (requires numpy, ffmpeg and the source
subset in AssetsShared); it atomically replaces completed assets so the dev server
never reads partial recordings.

## Verification, 2026-10-07

- Shared working-tree Node suite: **597/597 passed**. Instrument/MAESTRO/rear-camera coverage:
  **21/21 passed**, including cooldown/rearm, overlap, slow press vs noise,
  cropped points, one/three/five spots, aspect ratios, gesture priority,
  acquisition/recovery, tutorial/state guards, denied permission and stale streams.
- The commit-only snapshot, based on `c29590d` plus this feature, also passes
  **514/514 tests** and the production build. Other pending games/dependencies
  are excluded from this commit.
- `npm run build`: passed, including PWA generation. Vite reports the project's
  existing large-chunk advisory. Music is lazy and embedded in the view chunks;
  no standalone MAESTRO/OpenTracks audio is emitted into public/dist.
- Real Chromium UI/WebAudio: **39 checks**, covering a nonzero actual waveform,
  three decoded 32-second loops with identical start time, silent CUT, guarded
  FINALE/BRAVO/OtoLogic, controls at 360/720/1440 widths, editing, optional backing,
  loss/grace/fade/recovery, language and full exit cleanup.
- Additional failure/background/race checks: **10 checks passed** — permission
  denial → practice, all audio owners mute on background, explicit resume, late
  initialization after exit for both experiences.
- Compiled production preview: **11 checks passed**, including actual decoded
  stems/one-shots/backing, waveform, CUT, OtoLogic credit and both audio owners close.
- Actual Pose Lite and Hand Landmarker WASM/model startup and blank-video inference
  passed for both; three frames each and complete stream/model/audio/RAF release.
  Synthetic landmarks exercise the real result parser and crop mapping separately.
  These checks do **not** measure a person's real camera gesture accuracy.
- Reproducible scripts: `scripts/qa/camera-instrument-maestro.js`,
  `maestro-recovery.js`, `maestro-production.js`, `maestro-camera-models.js`.
  Run with the project's Playwright CLI and local ports 5298 (dev), 5299 (preview).
  Local evidence lives in ignored `output/playwright/` and `output/maestro-*.log`.

## Still requires a phone/person

The v0.1 playable implementation is ready for a physical A401OP/Android test.
Do not mark subjective latency or 90% real hit accuracy as achieved yet.
Measure: fixed phone, 1/3/5 spots, fast and slow taps, nearby objects, portrait and
landscape, lighting/occlusion, hand disappearance/recovery; then shoulders/wrists,
raise/spread/left/right/down, 10 intentional CUTs and guarded finales. Compare
gesture-to-sound delay, stable FPS/inference timing, audio clicks and perceived
control for a few minutes. Tune thresholds from those results.

Creator recording/export, Challenge Mode, multiple songs, two players, automatic
object recognition and integration into the existing TOY DRUM remain later phases
from the supplied roadmap. v0.1 is the common zone API, its playable playground
and the untimed MAESTRO free session.
