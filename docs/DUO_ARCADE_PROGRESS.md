# DUO ARCADE implementation / playtest handoff

Updated: 2026-10-02 (Asia/Tokyo)

Sources: [implementation task](specs/DUO_ARCADE_IMPLEMENTATION_TASK_v0.1.md),
[input foundation](specs/DUO_INPUT_FOUNDATION_SPEC_v0.1.md).

Human gate protocol: [TINY BOT DUEL Human Playtest Pass v0.1](TINY_BOT_DUEL_HUMAN_PLAYTEST_PASS_v0.1.md),
added upstream in commit `168dffdde9f1fed82310590b2fe85034ced6a8b5`.
Use its five-round sequence and GO / GO WITH FIXES / HOLD verdict after observing
two real players. The template is still blank; it is not a passed test receipt.

## Current scope

TASK-001–008, 013–016 are implemented for the foundation and EXP-020.
TASK-009 and 017 need physical camera playtests; the full TASK-018 acceptance
gate has not passed. EXP-021–023 have JA/EN catalog names/instructions and no
playable implementation yet. They must reuse the input contract after the gate.

The first playable is a horizontal robot duel: move → shoot → knockback →
ring out/time limit → result → rematch. A 30-second time limit produces a draw
if neither player rings out. Early ring-out ends a round immediately.

## Code boundaries

| Module | Responsibility |
| --- | --- |
| `src/input/duoConfig.js` | Camera thresholds, 800ms lost grace, 5s recovery prompt, 20Hz inference target, calibration and mouth hysteresis |
| `src/input/duoFaceInput.js` | MediaPipe adapter, two faces, mirrored screen coordinates, landscape camera constraints, GPU/CPU shared lifecycle |
| `src/input/frontCamera.js` | Require front-facing camera, validate returned track, preserve PC webcam compatibility and release rejected/cancelled streams |
| `src/input/duoTracker.js` | Global position/velocity/scale matching, reserved player slots, stable neutral calibration, normalized state/events |
| `src/input/duoEmulator.js` | Same contract from keyboard/multiple touch pointers; one action per press |
| `src/duo/duoArcade.js` | Shared canvas shell, countdown, immediate loss pause, manual pause, result/retry, recalibration, camera failure fallback |
| `src/games/tinyBotDuel.js` | Deterministic game rules and canvas drawing; no MediaPipe data |
| `src/duo/audio.js`, `telemetry.js` | Optional synthesized feedback and local-only round receipts |

Normalized players have `id`, `trackId`, `present`, `lost`, `lostMs`,
`calibrated`, `faceX`, `faceY`, `faceScale`, `tilt`, `mouthOpen`,
`mouthValue`, `eyesClosed`, `confidence`. Face X/Y and tilt are relative to
each player's neutral pose, clamped to -1…1; face scale is a ratio to neutral.
`center`, `box` and `neutral` are normalized debug metadata. Confidence currently
means valid tracked presence (1) or absent (0), not a probability estimate.

Discrete events have `{ type, playerId, timestamp }`: `MOUTH_OPEN_START`,
`MOUTH_OPEN_END`, `PLAYER_LOST`, `PLAYER_RETURNED`. Fallback events omit the
timestamp; games must not depend on camera timing. Consume events once per
render frame, including while paused, so stale shots never replay on recovery.
The shared shell gates countdown/game updates on BOTH present calibrated players.

P1/P2 start by screen side and remain tied to their original tracks until the
input session resets. Recalibration preserves track identity. Ambiguous matches
freeze controls and increment a suspicion counter. Camera stop/restart assigns
fresh slots. Position/scale tracking cannot certify identity through prolonged
complete occlusion or replacement by another person; suspicion telemetry is a
heuristic, not proof that no swap happened.

## Verification evidence

- `npm test`: 40 passing checks covering 30 seconds of reordered/jittered
  detections, crossings (same/different scale), occlusion, stale video, ambiguity,
  per-player calibration, hysteresis/return re-arming, touch independence,
  collision/knockback/ring-out, paused simulation, five synthetic timed rounds,
  rolling FPS/stalls, recovery counting, JSON export, storage limits/failures and
  ensuring that successful synthetic records never generate a human GO verdict.
  Camera selection checks cover exact front-camera requests, rear-camera
  rejection, metadata-free PC webcams, permission denial and cancelled starts.
  A local UI fixture simulating front-camera unavailability verified JA at
  800×360, EN at 390×844 and switching to touch input after the error, with no
  console errors. This fixture does not use the Android camera hardware.
- `npm run build`: production JS/CSS and PWA build pass. PWA orientation is
  `any` so both the existing solo portrait modes and duo landscape can rotate.
