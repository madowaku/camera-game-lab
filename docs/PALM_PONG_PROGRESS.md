# EXP-048 PALM PONG v0.1

Implemented from [the supplied specification](specs/EXP-048_PALM_PONG_SPEC_v0.1.md).
Local route: `http://127.0.0.1:5173/#/game/duo-palm-pong`; alias `#palm-pong`.
Registered in DUO / HAND, two players, landscape, 30 seconds. Feed and Explore
use the Imagegen cover; the launcher, play, result and instructions support JA/EN.

`src/palmPong/core.js` owns a DOM-independent 16×9 simulation at 1/120 second.
Ball radius, paddle dimensions, zones, vector speeds, angle offsets, wall/miss
boundaries and 650ms re-serves use the specification's initial values. Earliest
continuous contact wins; only the incoming central face of the next receiver
counts. Vertical overlap, backside contact, invalid zones and jumps cannot score.
One return increments rally and the proper player's count once, switches the
receiver, and consumes the rest of the step with the new velocity. Guides reflect
the current ball through rails without changing its trajectory or predicting a
future return. All counts freeze at the 30-second boundary before the 350ms bow.

`PalmPongInput` uses the shared BodyInput/front-camera lifecycle with a dedicated
tracker. Existing HANDY PALS, DUO and body-input rules are unchanged. The palm is
the mean of landmarks 0/5/9/13/17. Mirroring happens once; the unclamped cover
projection matches the rendered video. Position/velocity matching preserves
ownership across crossing and ignores handedness labels. The model detects up
to three hands so the existing two slots can reject a third. Ambiguity, a ≥0.25W
jump within 100ms, cropped hands and stale inference become unreliable inputs.
Smoothing uses the initial 60ms time constant; a 40ms delayed interpolation
joins only trustworthy observed samples. This adds latency and needs device QA.

START requires two in-zone hands for 500ms; a three-second countdown precedes
the active clock. Loss keeps the last position for at most 150ms, but impending
receiver contact/miss pauses immediately instead of awarding a stale result.
Pause freezes the ball, active clock and re-serve countdown. Recovery requires
500ms of stable hands and a one-second cue; resumed overlap is separated with no
point and unchanged velocity. Hidden tabs, blur, rotation and >200ms backlog
pause explicitly. A ten-second loss exposes realign, fresh practice and exit.
Permission denial and startup cancellation release partial models/streams.

Practice uses the same core with fixed pointer ownership or WASD / arrows.
An out-of-zone paddle is outlined and inactive. Practice records cannot change
camera records. Local storage contains only best/total/round counts and guide/
effect preferences; no landmarks, video or per-frame event log is retained.
Text/link challenge sharing includes practice provenance and the canonical route.
Camera, inference loop, effects and listeners stop at result/exit. Camera retry
reinitializes via the existing launcher; no extra inference loop is added.

Imagegen key art and the OpenTracks song **パステルハウス / かずち** are recorded
with exact prompt, paths, processing and hashes in [the manifest](palm-pong-assets.json).
The song is a quiet commercial-game BGM bed, inline inside lazy JS, with no
standalone public MP3 or music export. Shared BGM ON/OFF follows active play,
re-serves, pause, result and exit. Original pentatonic return sounds have a
separate persistent mute. Collision response never waits for visual/audio effects.

Verification on 2026-10-04:

- 33 new rules/tracking/records tests pass; full workspace suite: **333 passed**,
  including the concurrent TOY DRUM work. No pre-existing test was weakened.
- Practice/browser QA: **51 checks** covering a full round, actual alternating
  physics counts, two-pointer independence, keyboard input, guide selection,
  pause/recovery, language, records, challenge payload, retry and resource release.
- Synthetic camera QA: **22 checks**, browser-owned colored video and synthetic
  landmarks; covers projection/mirroring, CPU fallback, loss, rotation, backlog,
  denial, late permission after cancellation and camera-to-practice release.
- Actual HandLandmarker float16/1 and tasks-vision 1.0.1 WASM load with GPU;
  inference on a blank 1280×720 canvas correctly produces zero hands.
- Built bundle QA: **13 checks**; assets, instructions/credits, timed practice,
  real returns, pause, result, mobile layout, retry and exit pass.
- Entrance/play/result screenshots at **800×360, 1280×720, 360×800, 720×1280**
  show no horizontal overflow; the court retains 16:9 and circle geometry.
  Title/face overlap and result button interference found in QA were fixed.
- `npm run build` and `git diff --check` pass. Existing large inline-audio bundle
  advisories remain. No standalone MP3 is present in `dist/`.
- Centered static practice paddles reach at most 2 consecutive returns in a
  simulated 30-second round; real hand jitter and game feel remain unmeasured.

Reproduce with the existing local server and Playwright CLI:

```powershell
npm test
npm run build
npx --yes @playwright/cli -s=palm-pong open http://127.0.0.1:5173/#/game/duo-palm-pong
npx --yes @playwright/cli -s=palm-pong run-code --filename=scripts/qa/palm-pong.js
npx --yes @playwright/cli -s=palm-camera open http://127.0.0.1:5173/#/game/duo-palm-pong
npx --yes @playwright/cli -s=palm-camera run-code --filename=scripts/qa/palm-pong-camera.js
npx --yes @playwright/cli -s=palm-model run-code --filename=scripts/qa/palm-pong-model.js
```

Browser evidence/logs live in ignored `output/playwright/` and `output/palm-pong/`.
Synthetic scores are test inputs/results, not measured human performance.

The attached spec describes 047 as HAND HOP; concurrent local work registers
TOY DRUM as 047. This task leaves that work intact and registers only the unique
048 / `duo-palm-pong` identity. Shared registry/music/README edits were appended
without removing the other work.

**Pending:** the [two-person five-round A401OP/Chrome playtest](PALM_PONG_PLAYTEST.md),
physical two-touch/device testing, actual inference FPS and latency, and any
public deployment. iOS support, recognition reliability and fun are not claimed.
