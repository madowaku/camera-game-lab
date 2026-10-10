# EXP-053 TILT TURBO v0.2.2: RIVAL SPRINT

## Intent

The user reported that the COMFORT UPDATE feels better on A401OP. Build on
that steering comfort: catch a colorful rival, choose a passing lane, get a
small burst of speed, and try again with a favorite car. The same 20-second
sprint keeps the session easy to replay.

## Playable changes

- Toy Town has 4 named rivals (5 cars total), Sunset Coast 5, Neon Express 6.
- Rivals persist for the entire sprint, each with its own forward pace and a
  gentle lane sway. Player speed and bonks now affect when a rival is caught;
  encounters are no longer awarded at predetermined clock crossings.
- The HUD shows live position, the next rival and approximate distance gap.
  Position is calculated from current forward distance and can go down when
  a rival passes the player back. At 20 seconds that order becomes the result.
- Each rival's first clean pass earns +150 and a 900 ms automatic speed boost
  (+12 target speed). A close pass also earns the existing +100 near bonus.
  Re-passes regain a place and play the pass cue, but cannot farm bonus points
  or boost. Bonks cancel turbo, slow the player and recover as before.
- The result shows finish position and an expandable local race order.
  CREATOR replay candidates include passes; its outro includes position.
- Turbo has sound, a colored label and speed streaks. Reduced motion removes
  the streaks while preserving the label and actual gameplay reward.

## Boundaries

This is a forgiving **timed overtaking sprint**. The road bends, cones and
final jump still follow the existing guided 20-second course clock. Forward
distance determines rival gaps and ranking; it is an arcade measure rather
than surveyed road metres. Rendering and contact share the rival distance
and lane state. There are no opponent models or inference sessions added.

AIR WHEEL calibration, chest-height framing, HEAD TILT, wider starter roads,
camera-free practice, pause and the local HIDE privacy behavior remain the
foundation. No new gesture is needed to accelerate. A player-controlled
accelerator can be considered after this passing loop is tried on the phone.

## Verification

Run `npm test`, `npm run build`, and `npm run test:tension-ui`.

New deterministic tests cover distance-based encounters, rank changes,
contact cooldown, turbo cancellation/expiration, opponent re-passes,
once-per-rival bonuses, pause/lost hands, all 9 garages, reset and final order.
`scripts/qa/tilt-turbo-rivals.js` runs against local Vite through Playwright
CLI; it drives the real view with generated steering and captures the turbo,
reduced-motion and winning result screens. It does not establish real hand
tracking or subjective comfort.

## A401OP next play

Start Toy Town / Roadster and play 3 rounds with hands at the same comfortable
height as before. Look for the next rival's colored car and steer around it.
Record whether the pass and automatic turbo feel clear, whether the rank is
easy to notice, and whether being passed back feels playful. Also note any
tracking losses and whether another round feels inviting.

Keep PR #17 Draft and use a new immutable HTTPS preview for this revision.
