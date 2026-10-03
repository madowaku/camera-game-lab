# TENSION DUEL Human Playtest v0.1

## Setup
Two people, one front camera, landscape phone, one hand per person. Open `#tension-duel`. Give only the instruction shown on screen. Play five 15-second rounds. A lone tester can use a hand on each side for recognition smoke testing; this is not a substitute for the two-person gate.

## Camera smoke test (not yet performed)
- Start grants camera access and opens the front camera; two hands produce exactly two nets.
- Endpoints stay attached to thumb and index tips on a mirrored preview.
- Moving and tilting a hand moves the net immediately without heavy lag.
- Distance changes slack/normal/tension/over-tension appearance and return speed.
- A short tracking gap under 250ms does not flicker; a longer gap fades the affected net and pauses the match.
- Reappearance resumes the same score/time; brief movement across center does not exchange players.
- Camera interruption shows recovery text. Back stops all video tracks. Retry does not request permission again.
- Pause freezes ball, score and clock. Resume and switching JA/EN preserve the round.
- Rotate between portrait and landscape during a round: the ball stays inside the new arena, camera nets reattach to fingertips and no points are awarded during recovery.
- Two hands on the same side do not start the countdown. A fingertip outside the preview shows the readiness hint instead of starting play.
- Android performance and thermal behavior remain usable across five rounds.

## Observation sheet
| Round | Understand within 30s | Make C naturally | First hit | Tilt discovered | Tension noticed | Best rally | Visible positive reaction | Voluntary retry | Tracking problems |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |
| 4 | | | | | | | | | |
| 5 | | | | | | | | | |

Record exact confusing words, where people look, and what they try. Do not teach angle/tension before seeing whether players discover them.

## Gate
Continue only when both players understand within 30 seconds, at least one rally reaches three returns, hits feel attached to the finger net, positive reactions occur, and at least one player voluntarily retries. Recognition noise must not dominate the game. If this fails, adjust tracking, ball speed, collision forgiveness, net clarity or hit feel before adding mechanics. PIN/HARE/CATCH remain outside v0.1.

Verdict: NOT TESTED. Date / device / participants / decision: ______.
