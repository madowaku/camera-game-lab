# Camera Gesture Layer v0.2 P1 — GRIP / PINCH A/B Integration

Date: 2026-10-10  
Status: implementation branch `feat/camera-gesture-layer-p1`; comparison-only, A gameplay unchanged.

## Purpose

Connect existing `GripState` and `PinchState` to P0's `GestureEngine` as **read-only A/B comparison**. Detect differences in recognition semantics and recovery, not “accuracy” without human intent labels.

## Implementation

- `src/gesture/gripPinchAdapters.js`: one classifier-based `gripSignal` using existing .60 confidence and Open_Palm/Closed_Fist labels, and `pinchSignal` reusing existing `readPinch`, `.30/.42` hysteresis, wrist-to-middle MCP normalization and aspect ratio. Undecidable inputs are `unknown`, never synthetic release.
- `src/gesture/gestureABProbe.js`: one legacy `GripState` + one legacy `PinchState` on the *same inference result* as one P0 engine; **no second model/camera**. P0 supplies B's independent per-hand FSM, clock-only freshness, neutral rearm and event ownership. Keeps only running disagreement counts plus eight recent event metadata objects; no video, audio, or landmark history.
- `src/input/gripInput.js` and `src/input/pinchInput.js`: optional `compareGestures: true`, `onComparison`, `lastComparison` APIs. Existing `onFrame` gets the original A result first. If comparison throws, it disables the probe and keeps gameplay running. `stop()` resets observation state.
- `src/pinch/view.js`: when `?debug=1&gesture=AB` is supplied, existing “入力デバッグ” / “Debug input” panel includes `gestureAB` with A and B for GRIP and PINCH. **Always uses A to play**. No extra visible debug panel for ordinary players.
- `test/gestureP1.test.js`: input parity, threshold, hysteresis, initial closed-hand behavior, loss, timestamp ordering, rates, reset, and browser input-class safety tests.
- One CI workflow continues to run `npm ci`, `npm test` and `npm run build`.

## A/B parameters, for research not certified usability

| Signal | A | B |
|---|---|---|
| GRIP | Legacy Open_Palm/Closed_Fist >=.60, pose held >=80ms, Open_Palm to rearm | Same labels >=.60; 80ms neutral + 80ms activation + 80ms release |
| PINCH | Legacy thumb/index distance ÷ wrist/MCP distance; enter <=.30, release >=.42, 2 qualifying frames | Same dimensionless ratio/hysteresis; 0ms neutral, 40ms activation/release |
| Gaps | Legacy stale 300ms | P0 fresh gap 150ms, LOST 300ms; B does not create action while missing |

Note A may latch an unarmed grip/pinch state before its first deliberate event. Comparing A state against B active may show a mismatch on startup. This is **not** a false-positive measurement. `disagreements` increments only when both versions have a fresh detected hand; it measures disagreement, not intent correctness. A and B processing times have not been measured on Android.

**User input gate remains unchanged**: test A and B deliberate operations >= 9/10; no-action <=1 false actuation / 30 sec; new-player cold start 4/5; recover without hidden instructions; legible correction hint. B cannot replace A until on-device evaluation passes.

## Manual A401OP walkthrough

1. Pull latest main after P1 merge, or deploy the feature branch to an HTTPS preview before merge. Do NOT use `localhost` URLs from the phone unless serving over the network and camera restrictions allow them.
2. Open PINCH WORLD with the query params preceding the fragment:
   `https://camera-game-lab.cacao-ixora-coccinea.workers.dev/?debug=1&gesture=AB#/game/solo-pinch-world`
   **This public URL will show P1 only after a build containing the branch is deployed.** GitHub merge alone does not establish Cloudflare deployment.
3. Expand the existing “入力デバッグ”. Show OPEN hand for a short time, then close FIST, then reopen; repeat ten times. Check `gestureAB.A.GRIP`, `gestureAB.B.gestures.GRIP`, `events`, `recentEvents`, and `disagreements`.
4. Separate study: show thumb-index open gap, hold pinch, release. Read PINCH A and B **without expecting a game action**. These are research observations.
5. Move a hand out of frame and back. Verify B displays `GRACE` then `LOST` and requires neutral before rearming; never interpret a retained legacy state as active intent during loss.
6. Alternate A and B diagnostic runs under consistent lighting, distance and orientation. Log deliberate success / 10, no-action activations /30 sec, recovery time, device lag and unknown-pose behavior.

No user camera video is recorded or uploaded. Comparisons remain in memory and reset on stop.

## Verification / constraints

All baseline gameplay logic, scores, and `PinchWorldGame` remain unchanged, including the 300ms missing-hand drop behavior. The demo via touch/keyboard is unaffected. A/B probe only runs on opt-in debug URL. `PinchInput` is optional and research-only. `SOFT SERVE` requires no pinch and remains unmodified.

CI success is not equivalent to real A401OP success or a completed Cloudflare deployment.
