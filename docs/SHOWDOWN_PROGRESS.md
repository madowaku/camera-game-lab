# EXP-058 FINGER GUN: SHOWDOWN v0.1

Open `#/game/solo-finger-gun-showdown` or `#showdown`. The older EXP-002 FINGER GUN remains separately playable.

## Implemented

- Shared front-camera hand + face model lifecycle and existing calibrated, hysteretic mouth edge. One closed-to-open action fires one shot; 250ms weapon cooldown. No microphone.
- Slightly projected index direction, smoothing, mirrored object-fit:cover coordinates. Target assistance changes collision acceptance, not the visible reticle. Tracking loss retains the reticle for 300ms, dims it to 800ms, then asks for a hand. Missing fresh tracking suppresses firing immediately to avoid phantom shots.
- Six shots, 300ms wrist-down reload; it latches until the hand rises. Practice uses pointer/touch or Space; R reloads. Pause freezes time and input, backgrounding pauses, navigation releases both models, camera, Phaser and sound.
- 30 seconds: introductory target / NORMAL, RUSH at 15s, five-target HIGH NOON at 23s with a protected one-second DRAW, FINAL at 27s. Final entrance refills ammunition to make the last shot available.
- Red outlaw, yellow quick outlaw, blue SAFE civilian, two gold opportunities and a purple final bounty. Colored markers also have text labels. Reaction bonus, bounded combo multipliers, civilian penalty, misses, enemy escape/attack penalty, accuracy and western titles.
- Seven perimeter spawn slots, anti-repeat positioning, paired spawns, six entrance presets. Low accuracy after five shots enlarges targets by 10% and extends unscripted exposure by 15%.
- Phaser visual layer with toy targets, muzzle accent, tracer, hit ring and confetti; live reduced-motion preference disables moving entrances/confetti. DOM menus and HUD. Kenney CC0 shot/reload plus synthesized hit/tick/chord. Shared OpenTracks music silences during HIGH NOON.
- Imagegen western background saved in the project; compressed WebP used at runtime. Credits and exact prompt are in the adjacent manifests.
- CREATOR opt-in, ORIGINAL / EFFECT / HIDE, bounded 8fps low-resolution frame capture. AutoDirector sums lightning, gold, HIGH NOON and final-event weights within seven-second windows. Results replay and export seven seconds of silent MP4/WebM using the shared exporter. HIDE omits camera imagery; EFFECT covers the detected face with a toy badge, hides video on face loss. All frames stay local and are discarded on exit/retry.

## Verification

- 53 targeted rules/input/platform/music/motion tests passed, including crop-aware wrist reload.
- Browser QA: 12 checks passed, including actual pointer hit, keyboard reload, pause, HIGH NOON silence, final hit, replay, real seven-second MP4 download, retry renderer count and route cleanup. No browser runtime errors. Screenshots and export in `output/playwright/showdown-*`.
- Commit verification: all 614 tests passed in an exported snapshot of the exact staged files. The unrelated CAMERA IS IT assertion observed in the earlier working-tree run has been resolved in the current committed base; SHOWDOWN does not change that game.
- Production Vite/PWA build passes. Existing large shared engine/music chunk warning remains.

## Decisions and remaining physical checks

Calibration occurs before the timer starts. The first three seconds are playable instruction time. The final target is forgiving and grants a fresh magazine. Three.js adds no value to this 2D MVP, so the existing shared Phaser renderer is used.

The existing commercially usable chiptune accompanies this build. A purpose-matched 130–150 BPM western track and percussion layering would improve the theme. Entrance presets are compact toy-marker animations; elaborate opening doors/windows and flying defeated character sprites remain visual polish. HIGH NOON changes saturation and audio but does not slow the clock outside its fixed one-second draw. No speculative claim of physical usability is made.

Pending: five rounds with real people on a front-camera phone; mouth effort and false positives, wrist reload coordinate threshold under portrait crop, finger reach across all seven slots, camera FPS with both models, comfort and effect-mask coverage. Synthetic landmark tests verify signal logic, not real-world accuracy. Desktop export is verified; mobile browser encoder support still needs a device check.
