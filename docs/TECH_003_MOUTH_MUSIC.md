# TECH-003 MOUTH MUSIC v0.1

Implemented 2026-10-05. Tone.js remains an **experimental optional layer**.
No automatic ADOPT verdict: the user's success condition is that eating musical
notes is clearly more enjoyable than playing ordinary SE.

## Open and play

- Canonical route: `#/game/tech-mouth-music`; alias: `#mouth-music`.
- PLAY unlocks sound in the click handler and starts the existing front-camera
  face input. Practice uses tap / Space and drag / arrows, without camera/model access.
- Close, wait for shapes to approach the mouth, open once to eat. Hold-open
  never repeats. Close again to rearm. A missing/cropped/multiple/stale face
  pauses time and music; it does not count as CLOSED.
- A valid input starts 3–2–1, then 30 seconds of active play. Shapes home toward
  the current mouth, with a generous collision circle and 650 ms arrival window.
  Large head movements are unnecessary.
- 0–5 s: single shapes. 5–15 s: faster singles. 15–25 s: pairs.
  25–30 s: alternating pairs/triads for FINALE.
- ● / ▲ / ◆ / ★ / ♥ correspond internally to C4 / D4 / E4 / G4 / A4.
  Pitch names do not appear in the playfield. Nearby shapes are consumed in one
  BITE and dispatched to PolySynth together. Two-plus shapes count as CHORD;
  three-plus also count as TRIAD. A short ripple/particle burst comes from the
  mouth, without camera or screen shake. Reduced motion limits expansion.
- Successful **bites** build the streak: 5 adds bass, 10 hi-hat, 15 harmony,
  20 sparkle. Expired notes silently reset the streak. No MISS message,
  penalty sound or points. Results show actual NOTES, CHORDS and TRIADS.
- Result LISTEN replays the player's captured note/chord timing. PLAY AGAIN
  resets the round; NEXT/SHARE use the existing shell.

## Small implementation and boundaries

Five files in `src/mouthMusic`: pure simulation (`core.js`), Tone ownership
(`audio.js`), input/DOM/Canvas adapter (`view.js`), launch/result/validation
(`presentation.js`), and local CSS (`style.css`). Registry and motion metadata
are the only platform integrations. Existing NOTE EATER gameplay is untouched.

The view subclasses existing `NoteEaterInput` only for 640×480 camera constraints
and inference timing. Existing face geometry, open/close hysteresis (OPEN ≥.24,
CLOSED ≤.12), short stability holds, 20 Hz inference cap, CPU fallback,
camera cancellation and mirrored object-fit-cover projection are reused.
No second MediaPipe model, microphone, recorder, Three or Phaser runtime.
Canvas2D is sufficient for this Tone experiment; the ongoing Phaser pilot is
independent. Simulation owns collisions, timers and musical progression.

Tone.js **15.1.22**, MIT, is pinned and bundled locally in this route's lazy
module. A new `Tone.Context({ latencyHint: 'interactive', lookAhead: .06 })` is
created only on PLAY/practice/replay. `Tone.start()` executes before awaiting
camera/model setup, as recommended by the [official Tone.js start guidance](https://github.com/Tonejs/Tone.js#starting-audio).

Player graph: `PolySynth → Filter → Reverb → Limiter → Gain → Destination`.
Triangle lead, short attack/release, small reverb, bounded 12 voices. Quiet
100 BPM accompaniment uses the owned context's Transport and forwards the
callback's audio timestamp to each synth. Kick and C/E/G chord on beats 1/3;
progression layers stay pentatonic. Live bites use `Tone.immediate()` to bypass
Transport lookAhead and are never quantized, following [Tone's latency guidance](https://github.com/Tonejs/Tone.js/wiki/Performance).

PAUSE, tracking loss and backgrounding freeze the simulation and mute/pause
Transport. Resume after background/audio interruption is an explicit tap,
which resumes AudioContext and disarms held-open input. Result/exit/retry
dispose synths, Transport scheduling, context/ticker, camera/model, RAF and
activation event handlers. Result replay owns a separate click-created context
and stops on blur/hidden/route change. Leaving clears the cached melody.

## Compare and measure

- MUSIC: pentatonic player instrument plus growing backing.
- SIMPLE SE: the same successful bite triggers one fixed short beep; no music
  accompaniment/harmony/sparkle. This compares musical behavior with ordinary
  SE using the same device/audio pipeline.
- SOUND OFF: silent play. BACKING OFF: isolate the player instrument.
- PERFORMANCE (or `?debug=1`) shows render/input FPS, last inference duration,
  view frame cost, frame-timestamp-to-audio-dispatch time, browser base/output
  latency where exposed, active shape count and lead voice count.

These values are **processing/API estimates**, not physical mouth-to-ear
measurement or proof of Android reliability. Existing mouth stability holds
and camera capture/display latency are part of the total experience. Bluetooth
and device speaker latency require a physical playtest. Practice reports INPUT
PRACTICE, rather than inventing recognition FPS.

Result TECH VALIDATION has eight YES/NO/UNTESTED questions, including the SE
comparison, plus manually selected PENDING / ADOPT / TRY AGAIN / PARK and notes.
Save stores the last 30 records in localStorage key
`camera-game-lab-tech-003-validation`: numeric result/performance, source,
comparison mode/settings, user agent, timestamp and feedback. No images,
landmarks or melody are persisted. Storage failure is reported inline.
Untested physical/device questions remain untested by default.

## Verification

- `npm test`: 498 tests passed, including 8 new tests covering held-open BITE,
  unknown/pause recovery, chord collisions, silent misses/streak progression,
  countdown, staged spawning and exactly 30 seconds.
- `npm run build`: production build and service worker generation passed.
- Browser QA: **32 checks passed, zero browser errors** across
  `scripts/qa/mouth-music.js` (22) and `scripts/qa/mouth-music-input.js` (10).
  Covers click audio unlock, real audio waveform, 100 BPM Transport,
  MUSIC/SE/silence/backing controls, hold prevention, active-time pause,
  natural CHORD/TRIAD/SPARKLE, melody replay, pending local verdict,
  three retries and full teardown. At 360×800 and 720×1280, no horizontal
  overflow, capped Canvas DPR and an on-screen practice BITE control.
  Synthetic face landmarks also go through the existing mouth geometry,
  hysteresis and cover projection into the real Tone graph; loss, multiple
  faces, open-mouth reacquisition, denied-camera recovery and explicit audio
  resume pass. This does not verify physical model recognition or Android.
- Browser logs: `output/mouth-music-browser.log`,
  `output/mouth-music-input.log`. Test/build logs use the same prefix.
  Screenshots: `output/playwright/mouth-music-{entry-360,play-360,play-720,result}.png`.

## Physical and subjective gates — pending

1. Android Chrome, portrait: five complete rounds, then retry/leave/re-enter.
   Compare recognition FPS and inference/frame cost with music on/off.
2. Use device speakers and close/open naturally: does the sound feel attached
   to the bite? Record delay impressions; use external audiovisual measurement
   if a mouth-to-ear number is needed.
3. Compare MUSIC, SIMPLE SE and silence with the same note patterns; record
   whether random play is musical and combo progression is rewarding.
4. Test held-open, face lost/recovered, permission denial, tab/background,
   AudioContext interruption, rotation and other audio playback on the phone.
5. Select ADOPT only after the four technical goals and the musical experience
   condition are satisfied. Otherwise TRY AGAIN (timbre/latency) or PARK.

No deployment or adoption decision is included in this implementation request.
