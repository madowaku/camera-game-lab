# EXP-004 BLINK HORROR — implementation record

2026-10-03 (JST). Implemented against local Platform v0.1 (`e4ff96c`).

- Canonical route: `#/game/solo-blink-horror`; alias: `#blink-horror`.
- Independent view/controller, normalized `EyeState` / `EyeInput`, pure `BlinkHorrorGame`.
- Reuses the shared Face Landmarker factory and BodyInput camera ownership. Blendshapes enabled only for the eye adapter.
- Both-eye hysteresis, three stable samples, 120ms held closure, short natural-blink event, explicit missing/unknown state, stale-frame rejection.
- One-second open-eye calibration, countdown, seeded 3 rush windows, 26 active-second limit, escape/caught/timeout results. Face loss freezes progress, danger and rush time; return needs 400ms stable tracking.
- Mirrored selfie scene, silhouette, near-black closure, quiet procedural ambience/heartbeat/rush cues, mute, JA/EN, keyboard/touch demo, debug input display.
- Feed SVG poster, Explore/search/INFO/URL, result/retry/next/share. Camera and demo sources survive result sharing and language changes.
- Result and exit release tracks, detector, AudioContext, rAF, timers and interaction listeners. Delayed permission replies are cancelled and their tracks stopped.

## Verification

- `npm test`: 122 passing (107 baseline + 15 new), no deleted/skipped tests.
- `npm run build`: success; game, shared face input and MediaPipe remain lazy chunks.
- `scripts/qa/expansion-blink.js`: 34 checks; 360×800, 720×1280, 1440×900. Feed → PLAY → demo → ESCAPED → SHARE → RETRY → CAUGHT → JA → NEXT. No horizontal overflow or uncaught page errors; no camera request or model loading on Feed.
- `scripts/qa/expansion-blink-camera.js`: 16 synthetic checks. Raw blendshape input, loss/recovery fairness, real MediaStreamTrack.stop(), model close, AudioContext closure, no remaining rAF, retry, late permissions, denial → demo.
- Screenshots: `output/playwright/expansion-blink-*.png` (ignored local artifacts).

## Remaining research gate

Software checks do not establish actual camera detection or game-feel acceptance. Physical Android Chrome / iOS Safari, mobile HTTPS camera/audio behavior, deliberate close/open 9/10 detection, and five human rounds remain untested. No human gate is marked passed. Generated runtime sounds and inline art are original code; no new external asset dependency.
