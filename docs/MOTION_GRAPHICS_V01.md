# Motion graphics v0.1

Implemented 2026-10-04 across the 28 registered playable routes. The direction
is a pocket arcade ident: outline → offset → overshoot → settle, with stronger
geometry at actual moments of success.

## References

- [Yoshida Takayuki: fields for motion graphics](https://note.com/takayukiyoshida/n/n688fc7f6ab3e): motion communicates a world, an interaction and a game highlight.
- [MOTION Ideas 100](https://gameanimation.info/archives/2497): combine outline, rotation, scale, tile, transparency, position and deformation.

These informed original CSS geometry and choreography. No article assets,
After Effects projects or animations were copied into the product.

## Coverage

Every route has a one-shot entrance motif and staggered result reveal. The
play surface uses the following actual decisions for live effects:

| Game | Motion | Trigger |
| --- | --- | --- |
| HAND BEAT | Rhythm | Correct hand judgments |
| FINGER GUN | Impact | Target hits |
| EAT / DON'T EAT | Pop | Correct decisions |
| BLINK HORROR | Echo | Safe blinks, GO after hiding |
| PINCH WORLD | Orbit | Completed placements |
| GHOST TRAIL | Echo | Confirmed near misses |
| NOTE EATER | Rhythm | Notes eaten, groove levels |
| NOTE BLASTER | Rhythm | Hits, combo milestones |
| TINY BOT DUEL | Impact | Either player's confirmed hits |
| GUARDIAN SPIRIT | Impact | Enemies defeated, combos |
| WATERMELON GUIDE | Slash | Successful strikes |
| FALSE BRIDGE | Orbit | Accepted parts, including completed worlds |
| FRAME SMUGGLER | Echo | Cleared inspections |
| DAITAI HERO | Pop | Correct logged answers, combos |
| THE CAMERA IS IT | Orbit | Completed stages |
| SOFT SERVE | Swirl | Bites, complete swirls, serving |
| HANDY PALS | Pop | High fives and hugs |
| BODY WINGS | Speed | Rings crossed, combo milestones |
| PALM PONG | Orbit | Returns, rally milestones |
| TOY DRUM | Rhythm | Judged drum hits, combos, FEVER |
| POSE WALL | Pop | Successful walls, excluding CRASH |
| WIPE! SOLO / DUO | Swirl | Completely cleared dirt patches |
| HUMAN CLOCK | Orbit | Correct times, combos, TIME RUSH |
| COUNTER CAM | Impact | Punches, counters, dodge, special ready |
| TILT TURBO | Speed | Near misses, drift and jump cues |
| AIR SLASH | Slash | Sliced fruit, combos, X-SLASH |
| DON'T LAUGH | Pop | Attack arrivals, with punctuation rather than a success label |

## Behavior and ownership

`motionProfiles.js` reads game decisions without modifying rules or input.
`MotionDirector` shares existing render/subscription callbacks. No additional
animation-frame loop, sensor, model or audio context is introduced. Entry
decoration never enables the camera. Cached controllers retain one director.

Live geometry is limited to three concurrent bursts. Ordinary hits have a
180ms cooldown; special and combo arrivals have a 90ms cooldown. Decorative
layers are hidden from accessibility APIs, use `pointer-events:none`, and are
clipped to the play surface. Native game cues and measurements remain the
authoritative accessible feedback. Reduced motion works at launch and when
changed during play. Paused/background observations become the baseline, so
resume does not replay old hits. Retry resets the baseline and special IDs.
Result and route cleanup remove the live layer.

The new effects are a DOM presentation layer. CREATOR recordings and souvenir
images continue to capture the existing canvas effects; these added DOM
overlays are not burned into exported videos or photos.

## Verification

- `npm test`: 458 tests passing, including trigger
  accuracy, negative judgments, reset behavior, combo priority and route coverage.
- `npm run build`: production build succeeds.
- `scripts/qa/motion.js`: 313 checks; all 28 entrances at
  390×844 and 1440×900, all 25 camera-free practice rounds, native drum/knife
  input, result/retry, language, cleanup and live reduced-motion checks. Browser
  exceptions and failed resources: zero. Native cues with matching text are
  animated in place, so X-SLASH has a single caption.
- `scripts/qa/motion-production.js`: 37 checks against the production build;
  mobile/desktop entrances, native drum combo and X-SLASH, fully revealed
  results, retry, exit and live reduced motion. Exceptions and failed resources:
  zero. Result CSS reveals are checked with real browser frames, separately
  from the accelerated JavaScript round clock.
- Screenshots: `output/playwright/motion-*.png`.

Synthetic browser checks do not certify physical camera feel, phone inference
performance or prolonged human comfort. Those existing device playtest gates
remain separate.
