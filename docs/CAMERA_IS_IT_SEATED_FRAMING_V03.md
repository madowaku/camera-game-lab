# EXP-043 THE CAMERA IS IT — Seated Framing v0.3 (candidate)

Feedback received 2026-10-10:
- Stage 002 is too long.
- Turning more than 90° while seated is unrealistic.
- If a stage is long, the route should turn back rather than continue in one direction.
- Stage 006 FOCUS is technically playable but not especially fun.
- Stage 008 OVEREXPOSE (disappears if watched too long) is not playable.

## Design decision

Favor **framing puzzles** (include / exclude / keep two anchors together) over **reflex camera games**.
A stage should be understandable without racing a countdown. Real seated device comfort takes priority over the character's run length.

## Implemented in PR

- Stage 002: five platforms -> three, with two small jumps; target ~9 seconds in deterministic simulated input.
- Stage 008: replace the two OVEREXPOSE platforms with an EXCLUDE bridge. A red subject is near the top of the initial frame; shifting view downward by 130 world units (~4.1° nominal pitch at 32 px/degree) takes it outside, creates the bridge, while leaving the runner fully on screen. A safe stop at the first edge and persistent hints teach the concept. No timer.
- Stage 010: replace the OVEREXPOSE landing with a single EXCLUDE landing. The blocker is positioned so the LINKED bridge and EXCLUDE landing can both exist in one carefully chosen camera view.
- Remove the unconditional 30-second fail: only stages explicitly providing `timeLimitMs` have a deadline. No existing stage currently opts in.
- Keep FOCUS in Stage 006 as a minor tool; do not invest further in gaze-duration mechanics until human feedback justifies it.
- Preserve the OVEREXPOSE rule in the engine for regression compatibility, but do not use it in the 001–010 stage lineup.
- All new English / Japanese hint keys and marker rendering included.

## Technical verification

- 10/10 individual stages cleared without simulated fail using deterministic camera routes.
- 10/10 contiguous stages cleared without simulated fail.
- Stage 002 simulated clear: 8.8 seconds. Stage 008: 9.6 seconds.
- 17 relevant camera-rule tests executed with an in-process lightweight assertion harness: 17 passed.
- UI renderer/view JavaScript syntax checked.
- **NOT VERIFIED**: complete `npm test`, `npm run build`, Playwright, camera hardware, real Android Chrome, seated human comprehension and ergonomic comfort. A lightweight harness is not a substitute for the native test runner.

## Seated human test gate

1. Play 002 / 008 / 010 while seated. No standing, twisting torso or turning around. Note *maximum comfortable* yaw and pitch, not just clearing the stage.
2. After watching the screen, can the player tell that the red symbol must be out of frame and the bridge needs to remain in frame?
3. At 008, remain still for 30+ seconds first: there should be no automatic fail, and the runner should safely wait.
4. 008 must be passable by small vertical aiming without looking away from the screen or hiding the runner.
5. 010 must allow LINKED bridge and EXCLUDE landing simultaneously, not demand contradictory camera positions.
6. Record stage clear, tries, physical rotation range, tracking interruptions, camera background on/off, and whether the rule was understood independently.
7. If the player needs a large turn or the idea is not fun, revise further. A code test pass is not experience validation.

## Follow-on: Folded Route / Switchback (NOT implemented)

Longer Stages 003–005 still use horizontally monotonic platforms. Do **not** claim those are seated-comfort certified. A future route-direction refactor should:
- Decouple **route progress** from absolute world X.
- Support segments traversed left-to-right, then right-to-left, with visible turn-around points and consistent jumping/landing tests.
- Prefer a small local camera workspace for each route segment, rather than forcing large head/phone rotation.
- Ensure a camera pan never forces the player to lose the walker while attempting a required action.
- Allow a recenter affordance only as optional comfort support, not as the intended puzzle solution.

User feedback and real-world playtesting will decide whether to build this next.
