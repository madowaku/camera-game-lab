# TENSION DUEL v0.2 implementation report

Updated 2026-10-03. Continues `feat/tension-duel` at `d870e2d` in the isolated
local branch `codex/tension-duel-polish`. The main checkout's in-progress work is
preserved.

## Changes

- Generated two-hand intro artwork using the built-in image_gen tool. Runtime
  WebP: 1536 × 864, 103,780 bytes. It is decorative; all instructions and scores
  remain localized HTML. The PWA precaches the artwork. Full prompt:
  [TENSION_DUEL_ARTWORK.md](TENSION_DUEL_ARTWORK.md).
- Clearer countdown, center court line, player-colored goal edges, ball trail,
  current rally and brief point cue. Camera/practice provenance appears during
  play and in results.
- Pause button / Escape and Resume preserve ball, score and active-play time.
- Portrait uses a 4:3 arena; landscape remains 16:9. Rotation maps the ball to the
  new height, preserves score/time/speed, and waits for freshly projected camera
  fingertips.
- Two valid hands must start on opposite sides. Cropped/invalid fingertips do
  not advance the game; demo nets stay within the arena.
- Reacquisition retains player assignment through longer pauses, skips stale
  smoothing and never advances the ball on the first returning frame. Long
  frame stalls are bounded to 100ms of active play.
- Retry/navigation clean up the game correctly; fresh entry starts in camera
  mode. Camera interruption clears the startup timeout. Pointer cancellation
  clears held input.
- Added meaningful rotation, cropped-input and long-loss regression tests;
  extended the existing UI verifier and wired it into CI.

## Software verification

- `npm test`: 59/59 pass.
- `npm run test:tension-ui`: 26 checks pass, including five synthetic rounds
  with nine returns each, restart, camera failure recovery, tracking pause,
  first-frame reacquisition, manual pause/resume, Escape, rotation, same-side
  setup and practice provenance.
- `npm run build`: Vite production build and PWA generation pass.
- Production service worker includes the artwork in its precache.
- `git diff --check`: pass.

## Browser verification

Checked the actual app in Codex's in-app browser at 1440 × 900, 390 × 844,
844 × 390 and 320 × 568, including Japanese and English:

- Artwork loads; primary actions are reachable; no horizontal overflow.
- A complete 15-second camera-free round reaches a result with points and
  returns. Retry resets the score and starts another round.
- Pause/Resume and Escape preserve the current round.
- Rotating a paused round preserves the 15-second clock.
- Language switch translates controls and practice/result provenance.
- Back returns to HAND BEAT; reopening TENSION DUEL starts at its intro.
- Production preview also renders the artwork and a complete practice round.
- No browser console errors or warnings observed in these flows.

Local screenshot evidence lives in `output/playwright/` (git-ignored):
`tension-mobile-intro.png`, `tension-landscape-play.png` and
`tension-desktop-intro.png`.

## Remaining human verification

Actual MediaPipe fingertip attachment, hand crossings, camera interruption on
hardware, Android inference performance, sound feel and the two-person
five-round gate remain unverified. Synthetic tests and camera-free browser
rounds do not establish camera reliability or a human GO verdict. Use
[TENSION_DUEL_PLAYTEST.md](TENSION_DUEL_PLAYTEST.md) before adding new mechanics.
PIN/HARE/CATCH and AI opponents remain outside this iteration.

## Local preview

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5186
```

Open `http://127.0.0.1:5186/#tension-duel`. The current production preview runs
at `http://127.0.0.1:5187/#tension-duel`. Camera needs localhost or HTTPS.

## Smartphone readiness follow-up — 2026-10-10

- Short landscape layouts use more of the phone display, and hide the experiment
  header during active play so match controls stay nearby.
- Fullscreen is now a primary action. Browsers that support it also attempt a
  landscape orientation lock; unsupported devices keep the normal page flow.
- Screen Wake Lock keeps the display awake during active rounds when available,
  and releases on pause, result, app backgrounding, or exit.
- Camera denial, missing front camera, and a camera busy in another app now get
  actionable messages. Tension Duel requests 960×540 video to reduce phone
  decoding and inference load.
- Automated coverage: 60 unit tests and 30 UI checks, including mobile
  fullscreen/orientation and wake-lock paths. Production build passes.
- Physical phone camera recognition, two-person framing, and Android thermal
  behavior still need the hardware playtest above; browser simulation cannot
  certify those device-specific results.
