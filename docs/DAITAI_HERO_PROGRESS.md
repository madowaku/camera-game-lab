# EXP-018 DAITAI HERO — prototype progress

Implements the v0.1 specification and starts with TASK-001–008. Launch from the
experiment selector or `/#daitai`.

## Playable loop

- All 12 fixed questions retain their specified left / center / right answers.
- Questions and choices support JA / EN through the existing language switch.
- Face input extends `BodyInput`, keeping MediaPipe details out of game rules.
- One stable face calibrates for three seconds; missing or multiple faces reset
  the calibration window. Camera frames stay on-device.
- Left / right require a continuous 180ms hold. A center answer needs a nod:
  lower your head slightly, then return to the calibrated forward-facing pose.
  Standing still at center never answers. Returning from an outer zone also
  never accidentally submits a center answer.
- An answered question stays locked for feedback and a stable neutral return.
  Face loss clears the hold, pauses the timer, and requires neutral on recovery.
- Tap / mouse / 1–2–3 keyboard answers use the same submission and scoring path.
  The tap option is available before camera use, during loading, and after a
  permission error. Switching to tap during a round preserves its score.

Supporting tasks needed for the playable prototype are also connected: shuffled
question cycles, a three-second start countdown, a 30-second active-play timer,
correct/wrong feedback, response-time scoring, combo, results and replay. Results
include correct/total, accuracy, average/fastest answer and max combo. Logs are
in memory only. No RPG progression or account system is added.

## Tuning

`src/input/faceZones.js`: threshold 0.12, hysteresis 0.02, neutral radius 0.045,
calibration 3000ms, stale-frame limit 300ms.

`src/input/headNod.js`: calibrated pitch, downward threshold 12°, upright band
±5°, 80ms down / return holds, 120ms upright rearming, 1400ms nod window.
Missing or multiple faces, stale frames and sideways motion cancel a nod.
MediaPipe's face transform supplies head rotation separately from translation.

`src/games/daitaiHero.js`: side-answer and neutral holds 180ms, feedback 550ms,
countdown 3000ms, round 30000ms. Correct answers score 100 plus the specified
speed bonus; the optional combo bonus is omitted.

## Verification

Run `node --test test/daitaiHero.test.js test/daitaiNod.test.js`, `npm test`, and `npm run build`.
The focused tests cover the dataset, localization, mirrored direction,
calibration, stale frames, multiple faces, threshold hysteresis, calibrated nods,
duplicate-event locks, aborted side movement, tracking recovery, all 12 answers,
30-second expiry and reset on replay.

Browser verification artifacts and the temporary QA script live in the ignored
`output/playwright/` directory. Automated rounds use controlled browser time;
camera denial is simulated. They do not establish whether face play is more fun
than tapping or validate physical camera tracking on Android.

Verified: five browser rounds covering all 12 questions, answer lock and result
counts, replay reset, language switching during a round, keyboard play and the
camera-denial fallback. Layout checks cover 360×800, 720×1280, 1440×900 and
800×360, reduced motion and 150% text size. The 360px question area reserves
space for the longer English probability prompts.

Earlier synthetic face signals passed the browser UI flow for calibration,
side and the previous center gesture, neutral return, tracking loss/recovery,
round expiry, disabled
retry with a missing face, and switching to tap. No actual face or camera frames
were used in these automated checks.

2026-10-04 nod update: all 355 unit tests and the production build pass. The
repeatable `scripts/qa/daitai-nod.js` browser flow passes 49 checks, including ten
consecutive center nods, one-shot delivery, side returns, face loss / recovery,
two-face pauses, tap / keyboard fallback and results. JA / EN layouts fit
390×844, 360×500 and 1440×900 with no label overlap, browser exceptions or failed
resources. These checks use synthetic model results and a canvas camera stream;
physical-camera recognition and gesture thresholds still require a human trial.

Matrix layout is checked against MediaPipe's
[matrix format](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/framework/formats/matrix_data.proto)
and [web result adapter](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/face_landmarker/face_landmarker.ts).

## Human playtest still required

Run at least five rounds on Android Chrome with a real front camera. Check ten
consecutive intended face answers, central-choice motion, turning without
translating, moving nearer/farther, lighting changes, a second face entering,
tracking loss, natural 1–3 second decision times, and whether replay feels good.
Record accidental answers and compare a tap round with a face round before
expanding the game.
