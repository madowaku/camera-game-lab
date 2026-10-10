# GUARDIAN SPIRIT — companion art and compact player v0.2

Implemented locally on 2026-10-10. Open `#/game/guardian-spirit` or `#guardian`.

Four original ImageGen companions are selectable during play and photo mode:
WARDEN (cool sapphire knight), LUNA (beautiful moon spirit), MOSS (cute forest
guardian), KITSU (mischievous fox). Each transparent 1024px WebP atlas contains
body, upper arm, forearm and fist textures. The existing Canvas renderer rigs
those parts independently. The original vector rig remains an asset-load fallback.
See [exact prompts and shipped asset paths](guardian-spirit-assets.json).

## Comfortable camera distance

The player is segmented from the entire mirrored sensor frame and placed below
the guardian's face on the sanctuary background. Physical proximity no longer
makes the on-screen player grow beyond the compact composition. Camera and mask
use identical transforms; wide-camera arms are not cropped by a portrait cover.
The default player frame is bounded to 55% of stage height and shoulders to 24%
of stage width. A 35–75% display-size slider adjusts the composition, including
photos. This does not change input recognition, aim or hit areas.

Guidance says to stay where the screen is readable, with face and shoulders in
view, and helps with missing hands or a cropped head/shoulder. It estimates
framing, not physical meters. Scaling cannot restore limbs outside the sensor
frame. The phone angle, lens and actual person still determine arm visibility.

## Movement and impact

The guardian's fixed-length upper arms and forearms continuously follow actual
arm directions, with a 65ms visual smoothing constant. Tiny gestures are
amplified into large limbs. The torso follows the body with the existing 150ms
smoothing. Hits extend a textured fist to the actual target, followed by recoil,
shock rings, demon shards, matching combo rewards and a separate impact sound.
Shots have a short luminous travel effect. Each companion supplies its own
accent color and fist. The boss is offset from the guardian's face.

The 30-second round, three basic gestures, gauge, boss and ascension rules are
retained. Combat effects do not override the four photo poses after a shielded
victory. Selected spirit names appear on the stage, accessible canvas label,
photo caption and round receipt. Reduced-motion removes shake, bobbing, flying
shards and projectile travel; direct control and static/fading hit cues remain.

## Verification

`node --test test/guardianSpirit.test.js` covers 20 cases, including bounded
near-camera composition in portrait/landscape, display-size independence, crop
guidance, fixed-length arm following and true per-kill combo rewards, alongside
the existing combat/loss/recovery/boss tests.

`scripts/qa/guardian-polish.js` is a Playwright CLI check of actual launch,
countdown, all four textures/selections, punches, assisted shots, shield,
pause/loss/recovery, mobile layout/slider, synthetic near-camera segmentation,
ascension, all four photo poses, local PNG export, JA/EN and reduced-motion
landscape. Evidence lives in `output/playwright/guardian-polish-*`.

Verified in Chromium at 1440×900, 390×844 and 844×390: the complete browser
script passes, all four assets load, and no browser runtime errors or horizontal
overflow occur. The exported photo contains the compact person and selected
companion. `npm test` passes all 659 tests; `npm run build` succeeds. The browser
receipt is `output/playwright/guardian-polish-browser-results.txt`.

Physical webcam/phone recognition, segmentation edges, sustained device frame
rate and the human pleasure of moving the guardian still require real play.
Use the [human playtest sheet](GUARDIAN_SPIRIT_PLAYTEST.md), now also comparing
comfortable screen distance, face visibility and favorite companion.

## Release validation

The isolated release combines these Guardian changes with origin/main
`29bd0c8`, retaining already merged Camera UI, Camera Is It and Camera Gesture
Layer changes. All 676 tests pass and the production build succeeds.
Unrelated uncommitted files from the development checkout are excluded.