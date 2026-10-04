# EXP-016 NOTE EATER v0.2

Implemented locally on 2026-10-03 from the [provided specification](specs/EXP-016_NOTE_EATER_SPEC_v0.2.md).
Expanded on 2026-10-04 following Hiro's request for richer sound, more notes
and bigger celebrations. This direction increases the original note density;
the supplied v0.2 specification is retained as the original brief.
After public play feedback, density was reduced from 8–12 to 5–7 notes on
2026-10-04, with the opening choices spread across the stage. Rich audio and
celebration effects are retained.
Open the built preview at `http://127.0.0.1:4173/#/game/solo-note-eater`
or the dev view at `http://127.0.0.1:5173/#/game/solo-note-eater` (`#note-eater` also works).
It also appears in Feed and Explore. Publishing uses the existing
`camera-game-lab` Cloudflare Workers Static Assets target in `wrangler.jsonc`
through `npm run deploy`.

## Playable implementation

- One front-camera stream, on-device Face Landmarker, face-center XY and
  mouth OPEN / CLOSED / UNKNOWN only. No microphone, pitch recognition or hands.
  Shared camera cancellation, GPU-to-CPU fallback and teardown are reused.
- Aspect-correct lip gap, hysteresis (.24 open / .12 closed), short 45/65ms
  state holds. Unknown/stale/ambiguous input disarms acquisition and never
  counts as CLOSED. Returning closed re-arms automatically.
- A single forgiving first note, a bite with immediate sound, 3/2/1, then
  exactly 30 active seconds. The tutorial note is excluded from round metrics.
- Five spaced opening choices, growing to six/seven as max GROOVE crosses
  40/80. Each wave includes all five colored shapes mapped to C/D/E/G/A;
  one opening choice starts within reach. Density stays at the attained level
  when groove decays, and eaten/passed notes are replenished immediately.
  Radius is mouth width ×2.25 with practical bounds; wider magnet assistance
  pulls nearby notes, adds a halo and enlarges them. Each eat takes the nearest
  eligible choice and requires another CLOSE before the next eat.
- Bite sound starts four marimba/bell layers at AudioContext.currentTime,
  without beat quantization, followed by two short stereo echoes. The shape
  accelerates into the mouth, shrinks, vanishes and emits double waves,
  18–30 colorful confetti pieces and a floating PAK! label.
  Passed notes sound quietly; no MISS, punishment, ranks or combo resets.
- GROOVE 0–100 rises with bites and decays gradually. At 110 BPM, kick/shaker,
  bouncy bass, noise hi-hat/clap, warm pentatonic chords and an arpeggio join
  at thresholds 0/20/40/60/80. A compressor provides mix headroom. Fixed
  soundtrack integration is explicitly excluded through `audioStrategy`.
- Note trails, drifting musical symbols and soft colored light fill the scene.
  First-time groove stage increases launch side confetti and one clear title;
  groove 80 adds a rainbow meter and party frame. Recent visual effects are
  capped at eight. Reduced motion uses static rings and labels, without
  decorative trails, flying confetti, rotating rays or drifting symbols.
- Result records notes eaten, max groove, unique types and the complete
  ordered melody. YOUR MELODY waits for audio activation, replays in the same
  order with the same layered instrument, and can stop. RETRY, NEXT, SHARE
  and JA/EN use the shared shell.
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

- `npm test`: 359/359 pass on 2026-10-04, including 19 NOTE EATER
  rule/input/audio checks. Covers full density, reachable choices, one bite
  per opening, ordered replay, unquantized attack and cancellation of echoes.
- `npm run build`: Vite/PWA builds; game and presentation remain lazy-loaded.
- `scripts/qa/note-eater.js`: 43 browser assertions across 390×844, 360×800,
  360×500 and 1440×900, including actual public practice controls, pixel
  evidence, full round, exact melody ordering through Web Audio, pause,
  sound, locale, receipts, retry and discovery. High-groove scenes are checked
  at mobile and desktop sizes; the seven-note limit and party styling are verified.
- `scripts/qa/note-eater-camera.js`: 35 assertions; actual browser-owned camera tracks with
  synthetic landmarks exercise the real input/controller lifecycle, recovery,
  ambiguous faces, permission failure, retry and all Creator face modes.
- `scripts/qa/note-eater-production.js`: 10 assertions through the built bundle,
  including CDP touch drag/bite, round completion, melody, retry and desktop layout.
- `scripts/qa/note-eater-party.js`: 10 assertions using the actual Web Audio
  graph in OfflineAudioContext plus the reduced-motion practice view. In the
  sampled dense mix, peak amplitude was about 0.32 with no clipped/non-finite
  samples; high groove added energy and high-frequency detail. Stopping before
  playback canceled all scheduled sound. This is waveform evidence, not a
  human listening or physical device latency test.
- Screenshots are in `output/playwright/note-eater-*.png` (ignored QA output).

The mix uses the browser's
[DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode).
Stereo echoes are separately tracked voices so pause, result, mute and exit
can silence them along with the lead and percussion.

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
