# EXP-045 HANDY PALS — MVP implementation

Implemented and verified 2026-10-03–04 (Asia/Tokyo).
Source specification: [EXP-045 v0.1](specs/EXP-045_HANDY_PALS_SPEC_v0.1.md).
Local route: `http://127.0.0.1:5173/#/game/solo-handy-pals`.
Compatibility alias: `#handy-pals`; discovery/search/share use `solo-handy-pals`.

## Playable behavior

- One person, two palms, 30 active seconds. No score, penalties or competition.
- MediaPipe Hand Landmarker (`numHands: 2`) through the existing front-camera
  lifecycle, with GPU → CPU fallback. Palm centers are mirrored and transformed
  through the same camera cover crop used for rendering. Hand labels and motion
  reserve player slots through crossings and temporary loss.
- A 350 ms two-hand hold summons the pals. The first three seconds contain POP,
  a look/lean and an automatic high-five; the player need not move to get it.
- Six broad reactions: sideways step, jump, crouch, circle turn, fast dash and
  whole-palm sparkle. Input selects animation rather than exact physical motion.
  Animation starts snap to half-second 120 BPM beats. Position smoothing has
  120 ms and 230 ms time constants; the right player moves later and smaller.
- Idle footstep/sway, greeting, curious lean, little sneeze and hop variations.
  A retained pal wobbles during about 700 ms of loss, then searches; returning
  hands recover softly. Tracking failure does not penalize or end the toy.
- Proximity high-five and closer hug with separation/rearm and cooldown.
  Timed HIGH FIVE at 10 s and SPIN at 18 s yield YEAH or ALMOST without penalties.
- POSE starts at 25 s, a 3–2–1 countdown captures a photo at 28 s, confetti follows
  and the result appears at 30 s. A close duo separates enough for both faces
  to be visible in the souvenir. Large upper-edge motions keep characters visible.
- TODAY'S DUO with a random localized title, 720 × 900 PNG, save/share and shared
  RETRY/NEXT. No audio is exported. Still photos and canvas pixels are discarded
  on departure/retry. Camera/practice provenance is retained in result and share.
- Bear/bunny selection independently on each hand, including two of the same
  species. Slot personality does not depend on species.
- Camera-free mouse/touch drag with independent simultaneous pointers, WASD for
  A, arrows for B, and movement-based practice buttons. All use the same rules.
- JA/EN, effects switch, shared BGM switch, explicit pause/resume and tab/blur pause.
  Teardown covers model, streams, audio, RAF, listeners and late permission.

## Artwork and audio

Built-in Imagegen created the transparent character atlas and portrait cover.
Final assets are in `src/handy/assets/` and `public/previews/handy-pals.webp`.
Exact prompts and processing are in [the asset manifest](handy-pals-assets.json).

[ぷかぷか by ゆうり (Yuli Audio Craft)](https://opentracks.com/bgm/detail/11821)
is 120 BPM. The [creator profile](https://opentracks.com/creator/detail/204#terms-of-use)
uses the [OpenTracks audio-source license](https://opentracks.com/help/articles/license/),
which permits commercial game BGM and editing. Source and edited SHA-256 hashes,
download page and processing settings are retained in the manifest and
`src/assets/music/LICENSE.md`. The 30-second edit is imported inline inside a
lazy JS module; there is no standalone MP3 in public/ or dist/. Effects are original
short oscillator sounds. No additional plugin or package installation was needed.

The implementation follows the [official Hand Landmarker API](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
with the project's pinned `@mediapipe/tasks-vision` 1.0.1 runtime.

## Verification

- `npm test`: 274/274 passing across the current workspace, including 13 new
  HANDY PALS cases for timing, input mapping, proximity rearm, circle recognition,
  loss recovery, slot identity, crop geometry, pause, registry and sharing.
- `npm run build`: success. Existing large music-chunk warnings remain; the
  HANDY PALS music bundle is below 500 kB. No standalone deployed audio file.
- `git diff --check`: success (Git's existing Windows line-ending notices remain).
- `scripts/qa/handy-pals.js`: 44 browser checks, screenshots at 390×844,
  320×640 and 1440×900; photo download, input, locale, mute, pause, replay and teardown.
- `scripts/qa/handy-pals-camera.js`: 20 browser checks using real browser-owned
  MediaStream tracks, synthetic landmarks and a controlled readiness stub; covers
  two-hand model options, GPU fallback, crossing, loss/recovery, denied permission,
  late permission cancellation, source preservation and teardown. This is not a
  physical webcam accuracy test.
- `scripts/qa/handy-pals-model.js`: actual external WASM and Hand Landmarker model
  loaded successfully with GPU; blank-frame inference produced zero invented hands.
  No physical camera permission was requested by this smoke check.
- `scripts/qa/handy-pals-production.js`: 12 checks against the built app at port 4173,
  using public controls, including two concurrent touchscreen pointers, photo
  download and source-preserving retry. No unhandled browser errors.

Browser scripts run through the existing `@playwright/cli` workflow:

```powershell
npx --yes @playwright/cli -s=handy-pals open http://127.0.0.1:5173/#/game/solo-handy-pals
npx --yes @playwright/cli -s=handy-pals run-code --filename=scripts/qa/handy-pals.js
npx --yes @playwright/cli -s=handy-camera open http://127.0.0.1:5173/#/game/solo-handy-pals
npx --yes @playwright/cli -s=handy-camera run-code --filename=scripts/qa/handy-pals-camera.js
npx --yes @playwright/cli -s=handy-camera run-code --filename=scripts/qa/handy-pals-model.js
npx --yes @playwright/cli -s=handy-production open http://127.0.0.1:4173/#/game/solo-handy-pals
npx --yes @playwright/cli -s=handy-production run-code --filename=scripts/qa/handy-pals-production.js
```

Screenshots and a sample downloaded PNG are in ignored `output/playwright/`.
Physical mobile/browser acceptance and the five-person 10-second discovery/cute/
replay KPI remain pending in [the playtest sheet](HANDY_PALS_PLAYTEST.md).
CREATOR video/face modes/seven-second replay are future scope in the specification.
This request did not publish or deploy the project.
