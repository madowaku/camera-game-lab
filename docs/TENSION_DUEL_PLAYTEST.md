# TENSION DUEL Human Playtest v0.1

## Setup
Two people, one front camera, landscape phone, one hand per person. Open the HTTPS Tension Duel link in Safari on iPhone or Chrome on Android, allow camera access, and tap **カメラで遊ぶ / Play with camera**. If offered, use **大きく表示 / Play fullscreen**; supported browsers also lock landscape. Give only the instruction shown on screen: left player makes a C, right player makes its mirror, with both openings toward the center. Play five 15-second rounds. A lone tester can use a hand on each side for recognition smoke testing; this is not a substitute for the two-person gate.

## Camera smoke test (not yet performed)
- Start grants camera access and opens the front camera; two hands produce exactly two nets.
- Endpoints stay attached to thumb and index tips on a mirrored preview.
- The left player's C and right player's mirrored C are easy to understand from the on-screen cue.
- Moving and tilting a hand moves the net immediately without heavy lag.
- Spread fingers: the membrane catches the ball, stretches deeply, then gives a big, slower boing. Pinch fingers: the catch is shorter and the return faster. Check both players and tilt steering.
- A short tracking gap under 250ms does not flicker; a longer gap fades the affected net and pauses the match.
- Reappearance resumes the same score/time; brief movement across center does not exchange players.
- Camera interruption shows recovery text. Back stops all video tracks. Retry does not request permission again.
- Pause freezes ball, score and clock, including midway through an elastic catch. Resume continues that same catch; switching JA/EN preserves the round.
- Rotate between portrait and landscape during a round: the ball stays inside the new arena, camera nets reattach to fingertips and no points are awarded during recovery.
- Two hands on the same side do not start the countdown. A fingertip outside the preview shows the readiness hint instead of starting play.
- Keep both endpoints in the player's half to start. Touching the center line is allowed; straddling it is not.
- During play, cross the center briefly: the affected net dims and shows a return arrow, cannot hit, and the clock continues. Bring it back: the warning clears and returns work again without swapping P1/P2. Missing hands still pause the match.
- Top/bottom impacts light the struck rail briefly and play a wall cue. Left/right goal nets fill the central 80% of the edge; the upper/lower 10% sections bounce the ball without scoring. A puck entering a goal awards the opposite player one point and flashes that net.
- BGM/SE start only after a button press. Confirm volume and loop seam on physical iPhone/Android; mute silences both, tracking loss/pause/backgrounding stops the BGM, and resume continues it. Exit stops all audio.
- Android performance and thermal behavior remain usable across five rounds.
- Screen stays awake during a round where the browser supports Screen Wake Lock, then releases on pause/result/exit.
- Landscape view keeps the playfield and pause/exit controls reachable without sideways page scrolling.

## Observation sheet
| Round | Understand within 30s | Make mirrored Cs naturally | First hit | Tilt discovered | Tension noticed | Best rally | Visible positive reaction | Voluntary retry | Tracking problems |
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
