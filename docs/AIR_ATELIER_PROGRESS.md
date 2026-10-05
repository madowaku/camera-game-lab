# AIR ATELIER — EXP-057

Historical implementation notes. Superseded by [SONIC INK v0.1](SONIC_INK_V01.md)
on 2026-10-06; the old links now open SONIC INK.

Implemented 2026-10-05. Local route: `#/game/solo-air-atelier` (alias `#air-atelier`).

## Pastel atelier visual pass

Updated to a milk-white stationery frame, rose controls, soft pastel dotted canvas,
original SVG ribbon and heart artwork, heart-selected ink swatches, star-shaped
targets and wand cursor. Fixed sparkles follow drawn strokes through rotation and
PNG export; they do not flash or introduce an animation loop. Camera frames remain
untinted for hand visibility. JA/EN entry and empty-state copy follow the new theme.
Production build and all 18 browser checks passed again at 1440/390/360px, including
real drawing, rotation, PNG download, star completion and failure recovery.

## Concept and controls

A front-camera light pen: open one hand briefly to calibrate, pinch thumb and index to draw, release to lift the pen. Move the hand closer/farther to change relative depth. Four ink colors, undo, two-tap clear, pause, free drawing, and an untimed six-star constellation challenge. Challenge strokes must start at the last connected star; isolated taps cannot complete it. Switching modes clears the drawing.

The drawing stores actual XYZ coordinates. Canvas perspective projection, depth-sorted segments, and a manually controlled 360-degree viewing angle show the sculpture. Rendering needs no WebGL context. PNG export is 1080×1300, with artwork only and no camera frame. Gallery mode stops the camera; editing restarts and recalibrates it. Drawing data is discarded on route exit.

Practice uses mouse/touch dragging and a depth slider. Japanese/English copy, catalog artwork, entry instructions, shared motion feedback and existing credited cozy BGM are integrated.

## Input boundaries

Monocular depth is an approximation from apparent wrist-to-middle-knuckle distance, not metric depth or room/world tracking. Eighteen open-hand frames set the baseline. Pinch hysteresis and a fresh open-to-pinch edge prevent drawing immediately on reacquisition. Loss, stale samples, pause and large position jumps break the stroke. Drawings are limited to 12,000 points / 400 strokes. No recording or uploads; MediaPipe model/WASM download on first camera use.

## Verification

- `node --test test/airAtelier.test.js`: projection round trips, depth/order-aware star connections, undo, discontinuities, bounded memory, calibration, and reacquisition.
- Relevant platform/music tests passed after registering the game with both platform adapters.
- `npm run build`: production build and PWA generation passed.
- `scripts/qa/air-atelier.js`, run through Playwright CLI: 18 browser checks passed. Viewports 1440, 390 and 360 pixels; drawing changes pixels, colors and depth, gallery rotation, actual PNG download, undo, guarded clear, six-star completion, pause, English copy and model-load failure → practice recovery. No uncaught browser errors. Deliberately aborted WASM requests produce expected network errors during the failure scenario.
- Screenshots and exported PNG: `output/playwright/air-atelier-*`.

## Remaining physical checks

Real front-camera hand recognition and depth comfort on iOS/Android/PC have not been physically playtested. Check close/far calibration, portrait cover crop, hand rotation versus apparent depth, recovery after hand loss, and sustained drawing on a mobile device. The camera uses the existing front-camera-only lifecycle with CPU fallback. This change has not been deployed.
