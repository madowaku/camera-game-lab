# EXP-054 AIR SLASH — Prototype v0.1

Product source: user's 2026-10-04 brief. A mirrored live-camera player sweeps
empty hands through flying fruit. SLASH FRUIT. DON'T SLASH BOMBS.

- 15-second score attack. No hand-shape gesture requirement.
- Two palm centers from landmarks 0/5/9/13/17, inference timestamps and
  crop-correct mirrored positions. Face location only drives ninja/soot effects.
- Speed = center distance / observed dt, in a fixed 540 × 960 playfield:
  below 180 px/s ignored, 180–649 trail, 650+ slash, 1500+ power.
- Retain 130ms of observations for the light trail. Judge only new observed
  segments against swept fruit hitboxes, not persistent visual trails.
- Reacquisition warms for 180ms. Reject >240px sample jumps, >5500px/s,
  stale (>160ms), invalid and off-screen observations. Both hands are independent.
- Fruit breaks along the observed slash angle; halves move apart along the
  cut normal. White blade light lasts 200ms. Juice and layered slash/chop sounds.
  Physics freezes 45ms (normal) / 60ms (power or bomb); round clock remains 15s.
- Base round: 29 fruit / four bombs. First fruit at 250ms; ramp from two seconds;
  first bomb at 6.5s; paired fruit from nine seconds; final storm at 13s.
- Fruit +100, combo +20 × current combo, power +50, giant X-SLASH +300.
  Bomb −300 with combo reset, camera shake, smoke and tracked-face soot;
  the round continues. Missed fruit resets combo. Missed bombs are harmless.
- Five combo: JUICY. Ten combo: six extra fruit and one bomb, once per round.
- Two active hand segments crossing within 120ms trigger X-SLASH: spawn and
  cut a central giant watermelon, with 1800ms cooldown. No shape requirement.
- CREATOR marks first slash, X-SLASH, 10 COMBO, explosion and FRUIT STORM.
  Select the highest-priority real event with lead-in and reaction; replay six
  seconds plus one-second result card. Optional silent export after the round.
  ORIGINAL shows camera; EFFECT attaches ninja effect; HIDE omits camera images.
- Tracking absence for 450ms pauses; 350ms stable recovery resumes, then
  re-arms blades. User/background pause clears input histories and pending paths.
- Camera-free practice: held drag / two pointers, WASD left, arrows right,
  X both, Space pause. Same speed, cooldown and collision rules; results labeled
  PRACTICE. JA/EN, RETRY/NEXT/SHARE, BGM/SE mute, explicit camera errors.

Real-device speed thresholds, gesture feel and human delight remain playtest
gates; synthetic browser and blank-frame model checks do not establish them.
