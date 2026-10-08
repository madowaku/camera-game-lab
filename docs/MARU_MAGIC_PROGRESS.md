# EXP-062 MARU MAGIC / まる召喚

Open `#/game/solo-maru-magic`, `#maru-magic` or `#maru`.
Local development: http://localhost:5173/?debug=1#/game/solo-maru-magic

SOLO MVP includes front-camera fingertip drawing, explicit hold/READY cues, automatic
loop completion, an 8-second input timeout, four Imagegen spirits, tier-specific audio,
touch practice, JA/EN, pause/recovery, best score and independently qualified fastest time.
In camera play, holding the fingertip over AGAIN for 700ms also starts the next attempt;
the progress bar shows the dwell, while movement, departure or loss cancels it.
After retry, the finger must leave the retry button; only then can a fresh 0.3-second
hold at the user's chosen location arm the next circle. The retry button is never
used as the circle's start point.
Retry is immediately available inside the summon canvas and below the score breakdown.

## Implementation

`src/maruMagic/core.js`: dependency-free geometry and state machine. Scores depend only
on screen-space coordinates. Spatial resampling avoids density weighting from pauses
or variable capture rates. Circle fitting, radial error, closure and heading changes
produce 75/15/10 components; winding/coverage/size/reversal/multiple-loop guards cap
malformed shapes. Identical coordinate sequences score identically for camera and touch.

`input.js`: shared camera lifecycle, Hand Landmarker in VIDEO mode, landmark 8,
single mirrored cover-crop projection into a square. Brief gaps retain the stroke;
long/unsafe gaps reset without assigning a score. No microphone, recording or upload.

`scene.js`: shared Phaser runtime, smoothed light ink, filling readiness cursor, four
atlas frames, summon motion/rings and shared confetti. The original coordinates remain
the scoring source. Reduced motion removes summon movement. The same renderer is
retained between local retries and disposed on exit.

`view.js`: DOM instructions, numeric feedback, stage-level immediate retry, locale,
permission failure recovery, local numeric records and optional local trial export.
The shared shell remains in an untimed session so every summon can retry without
reopening the camera. Internal summon results do not invoke the shell's timed-round
result screen. During results, camera inference only updates the cursor and retry dwell;
it never modifies the finished score. Pause suspends inference. The stream is reused for
the next attempt. Backgrounding resets incomplete strokes without scoring.

Assets: [manifest with exact Imagegen prompt, sources, licenses and hashes](maru-magic-assets.json).
One 1254×1254 RGBA atlas, encoded to a 388,542-byte alpha WebP. The final atlas is
`src/maruMagic/assets/spirits-v1.webp`. Original generation remains in the Imagegen output.
Kenney CC0 book/coins samples come from `C:\Dev\AssetsShared`.
OpenTracks BGM reuses the existing converted inline HAND SPELL track; site and
creator conditions rechecked 2026-10-08. Synthesized READY and summon motifs are original.

## Verification

- `npm test`: 641/641 passed on the release source, including 27 new MARU tests. Covers perfect circles,
  ellipses, arcs, lines, tiny circles, scribbles, reverse/multiple turns, anomalous
  points, variable sampling, source/time independence, projection, preparation,
  automatic ending, timeout, short/long loss, pause, independent records and stable
  retry dwell versus passing, movement and lost input, plus choosing a fresh start
  position after retry instead of arming at the button.
- `npm run build`: production compilation and service-worker generation passed.
- `scripts/qa/maru-magic.js`: desktop/mobile launch, five actual pointer-drawn
  circles, renderer reuse, saved records, in-canvas retry, timeout, Japanese/English,
  pause, front-camera constraints, denial/cleanup, recovery and fingertip retry with synthetic camera
  stream/landmarks. Browser assertions are distinct from physical hand accuracy.
- Desktop 1440×900 and mobile 390×844 / 360×800 layouts inspected. No horizontal
  overflow. Spirit sprites and the finished summon scene inspected from screenshots.
- Browser evidence: ignored `output/maru-magic/`.

## A401OP — 2026-10-08

USB device A401OP was connected by the user. Chrome used `adb reverse` for localhost
and the real front camera/model. Secure context and MediaDevices available; 360 CSS
pixel width, no horizontal overflow. Camera stream has no audio tracks.

Eight human-drawn circles completed automatically: **67, 77, 82, 69, 51, 81, 78, 80**.
This includes both frog and star bands and five consecutive completions without
reopening the camera. Timings, raw coordinates and component scores are saved locally
in ignored `output/maru-magic/a401op-trials-v01.json`, without camera images.

User feedback: preparation/READY was difficult to understand. The original subtle
green cursor was replaced with explicit hold text, a filling ring/bar, a large mint
READY message and a short chime. The READY text now updates in the same callback as
the sound. A second retry button inside the canvas avoids scrolling after a summon.
The revised build was opened on the same device. Best score is retained across reloads.
The user confirmed the new preparation is easier to understand, then requested a
touch-free retry. This added 700ms fingertip dwell on the stage's AGAIN button, with
visible progress and cancellation on departure, large movement, loss or pause.

These observations establish functioning physical input and repeatability; they do
not establish population-level score calibration, sustained Android FPS/thermal
behavior, or broad user agreement with scoring. Score bands remain provisional.
The revised preparation cues have user confirmation. The user tested fingertip retry
and identified that it immediately prepared a circle at the retry button. The next
revision adds an explicit reposition step: leave the button, choose a start point,
hold there, then draw. Unit and browser checks verify this start-point isolation.

## Phone regression checklist

1. Prop up the phone; show an index finger. Confirm the hold instruction appears.
2. Stop briefly; watch the ring fill and hear READY. Move to begin.
3. Draw five circles; verify automatic completion near the green starting mark.
4. Judge shape/score agreement and component explanations. Use `?debug=1` to
   export numeric trials if tuning is needed; do not save camera imagery.
5. Briefly hide the hand, then return. Hide longer than 0.55s: no unfair score.
6. Tap the stage's AGAIN button, or hold the fingertip over it for 0.7s. A brief
   pass-through must not retry. Move to a chosen start point and hold there for READY;
   verify the next stroke starts there. Confirm this without touching the phone.
7. Pause, background, switch language, exit and re-enter. Camera/microphone indicators
   should be correct; no stale stroke should be submitted.

## Release

Deploy with the existing `wrangler.jsonc` Workers Static Assets configuration.
Build the committed source, run the relevant checks, then publish with Wrangler.
Local trial exports and camera screenshots under `output/` are excluded from releases.
