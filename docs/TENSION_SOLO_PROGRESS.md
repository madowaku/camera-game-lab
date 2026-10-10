# EXP-021 TENSION BREAK! SOLO

Implemented 2026-10-10. Open `#tension-break`, `#tension-solo`, or
`#/game/solo-tension-break` from the existing SOLO catalog.

## Implemented

- One-hand front-camera brick breaker; right hand on screen right, left on left.
- Saved hand preference, three six-brick layouts, 30 active seconds, three lives.
- Shared DUEL geometry, object-cover projection, smoothing response, elastic
  deformation, aiming/reflection and audio. No DUEL rules or two-player code copied.
- Wide C catches deeper and longer; narrow C returns faster. Closing during an
  existing catch shortens the hold and uses the current tilt for release.
- Separate pure SOLO simulation, normalized brick collision/render rectangles,
  swept brick collisions and 240 Hz bounded collision substeps.
- One active net. The existing recognizer retains up to two candidates so a
  second hand does not steal ownership on result reordering. Selection follows
  position continuity, never MediaPipe's orientation-dependent handedness label.
  Initial placement on the guided side provides a calibration fallback.
- Camera READY requires a usable fingertip segment in the player's half. 250 ms
  recognition grace, then ball/time/lives freeze. Recovery never charges the
  first recovered frame. Manual pause and background tabs also freeze the run.
- Labeled mouse/touch practice with vertical drag and height/tilt/opening ranges;
  arrow keys move/tilt, `[` / `]` adjust opening. No model or camera required.
- Pause, resume, restart, explicit confirmed hand switch, fullscreen when
  supported, camera denial recovery, CLEAR/TIME UP/GAME OVER and JA/EN.
- Platform results include actual score, destroyed bricks, lives, returns, active
  time and practice provenance. RETRY keeps the hand/layout; CHANGE LAYOUT
  returns to layout selection; BACK exits using the existing catalog routes.
- Generated Imagegen poster; locally hosted, credited OtoLogic/Kenney audio
  reused from DUEL, including its first-play cache and pause-aware music owner.

## Branch and preservation

Base: `origin/main` at `1362715` (merged PR #15, official DUEL integration).
PR #14 was verified CLOSED, unmerged. No dependency on its source branch.
SOLO branch: `codex/tension-break-solo`; separate managed worktree.
The original checkout's uncommitted work is preserved. DUEL scoring, assignment,
goals, first-to-five rules and existing tests remain unchanged.

## Verification

Pure-logic tests cover both mirror directions, symmetric rebound, camera
fingertip projection, wide/narrow catches and pinch release, scoring once,
tunneling, brick faces, three rails, full-exit misses, third miss, timeout,
clear, tracking/manual pause, two-hand identity, safe hand switch and rotation.
All six bricks in every layout are reachable using ordinary net returns.
Controller tests exercise actual shared launcher/result/retry teardown,
localStorage, native controls, JA/EN, camera READY, denial and recovery.

Commands:

```text
npm test
npm run test:tension-ui
npm run build
npx --yes --package @playwright/cli playwright-cli -s=tension-solo open http://127.0.0.1:5178/#tension-break --headed
npx --yes --package @playwright/cli playwright-cli -s=tension-solo run-code --filename=scripts/qa/tension-solo.js
```

Browser evidence is saved in `output/playwright/tension-solo-*.png` (ignored).
The browser script uses actual DOM/canvas and synthetic tracking. It covers
1440×900, 844×390 and 390×844, both hand choices, all three layouts, range
controls, drag, pause, result/retry/change-layout, tracking loss/recovery,
hand-switch confirmation, denial recovery, EN, assets and console errors.

Final verified results (2026-10-10):

- `npm test`: **751 passed**, including 20 new SOLO tests; no failures/skips.
- `npm run test:tension-ui`: **43 existing DUEL checks passed**, unchanged.
- `npm run build`: **passed**. Existing large Phaser/Three chunks emit the
  repository's bundle-size warning; SOLO remains a lazily loaded module.
- Browser: **248 checks passed**, 18 viewport/hand/layout combinations,
  zero page exceptions and zero failed relevant local assets. Twenty gameplay,
  tracking-loss and English screenshots retained locally.
- `git diff --check`: passed. DUEL game/input/audio/rules files and its existing
  test files are unchanged from the merged integration base.

## Real-device verified / Not verified

Real-device verification: **none**. Physical fingertip alignment, actual
MediaPipe label conventions, recognition/thermal performance, Android camera
permission and fullscreen behavior, sound heard on a phone, perceived elastic
timing, intentional aiming, enjoyment and difficulty are unverified.
Synthetic camera tests do not establish any of these. Complete the five runs in
[TENSION_SOLO_PLAYTEST.md](TENSION_SOLO_PLAYTEST.md) before claiming acceptance.
No production deployment is included in this implementation.
