# EXP-050 HUMAN CLOCK — v0.1

Specification implemented on 2026-10-04. Canonical ID: `solo-human-clock`.
The display number is also used by COUNTER CAM; routing uses independent IDs.

## Authoritative input clarification

The original proposal measured clock center → fingertip. Hiro clarified with
a two-hand sketch and explicitly chose **index knuckle → fingertip direction**.
The final implementation follows that choice. Each index finger itself becomes
a clock hand. Moving the hand around without changing the finger direction
does not change the answer. The upper-body shoulder center positions the dial;
it is not the origin of the input angle.

## Round and judging

- Left anatomical index finger = hour; right anatomical index finger = minute.
- Both angles use the mirrored camera image, with twelve at −90 degrees.
- `hourAngle = (hour % 12) × 30 + minutes × 0.5 − 90`.
- `minuteAngle = minutes × 6 − 90`; circular errors wrap at 360 degrees.
- Both raw and smoothed directions must be within ±12 degrees for 400ms.
- 3:40 requires the hour hand at 20 degrees and minute hand at 150 degrees.
- A bent or end-on index finger is unavailable. Projected knuckle-to-tip length
  must be at least 14 stage pixels, with endpoint/path ratio at least 0.84.
- Losing a finger, a required upper-body point, or a fresh inference resets the
  partial hold and pauses the 30-second active clock. Recovery needs 250ms of
  stable input and a fresh hold. Manual pause/hidden tab also clears the hold.
- A delayed game frame over 150ms cannot award a hold. The 30-second deadline
  is checked before scoring, so a late completion never counts.

EASY has twelve shuffled five-minute questions and keeps all twelve numerals.
NORMAL has twenty five-minute questions and switches to ticks after three
completed clocks. Both modes judge the real, interpolated hour angle. A new
deck avoids an immediate repeat across the shuffle boundary.

Every correct clock scores +1 TIME and briefly folds the digital target into a
small analog clock. Fingertips glow, the dial flashes and a Kenney tick/chime
plays. TICK → TICK TOCK → ON TIME → PERFECT TIME is a consecutive streak;
skipping breaks it. Five in a row gives a gold TIME RUSH for five active seconds,
shortening the next-question transition from 550ms to 220ms. The hold stays 400ms.

## Camera and alternative input

MediaPipe HandLandmarker tracks two hands. PoseLandmarker Lite tracks one body,
with segmentation disabled. Both run on one front-camera stream, throttled to
20Hz. Hands are assigned to the anatomical Pose wrists by proximity, so result
order and arm crossings cannot swap hour/minute. Ambiguous assignments are
unavailable. Video uses mirrored contain framing; projection uses the identical
pixel rectangle to preserve angles on portrait and landscape cameras.

Camera-free practice uses draggable pointing-finger markers, tap-to-point,
independent range sliders, A/D for hour and left/right arrows for minute. Shift
gives 0.5-degree hour / 1-degree minute steps. Camera mode ignores these inputs.
Practice results and shared challenges explicitly carry practice provenance.
RETRY keeps the source and difficulty. Results include completed clocks, actual
best streak, fastest clock and skips. NEXT returns to the discovery feed.

JA/EN, BGM/SFX toggles, reduced-motion handling, loading/error recovery and
camera/model teardown are included. Browsing and practice request no sensors
or recognition models. No microphone, recording or uploads are used.

HARD one-minute questions, BODY CLOCK and CREATOR/replay/export remain deferred,
as requested. No OpenTracks recording/export feature is added.

## Input reliability

The user-approved finger-direction input has a provisional B–C design risk:
finger straightness, foreshortening, hand occlusion and simultaneous models
need physical-device evaluation. White/yellow/green feedback, per-hand movement
guidance, readiness instructions, paused recovery and practice fallback address
these risks in the prototype. Automated checks do not establish human Input
Gates A–E. See `HUMAN_CLOCK_PLAYTEST.md`.
