# EXP-046 BODY WINGS — human playtest

Implementation date: 2026-10-04. Physical camera and human acceptance are pending.
Synthetic rounds do not establish human enjoyment or physical-camera reliability.

Open `#/game/solo-body-wings` (aliases `#body-wings`, `#wings`). Use a front camera
with the upper body and both wrists visible for the initial spread. After the wings
attach, shoulders alone steer and the arms can relax. Start the first flight
without a spoken explanation. The tutorial is outside the 30-second timed round.

Do five people or five rounds; include a portrait phone and a landscape webcam.

| Person / round | Device / light | Spread naturally / time | Wings noticed | Left/right understood / time | Over-leaning | Tracking losses | Ring readable / miss understood | Arms comfortable | Duration | Retry / replay / share interest | Visible reaction / viewer appeal | Wants vertical control |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pending | | | | | | | | | | | |
| 2 | Pending | | | | | | | | | | | |
| 3 | Pending | | | | | | | | | | | |
| 4 | Pending | | | | | | | | | | | |
| 5 | Pending | | | | | | | | | | | |

Acceptance gates from the specification:

- A: first-time player spreads arms without reading a paragraph.
- B: understands shoulder steering within 10 seconds.
- C: tracking loss causes little stress across the 30-second flight.
- D: ring passages feel satisfying.
- E: the player's transformation and reactions are interesting to a viewer.
- F: viewers want to try it themselves.

Also verify ten deliberate starts, thirty seconds without deliberately spreading,
and leaving/re-entering frame. Check the 0–300ms hold, 300–800ms recovery and
800ms return cue. Reject wrong mirror direction on either device orientation.
Try wrist occlusion after takeoff, reduced motion, denied permission and background
resume. CREATOR / HIDE should cover the real face both live and in BEST FLIGHT.

Recent numeric-only receipts are in localStorage key
`camera-game-lab-body-wings-rounds` (last 50). They contain source, rings,
bestCombo, perfects, boosts, score, fictional distance/maxSpeed, trackingLosses,
maxLossMs and tutorialDone. They contain no image, landmark history or identity.
