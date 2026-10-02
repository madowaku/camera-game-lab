# EXP-019 NOTE BLASTER — MVP

## Implemented scope

- Front-camera tile with MediaPipe inner-lip midpoint (13/14), mirrored cover
  projection, and bullets visibly launched at that mouth position.
- Microphone via Web Audio, 4096-sample buffer, YIN analysis at up to 25 Hz.
  Mean removal, RMS floor 0.012 and periodicity threshold reject silence/noise.
- One second of stable singing calibrates the user's Do. Major-scale offsets
  `[0, 2, 4, 5, 7]` map to Do / Re / Mi / Fa / So; no absolute pitch requirement.
  A 120 ms rolling median and 15-cent midpoint hysteresis stabilize the lane.
  PERFECT is within 30 cents, GOOD within 75 cents; other pitches do not fire.
- Five-line treble staff, C ledger line, one-HP note enemies, mouth-to-lane
  launch animation, horizontal travel, lane-specific collision and held fire.
- 30 active seconds, three lives, difficulty progression from Do/Mi to
  Do/Re/Mi to five notes. Accuracy counts unique bullets that hit / bullets
  fired, including in-flight shots when a round ends; PERFECT rate counts
  PERFECT hits / hit bullets. Missed bullets and breaches reset combo.
- Score, combo bonuses, 20-hit / five-second fever, piercing fever bullets,
  results, replay and a local voice high score. Practice never updates it.
- Japanese/English, keyboard/touch practice, reference tones, optional quiet
  hit tones, manual pause, face-loss pause, audio interruption pause and
  hidden-tab pause. Switching experiments or stopping inputs releases devices.

The lab uses vanilla JavaScript, so the new modules follow its existing stack
rather than introducing TypeScript solely for this experiment. Heavy/chord/
scale/rest enemies, boss fights, advanced voice rules and larger note ranges
remain outside the MVP.

## Design decisions

Used [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
with `music arcade game dark --design-system`: the verified style match was
Pixel Art. The game applies pixel invaders, a prominent numeric score and a
single primary action per state. The recommended generic neon palette and
Latin-only pixel fonts were adapted to a dark green/lime cabinet with legible
Japanese typography and five note colors. Text labels and spatial positions
carry the meaning along with color. Visible focus, touch targets, reflow and
reduced motion follow the skill's relevant UX guidance.

The skill and its search data were retrieved into a temporary directory for
this task, without installing a global skill or changing application packages.
No external fonts or runtime UI dependencies were added.

## Verification

- `npm test`: deterministic synthetic frequencies at 44.1/48/96 kHz, dominant
  harmonic, noise/silence, calibration interruption, smoothing/hysteresis,
  mirrored mouth cropping, sustained fire, lane collision, life loss, results,
  fever and input cancellation/teardown.
- `npm run build`: production bundle and PWA generation.
- Browser checks: desktop and mobile layout, moving canvas, keyboard/touch
  input, pause/resume, 30-second finish, rematch, cancellation, language change,
  experiment switching and permission failure.
- Layouts checked at 375×812, 390×844, 768×1024, 844×390 and 1440×900,
  including a reduced-motion pass. No horizontal page overflow was observed.
- Browser-generated 220 Hz microphone stream through the real Web Audio
  analyzer/YIN calibrated and recognized all five relative notes. Injected lip
  landmarks verified mouth launch, face-loss pause/recovery, silence gating,
  recalibration at 277 Hz and release of camera/audio tracks. These were
  synthetic fixtures, without accessing the user's physical camera or mic.
- The actual MediaPipe face model/WASM initialized and ran inference on the
  fixture video. This confirms loading, rather than human-face tracking quality.

Web Audio implementation references: [MDN time-domain samples](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData),
[Google Face Landmarker web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js).

## Physical playtest still required

1. On an HTTPS phone browser, enable front camera + mic and place your face
   in the tile. The launch ring should line up with the real mouth when moving
   gently and when rotating the phone.
2. Calibrate a low and a higher comfortable voice. Sing all five notes; verify
   detection doesn't jump octaves and Fa/Mi separation feels fair.
3. Try short syllables and held notes, in a quiet room and ordinary room noise.
   Check firing delay and whether sound effects leak back into the microphone.
4. Leave/reenter the camera frame, switch tabs, deny permission, disconnect a
   device and change experiments. Verify pause/recovery and released devices.
5. Complete a 30-second round and replay. Decide whether voice height feels
   like aiming and whether a short screen recording explains the mouth-to-note
   mechanic. Synthetic checks cannot answer these experiential questions.
