# EXP-047 TOY DRUM — human playtest

Status: pending. Automated keyboard, synthetic landmarks and real model startup
checks do not establish camera accuracy, first-touch clarity or fun.

Open `#/game/solo-toy-drum` on a real portrait phone via HTTPS. Set the phone down
and frame the upper body and both hands. Try five 30-second rounds, preferably
with more than one first-time player and both iOS Safari and Android Chrome.

| Round | Device / browser | Intended hits | Recognized hits | False hits | First hit ≤5s? | Natural two hands? | DOUBLE / finish? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |

Check the following in each round:

- Without explanation, does the player swing down into a drum within five seconds?
- Do slow positioning, resting palms and lifting the hand avoid unwanted hits?
- Are at least 90% of intended downward hits recognized, including fast low-FPS swings?
- Can the player reach the bottom row without arms hiding the drum faces?
- Do crossed hands and changing recognition order avoid phantom hits?
- Does sound feel immediate with the 80ms squash / 120ms return and colored burst?
- Does the forgiving ±650ms cue encourage play without repeated failures?
- Do the two paired cues and giant finish naturally invite both hands?
- Does FEVER make the player want to roll faster? Is its louder pace comfortable?
- Can the player recover from lost hands, pause, camera interruption and RETRY?
- Does a roughly 15-second externally filmed play clip communicate the toy immediately?

Measure recognized/intended hits separately from false hits; do not infer accuracy
from the game's score. Mark a criterion passed only after observation. If a
criterion fails, tune the face ellipses, descent threshold, cooldown or framing
against the recorded observation. Ask the player whether they want another turn.
