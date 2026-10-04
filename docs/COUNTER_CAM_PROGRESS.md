# EXP-050 COUNTER CAM v0.1

Implemented 2026-10-04. Canonical route `#/game/solo-counter-cam`; alias
`#counter-cam`. EXP display numbers are not identity: HUMAN CLOCK also uses
EXP-050 in this workspace, with its own canonical ID and loader.

## Playable behavior

- 9:16 canvas, mirrored live player, compact waist-up ROOKIE ROBOT below the
  player's face; generated gloves approach the old head position.
- PUNCH / LEFT DODGE / RIGHT DODGE / GUARD only. Shoulder-relative wrist
  extension plus speed, including camera-facing Z motion. Retraction rearms;
  650ms cooldown and reacquisition suppress repeated/false punches.
- Shoulder-width-normalized head displacement >=28% from the attack's aim.
  The robot re-aims every attack, so a parked dodge does not win.
- 900ms red shoulder/attack-line warning, 150ms just-dodge freeze, 850ms
  counter window with an initial 300ms perfect window. Punch during freeze
  is buffered. First two attacks include an arrow hint.
- Normal 10 / counter 40 / perfect 80. Robot HP 640; ordinary spam cannot
  KO within the 30-second round. Guard blocks damage without a counter.
- Four counters fill special. Hold a retracted fist for >=500ms, then punch
  for 240 damage. Strength changes impact sound, PON/BAM/BOOOOM, shake and
  the MEGA PUNCH burst, cracks and robot flight. Reduced motion is respected.
- Three hearts, 30-second time limit, KO/DOWN/TIME UP and C/B/A/S/S+ ranking
  from measured events. S+ requires the final hit to be perfect or mega.
- Actual neutral → punch → both sways calibration. Too-close face/shoulders
  block start. Missing face/hands and excessive proximity pause the fight;
  stable recovery resets velocity and restarts a full enemy warning.
- FACE/HANDS status and simple recovery copy. No internal recognition jargon.
- PLAY records no frames. CREATOR supports ORIGINAL/EFFECT/HIDE and selects
  six seconds around the strongest counter/mega/KO plus a result end card.
  HIDE draws no raw-camera fallback when face tracking is stale or absent.
  Optional seven-second silent video save uses browser MediaRecorder.
- Touch controls and ←/→ or A/D, Space, G, hold/release F in separate practice.
  Camera rounds ignore practice input. JA/EN, BGM/SFX, pause, RETRY/NEXT/SHARE,
  feed discovery and cleanup use the existing platform.

## Ownership and assets

Input design follows the lab's Camera Input Law. Ranks below describe the
design choice, not measured recognition accuracy:

| Input | Design rank | Success action | Recovery |
| --- | --- | --- | --- |
| LEFT/RIGHT DODGE | S | Move nose >=28% of calibrated shoulder width from attack aim | Face back in view; automatic stable recovery |
| PUNCH | B | Extend a calibrated arm quickly; wrist velocity plus extension | Retract wrist, then punch; reset velocity after loss |
| GUARD | B | Both wrists near the cheeks | Bring both hands back in view |

Game rules: `src/counterCam/core.js`; pose/motion: `src/counterCam/pose.js`;
camera lifecycle: `src/input/counterCamInput.js`; presentation/rendering:
`src/counterCam/`. Shared BodyInput owns front-camera permission, cancellation,
GPU/CPU fallback and teardown. Shared CreatorMode owns bounded temporary
frame capture; game presentation selects and plays the counter clip.

Imagegen's built-in tool generated the transparent robot and portrait cover.
Original PNGs, optimized WebP assets, both exact prompts and license provenance
are recorded in [counter-cam-assets.json](counter-cam-assets.json).
BGM is existing OpenTracks `8-bit Aggressive1` / もっぴーさうんど, rechecked
2026-10-04 and delivered through its lazy inline JS audio module. Shared
Kenney Impact Sounds are CC0; original tones provide warning/dodge/guard cues.

## Verification

- `npm test`: 408/408 passed, including 11 counter rules/pose/highlight tests.
- Final affected suites: `node --test test/counterCam.test.js
  test/platform.test.js test/gameMusic.test.js`: 34/34 passed.
- `npm run build`: passed. Existing large lazy-audio chunk warning remains.
- Publication snapshot, based on `c52290b` plus only COUNTER CAM changes:
  395/395 tests and `npm run build` passed. Concurrent, uncommitted POSE WALL
  changes are excluded from this release, accounting for the smaller test count.
- `scripts/qa/counter-cam.js`: 31 browser checks, including 360×800, 390×844
  and 1440×900, actual practice controls through perfect KO/retry/guard,
  generated asset loading, mobile controls fitting, lifecycle and JA/EN.
- `scripts/qa/counter-cam-camera.js`: 21 synthetic-camera checks with real
  canvas MediaStream tracks: distance, camera-only input, landmarks to counter,
  missing wrists, HIDE, recovery, charged mega, denial and late permission cancellation.
- `scripts/qa/counter-cam-model.js`: real PoseLandmarker Lite + WASM on GPU;
  first inference 3561ms, warm 10/10/8ms on this host. Canvas input intentionally
  detects no person. This verifies model execution, not camera accuracy.
- `scripts/qa/counter-cam-export.js`: real MediaRecorder produced a 6.939-second
  270×480 VP9 WebM, 169131 bytes, video-only. FFmpeg decoded it successfully
  with the source millisecond timebase.
- `scripts/qa/counter-cam-production.js`: 12 checks passed on built assets at
  `127.0.0.1:4173`: alias, preview, sensor-free entry, tutorial, mobile canvas
  and controls, guarded 30-second TIME UP, measured result, retry and feed.
  This runs in a fresh CLI browser context with service workers blocked to
  avoid an older PWA reloading the timing test after a new local build. Open
  with `npx --no-install @playwright/cli -s=counterprod open
  http://127.0.0.1:4173/#counter-cam --browser=chrome
  --config=scripts/qa/counter-cam-production.config.json`, then run
  `npx --no-install @playwright/cli -s=counterprod run-code
  --filename=scripts/qa/counter-cam-production.js`.
- Screenshots and command receipts: `output/playwright/counter-cam-*` and
  `output/counter-cam-*.txt`. Test-held keys are released between browser runs.

Physical phone accuracy, user comprehension in the first ten seconds,
comfortable five-second calibration and cross-device video saving remain
pending in [COUNTER_CAM_PLAYTEST.md](COUNTER_CAM_PLAYTEST.md).

Creator clips are silent and use 8fps source frames. Distance checks are
framing heuristics and do not measure physical arm reach. Browser simulation
does not establish human acceptance. These checks describe pre-publication
validation; publishing requires an explicit deployment operation.
