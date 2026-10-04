# BODY WINGS — shared Three.js Visual Layer v0.1

Implemented locally on 2026-10-05, based on main `fd3550b`.

## Result

BODY WINGS is the second consumer of `src/visual3d`, after HAND SPELL. A softly
lit sky with 3D clouds, gold torus rings approaching the player, two BOOST exhaust
trails and success bursts run through the existing View loop. The segmented
camera player and generated wings remain in the foreground, with DOM HUD above.

`BodyWingsGame` and `src/input/*` are unchanged by this integration. `ringsAhead`
drives the visible course; PERFECT, GOOD, BOOST and FINISH come from actual game
events. The visual scene never grades a ring, changes game time or owns tracking.

## Reuse and coordinates

- `src/wings/threeScene.js` consumes the common renderer, projection, quality
  governor, disposal, ParticleTrail and ImpactBurst. No WebGLRenderer, independent
  RAF, new recognition pipeline or duplicated governor is created in the scene.
- `src/wings/visualLayout.js` supplies the same approach/arrival coordinates to
  2D and 3D. At progress 1, the ring reaches its game X and shoulder Y = 0.69.
- Input/game coordinates are already in mirrored player space. The layer uses
  `mirror: false`; no further `1 - x` is applied. Depth is synthetic.
- Shared API changes are limited to a forced redraw while paused and avoiding
  a second context-loss request when WebGL has already failed. HAND SPELL's
  existing render call remains compatible.

## Lifecycle, fallback and motion

- Imports begin on PLAY/practice, not Feed, a 2D game, or the BODY WINGS entrance.
- Each activation creates at most one renderer. Generation checks discard late
  import completions after departure, including rapid re-entry.
- Exit, retry, error and platform result release dispose effects, scene geometry,
  materials, renderer, ResizeObserver, media listeners and the WebGL canvas.
  The controller remains eligible for the platform cache.
- Initialization/render/context failure restores the complete opaque Canvas2D
  renderer. The next activation may try WebGL again.
- Pause freezes scene effects and WebGL draws. Resize or motion preference changes
  can redraw a paused frame without resuming gameplay or degrading quality.
- Reduced motion freezes decorative cloud travel, clears long trails and reduces
  burst count/intensity. Rings still communicate the actual game timeline.
- The common governor lowers DPR and particle/trail budgets. Low quality also
  halves the visible cloud groups. No shadow maps, postprocessing or video texture.

## CREATOR

Replay intentionally remains the complete Canvas2D flight, including its sky,
rings, segmented player and ORIGINAL/EFFECT/HIDE treatment. When live play uses
Three, an offscreen 2D renderer supplies frames only at recorder cadence (125ms),
not at every display frame. The existing six-second highlight plus outro remains.
Three world composition into replay is a future step, shared with HAND SPELL.

## Verification

- Final local `npm test`: 482 passed, 0 failed in the current shared worktree.
  `npm run build` passed (existing large inline-audio chunk warnings remain).
- `test/bodyWingsThree.test.js`: projection/arrival alignment at portrait, square
  and landscape aspect ratios; identical full-flight game state with/without
  scene updates; real event handling; pause/reduced-motion budgets; idempotent
  disposal of shared geometries/materials and quality subscriptions.
- `scripts/qa/body-wings-three.js`: 48 browser checks. Feed and a 2D practice game
  do not request Three; Demo, tutorial, full 30-second flight and BOOST; pause,
  background/resume, live reduced motion, framebuffer pixels, context-loss
  fallback, result/RETRY, and 10 cached-controller enter/exit cycles.
- Viewports: 360×800, 720×1280, 1440×900 and 800×360. Screenshots were inspected
  for scene framing, HUD visibility and overflow. Pause feedback no longer
  overlaps the flight cue.
- `scripts/qa/body-wings-three-lifecycle.js`: 12 checks for delayed imports,
  rapid re-entry, injected slow-frame samples, released context/geometry/RAF,
  rejected WebGL initialization and recovery, partial initialization disposal,
  and HAND SPELL compatibility.
- The dev-only camera harness now explicitly waits for the 3D scene and passes
  24 checks, including actual synthetic segmentation, steering, loss/recovery,
  ORIGINAL/EFFECT/HIDE visible pixels, CREATOR replay and denied-camera recovery.
  Transparent foreground pixels are evaluated after sky compositing, avoiding
  false face-color hits in nearly transparent sprite edges.
- `scripts/qa/body-wings-three-production.js`: seven checks against the built
  site, including lazy chunks on Feed/2D/entrance, practice WebGL, and cleanup.

Run with Vite on `127.0.0.1:5186`, then:

```powershell
npm test
npm run build
npx --yes @playwright/cli -s=body-wings-three open http://127.0.0.1:5186/
npx --yes @playwright/cli -s=body-wings-three run-code --filename=scripts/qa/body-wings-three.js
npx --yes @playwright/cli -s=body-wings-three run-code --filename=scripts/qa/body-wings-three-lifecycle.js
```

Screenshots are under ignored `output/playwright/body-wings-three-*.png`.
Injected WebGL failures deliberately emit diagnostics; no uncaught browser
exceptions occurred. Slow-frame injection verifies policy behavior, not measured
hardware performance. Real mobile GPU/tracking contention and human flight feel
still require the existing [physical playtest](BODY_WINGS_PLAYTEST.md).
