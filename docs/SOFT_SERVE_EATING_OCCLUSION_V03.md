# SOFT SERVE Eating Occlusion v0.3 (2026-10-10)

Status: implemented on experimental PR branch. **A401OP real-camera acceptance not yet tested.**

## Why this change
The previous eating rule required a hand and mouth landmark simultaneously in every input frame. When the cone covers the player's mouth or the hand disappears behind the cone, `SoftServeGame.step` paused and cleared its contact timer, making finishing difficult. This is not a more accurate ML recognizer; it is a game-input state machine that tolerates expected visibility loss.

## What changed
- Camera EAT phase only: observe BOTH a tracked hand and visible open mouth with the cone's tip within .18 normalized contact distance (the actual contact threshold stays .10).
- If either tracker subsequently disappears, preserve the intentional approach for up to 500ms; after 170ms of continuous dropout, issue exactly one bite. During that brief dropout, hold movement/clock/melt instead of treating missing data as a new motion.
- If the approach was distant or the mouth was closed, tracking loss still pauses; there is no bite.
- After a bite, a second bite still requires visible separation and a new approach.
- During actual camera play, a valid bite consumes up to an additional 0.5 swirl when that would complete the cone; the consumed size is recorded in the existing event and score. Demo mode is unchanged.
- No new CV model, video retention, dependencies, or network access.

## QA toggle
After deploying this PR version (not deployed by opening a PR):
- Improved B (default): `?biteAssist=B#/game/solo-soft-serve`
- Old strict A: `?biteAssist=A#/game/solo-soft-serve`

Keep the query string **before** the hash. A and B operate on the same build and camera. Existing READY/SERVE behavior and CREATOR mode presentation are intended to stay unchanged. Other open PRs, notably #11's READY loss experiment, are not changed.

## Tests and acceptance
- Synthetic tests in `test/softServe.test.js`: mouth occluded, hand occluded, closed/distant, long gap, one-shot, last partial swirl, A/B disable.
- Verify `npm test`, `npm run build`, browser QA and PR checks (not represented here as already run).
- A401OP real camera: at least 10 natural last-bite attempts; target >=9 successes, no phantom bite in 10 neutral/non-eating gaps.
- Reconfirm deliberate one-bite separation, melt/pause, replay, reduced motion, mirrored camera, JA/EN and portrait 360x800.
- Tune .18 / 170ms / 500ms / 0.5 with real input feedback before merging. Do not treat synthetic tests as human playtest evidence.
