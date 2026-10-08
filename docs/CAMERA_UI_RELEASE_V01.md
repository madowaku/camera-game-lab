# Camera UI v0.1 release checks

## Release source

PR #8 is updated in place from its existing branch. The canonical specification is [UI_UX_ACCESSIBILITY_V01.md](UI_UX_ACCESSIBILITY_V01.md). The previous FEED-only controllers are replaced by one shell-owned camera UI for FEED, launch and results.

Only the shared UI, its MARU integration, relevant QA/documentation, dependency lockfile repair and the two Linux-sensitive SONIC INK import names are included. Other locally unpublished game and rendering-layer work stays outside this release. Already-pushed main changes are preserved.

Validation on the isolated source: 653 unit tests (the previous local 654 includes one unrelated PALM PONG test), 249 layout checks across all 39 games, and 26 synthetic camera checks. GitHub Actions runs the complete build and regression suite on Linux with `npm ci`.

## UX acceptance metrics

- Target: **0 taps after initial play starts**. Initial camera opt-in and camera permission setup happen before the measurement.
- Target: **5 consecutive loops** of game selection → camera start → play → result → retry → play/result → next game.
- Camera navigation and gameplay must remain distinct; game gestures must never select menu buttons while playing.
- Confirm in the A401OP's actual HTTPS browser, with the published source. Synthetic input and desktop emulation do not count as physical acceptance.
- Count app-screen touch contacts after the first `game_start`; log air actions separately. Browser chrome/system prompts outside the app are recorded separately if any occur. Numeric debug evidence stays local; no camera images, recordings or user telemetry are uploaded.

| Loop | Select/start/play/result | Retry then result | Next game | App taps after first start | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | User confirmed | User confirmed | User confirmed | 0 reported | Passed (user confirmation) |
| 2 | User confirmed | User confirmed | User confirmed | 0 reported | Passed (user confirmation) |
| 3 | User confirmed | User confirmed | User confirmed | 0 reported | Passed (user confirmation) |
| 4 | User confirmed | User confirmed | User confirmed | 0 reported | Passed (user confirmation) |
| 5 | User confirmed | User confirmed | User confirmed | 0 reported | Passed (user confirmation) |

On 2026-10-09, the user confirmed five consecutive loops on the A401OP HTTPS release with zero taps after play started, selecting MARU MAGIC repeatedly. USB disconnected during the run, so the complete automatic counter trace is unavailable; record this as user-confirmed physical acceptance, not an automatically measured result. Other games and sustained performance still need their own physical checks.

## Publication

1. Update PR #8 with the isolated, verified source and clear obsolete implementation notes.
2. Require passing GitHub Actions on that exact PR head before merging the revised PR.
3. Build the merged source and deploy with the existing `camera-game-lab` Wrangler configuration. Record the Git SHA and Cloudflare version so the release is identifiable.
4. Check the HTTPS assets, menus and actual camera on the A401OP, then complete the five-loop table with evidence.

## Published result — 2026-10-09

- [Updated PR #8](https://github.com/madowaku/camera-game-lab/pull/8): merged after both PR checks passed. The main build also passed.
- Published Git source: `8b66795c2898f80d708273b6641cda6bfd7df845`.
- [Production HTTPS](https://camera-game-lab.cacao-ixora-coccinea.workers.dev/), Cloudflare version `6e37845d-f458-49d8-82db-ac033d15b1f3`, tag `8b66795`.
- Build/dry run succeeded; 653 unit tests, 249 layout checks (also passed on HTTPS), 26 synthetic camera checks.
- A401OP loaded the published JS, secure context and 360px viewport without horizontal overflow. Five loops / zero app taps were confirmed by the user.
