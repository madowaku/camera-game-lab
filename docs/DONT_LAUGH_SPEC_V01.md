# EXP-055 DON’T LAUGH — implemented MVP

15 seconds of keeping a straight face while your camera image becomes the joke.
Canonical route: `#/game/solo-dont-laugh`; aliases: `#dont-laugh`, `#dontLaugh`.

- NORMAL only. One front camera, one player, no microphone. JA/EN.
- PLAY opens calibration. A relaxed closed mouth for 800ms establishes the
  player's neutral proportions. START gives a full 3–2–1 countdown before the
  active 15-second clock. Recalibration is available before starting.
- MediaPipe FaceLandmarker supplies mouth corners, lip opening, cheek squint,
  eye narrowing and mouth-smile blendshapes. Ratios correct for image aspect,
  distance and head roll. The smoothed internal signal is 0–100; the player sees
  SAFE, STEADY or DANGER. Score >=64 for 400 continuous ms loses. Opening the mouth
  or blinking alone cannot reach that threshold. These are initial tuning values.
- The visible portrait cover crop also defines valid framing. Missing, multiple,
  too-small or cropped faces pause time; inference older than 200ms is invalid.
  Recovery requires 250ms of stable observations. Pauses discard partial smile
  holds and the previous replay segment. App blur and backgrounding pause play.
- 0–5s: bird, long eyebrows, enlarged nose and an absurd title. 5–10s: a
  500ms-delayed face, shoulder clones, mirror reversal and mouth-triggered SE.
  10–12s: taunts and more clones. 12–15s is FINAL ATTACK with five self clones,
  face effects, sound and the final 3–2–1. Reduced motion omits screen rays,
  rotating clones and rapid mirror switching.
- On defeat: freeze immediately, CAUGHT YOU, exact time and the caught face.
  On success: SURVIVED, 15.00 SEC. A roughly 1.5-second rolling replay plays
  automatically and freezes on the final frame. Early defeats show the available
  portion. Canvas memory is bounded to 24 frames at 270x480.
- PLAY also has a temporary still and visual replay. CREATOR adds an optional
  three-second silent video export with the final frame and score. ORIGINAL,
  EFFECT (pixel face) and HIDE (illustrated face) are available. HIDE never draws
  camera pixels into snapshots, delayed-face buffers or exported frames.
- Best times are separate for camera and practice. Sharing describes the actual
  time and labels practice. Only numeric best times and attack reactions go into
  local storage. No face/video uploads, permanent recording or microphone input.
- A small local adaptive prototype remembers the rise in the smile signal by
  attack group. At least two observations averaging a rise greater than 18 select
  the strongest group; two later attack slots repeat it next round. This is a
  transparent numeric preference, not a learned model or identity profile.
- Camera-free practice uses an illustrated player. Hold the Laugh button or L to
  simulate a smile. The same 400ms rule applies. Space or the pause button pauses.

HARD / IMPOSSIBLE unlocking and DUO FACE-OFF are subsequent phases, matching the
proposal's MVP boundary. DUO is not advertised as playable. The planned DUO is
two five-second attacker/defender turns using face, voice and upper body, with
no touching. Its multi-face judgment and microphone UX need a separate design.

Assets and exact generation prompts: `dont-laugh-assets.json` and
`dont-laugh-image-prompts.txt`. Human/device checks: `DONT_LAUGH_PLAYTEST.md`.
