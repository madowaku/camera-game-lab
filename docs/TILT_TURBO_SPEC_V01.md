# EXP-053 TILT TURBO v0.1

Product source: the user's supplied TILT TURBO specification. The opening
EXP-053 is the canonical display number; the EXP-050 references at its end are
treated as carried-over labels. Game identity is `solo-tilt-turbo`.

**Fantasy:** your head is the wheel of a miniature toy race car. A 20-second
auto-accelerating race; no throttle, brake, items, mouth input, opponent AI,
car selector or extra courses. The only player action is gentle head roll.

Input uses the average inner/outer landmarks of each eye. Pixel aspect ratio
and the mirrored front-camera presentation determine roll direction. Stable
neutral for 650ms saves the phone-adjusted baseline. ±5° is dead zone; steering
ramps smoothly and saturates at ±25°. A roughly 70ms signal filter and 110ms
position response damp jitter. During the next 1.35s the car already follows
the player; a compact 900ms 3–2–1 starts the timed round. Camera-free practice
offers two seconds of live preview followed by the same countdown.

The car moves laterally toward the tilt target. Face-forward targets the center
of the playfield; the curving road requires following its bends. The road and
collision model share one deterministic course. Order: straight, gentle left,
gentle right, alternating curves, sharper bends; final LEFT / RIGHT / LEFT
at 15 / 16.1 / 17.1 seconds, jump at 18.5, finish at 20. Wall and cone bonks
rebound softly, briefly slow distance accrual, and never end the round. Gentle
camera following keeps the car visible. The jump slows visual road motion,
lifts and enlarges the car; finish spins it once and adds confetti.

Score = floor(distance ×4) + floor(clean milliseconds /20) + near misses ×100
+ floor(drift milliseconds /15). Results report SCORE, HIT, NEAR, MAX TILT,
distance, clean/drift bonus, and face-loss episodes for camera rounds. The
clock is fixed at 20.00 active seconds; a variable finish-time score such as
18.42 seconds would contradict this fixed round, so it is not shown.

Loss or >250ms stale inference eases the car to center over about 450ms,
shows FACE HERE, keeps clock and game running, and counts continuous loss
episodes once. Reacquisition retains neutral and restores steering. Manual
pause and tab background freeze the round. A disconnected camera can reconnect
while the race continues; startup denial offers camera-free practice.

PLAY does not record. CREATOR composes the player above the course on a 9:16
canvas. ORIGINAL / EFFECT sunglasses / HIDE avatar are supported. Event
candidates include max tilt, bonk, near miss, final bends, jump and finish.
MVP replay retains the final six seconds plus a one-second results card.
Supported browsers can save a seven-second silent video. Recording is local,
bounded, discarded on exit, and never uploaded. Music remains game BGM only.

Camera-free input: A/left arrow, D/right arrow; hold either screen half or the
two visible touch buttons. Practice is labeled in game/results/shares. Shared
RETRY, NEXT, SHARE, JA/EN and BGM controls integrate with the lab platform.

Human acceptance is pending: see TILT_TURBO_PLAYTEST.md. It is not inferred
from synthetic landmarks, blank-frame model runs or automated browser checks.
