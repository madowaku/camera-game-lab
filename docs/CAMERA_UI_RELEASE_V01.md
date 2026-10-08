# Camera UI v0.1 release checks

## Release source

PR #8 is updated in place from its existing branch. The canonical specification is [UI_UX_ACCESSIBILITY_V01.md](UI_UX_ACCESSIBILITY_V01.md). The previous FEED-only controllers are replaced by one shell-owned camera UI for FEED, launch and results.

Only the shared UI, its MARU integration, relevant QA/documentation, dependency lockfile repair and the two Linux-sensitive SONIC INK import names are included. Other uncommitted HUMAN FISH, PALM PONG, registry-order and rendering-layer work stays outside this release.

Validation on the isolated source: 653 unit tests (the previous local 654 includes one unrelated PALM PONG test), 249 layout checks across all 39 games, and 26 synthetic camera checks. GitHub Actions runs the complete build and regression suite on Linux with `npm ci`.

## UX acceptance metrics

- Target: **0 taps after initial play starts**. Initial camera opt-in and camera permission setup happen before the measurement.
- Target: **5 consecutive loops** of game selection → camera start → play → result → retry → play/result → next game.
- Camera navigation and gameplay must remain distinct; game gestures must never select menu buttons while playing.
- Confirm in the A401OP's actual HTTPS browser, with the published source. Synthetic input and desktop emulation do not count as physical acceptance.
- Count app-screen touch contacts after the first `game_start`; log air actions separately. Browser chrome/system prompts outside the app are recorded separately if any occur. Numeric debug evidence stays local; no camera images, recordings or user telemetry are uploaded.

| Loop | Select/start/play/result | Retry then result | Next game | App taps after first start | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Pending | Pending | Pending | Unmeasured | Pending |
| 2 | Pending | Pending | Pending | Unmeasured | Pending |
| 3 | Pending | Pending | Pending | Unmeasured | Pending |
| 4 | Pending | Pending | Pending | Unmeasured | Pending |
| 5 | Pending | Pending | Pending | Unmeasured | Pending |

The local MARU retry was physically confirmed on 2026-10-09. The five-loop HTTPS acceptance is a separate check; do not report it as passed until the actual run is observed or confirmed.

## Publication

1. Update PR #8 with the isolated, verified source and clear obsolete implementation notes.
2. Require passing GitHub Actions on that exact PR head before merging the revised PR.
3. Build the merged source and deploy with the existing `camera-game-lab` Wrangler configuration. Record the Git SHA and Cloudflare version so the release is identifiable.
4. Check the HTTPS assets, menus and actual camera on the A401OP, then complete the five-loop table with evidence.