- In-app browser: 800×360 and 1280×720 canvas, independent touch shots,
  countdown, pause/resume (timer stayed fixed), P1 ring-out win, result statistics
  and local telemetry verified. A full 30-second timed draw and rematch reset
  were also verified. At 800×360, gameplay and controls fit without
  horizontal or vertical scrolling. The 390×844 portrait fallback is checked as
  a secondary responsive layout, with a landscape hint.
- Production preview on a dedicated port: direct `/#duo` entry, countdown and
  playable fallback verified; no console errors/warnings and no debug toggle.
  Returning to each existing solo mode and JA/EN switching were also checked.
- Screenshots: ignored local artifacts in `output/playwright/`.
- Human-playtest recording additions: JA/EN duration/recovery/minimum-FPS
  displays verified in the browser. The JSON save button produced a local file
  with the completed 30-second fallback receipt, preserved input source and
  `humanVerdict: NOT_RECORDED`; no human camera-gate result was inferred.
- Connected Android: A401OP, Android 15, 1080×2412 physical display.
  USB reverse mapping for port 5173 is ready. No two-person camera gate is
  claimed; Android browser automation was blocked by the browser URL policy.

## Android USB playtest

2026-10-02 camera-selection fix: plain `facingMode: "user"` was a preference,
which could still allow a rear camera. The shared input lifecycle now requests
`facingMode: { exact: "user" }` and validates the returned track's settings /
capabilities before attaching video. A facing-mode-only constraint failure can
retry for PC webcams without direction metadata; identified rear cameras are
stopped and rejected. Other permission / device errors do not trigger that retry.
An unavailable front camera shows a specific JA/EN message. The reported Android
selection failure still needs a physical retest after this change; automated
camera-selection tests do not prove the A401OP opened its actual front lens.

With the development server running, the connected Android can open:

```text
http://127.0.0.1:5173/#duo
```

If USB reconnects, restore the mapping:

```powershell
& 'C:\Users\hiro\AppData\Local\Android\Sdk\platform-tools\adb.exe' reverse tcp:5173 tcp:5173
```

Follow the linked Human Playtest Pass for the full five-round procedure. Quick setup:

1. Turn the phone sideways. Press the two-player camera button; allow camera
   permission on the phone. Model/WASM downloads need a network on first use.
2. Put two people in the frame, P1 on screen-left and P2 on screen-right.
   Keep mouths closed and faces still until BOTH PLAYERS READY appears.
3. Start the duel. Each player deliberately moves left/right and opens/closes
   their mouth to fire independently. Use gentle movement; no extreme leaning.
4. Cover one face briefly. Both robots and the timer should freeze; the
   missing player retains the same label on return. After a longer absence,
   recalibration/fallback stays reachable. A mouth already open on return must
   close before it can fire.
5. Repeat five consecutive rounds and inspect local records on the result
   screen. Record input source, round duration/completion, per-player actions,
   loss/swap suspicion counters, inference FPS, rematches and observed fairness.
   The camera gate needs human observation as well as counters. Synthetic and
   fallback rounds do not count toward it.

Result → **Local playtest record** now shows active round duration, successful
recoveries and minimum inference FPS alongside existing counters. **Save playtest
records as JSON** downloads the last 50 browser-local receipts with input source,
completion/abort state, player actions and timestamps. Nothing is uploaded.
If storage is unavailable, only the currently visible in-memory receipt can be
exported. Existing receipts from older code may lack the new fields (displayed
as `—`).

Recovery telemetry counts returns after the logged 800ms lost grace; shorter
occlusions can pause play without increasing either the loss or recovery counter.
Minimum inference FPS is the lowest trailing one-second frame count observed
during countdown/play, including a video stall; warm-up before the first full
second is excluded. Fallback has no inference measurement (`—`). Round duration
counts active simulation time, excluding pauses. Confirmed swaps, ghost shots,
accidental/missed shots and spontaneous replay remain human observations; the
JSON export leaves `humanVerdict` as `NOT_RECORDED`.

| Physical scenario | Status / observations |
| --- | --- |
| Two adults, five consecutive camera rounds | Pending |
| Adult + child | Pending |
| Different distances from camera | Pending |
| Glasses | Pending |
| Uneven lighting | Pending |
| Brief face occlusion | Pending |
| One player leaves/re-enters | Pending |
| Baseline Android inference stability (15–30 FPS) | Pending |

If the page cannot open, keep USB attached, confirm ADB lists the device as
`device`, and check the reverse mapping. If camera/model setup fails, choose
keyboard/touch; this verifies rules while preserving the unpassed camera gate.
