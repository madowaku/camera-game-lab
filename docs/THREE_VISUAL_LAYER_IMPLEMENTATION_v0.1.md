# Three.js Visual Layer v0.1 Implementation

Status: SHARED REUSE VERIFIED ON DESKTOP

Date: 2026-10-05

Pilots: EXP-056 HAND SPELL / EXP-046 BODY WINGS

## Implemented

- three 0.186.1 pinned in package.json and package-lock.json.
- src/visual3d added as an optional, lazy-loaded visual subsystem.
- Canonical normalized coordinate helpers and synthetic depth planes.
- low / standard / high quality policy with runtime DPR degradation.
- scene/resource disposal utility.
- transparent WebGL layer with resize, context-loss fallback and reduced-motion awareness.
- four common effects: ParticleTrail, ImpactBurst, MagicCircle, ScreenShake.
- HAND SPELL hybrid renderer pilot.
- HAND SPELL keeps its existing Canvas2D renderer as the fallback and source of truth.
- WebGL resources are created only after HAND SPELL launches and disposed on deactivate.
- Node tests added for projection, quality degradation and resource disposal.

## HAND SPELL pilot behavior

The existing Canvas2D presentation remains intact. The WebGL layer adds fingertip light, a particle trail, an additive magic circle, synthetic-depth projectile, impact burst and a short cast shake.

All spell judging remains in handSpell/core.js. Hand recognition remains in src/input. Three.js never decides success, failure, timing or input.

## Fallback

If dynamic import or WebGLRenderer creation fails, HAND SPELL logs one warning and continues with its existing Canvas2D renderer. Camera/gameplay are not blocked.

## Known v0.1 limitation

CREATOR replay currently captures the existing Canvas2D output only. The Three.js overlay is additive during live play but is not composited into the seven-second replay yet. The old Canvas2D spell effects remain, so replay is still meaningful.

## Second consumer: BODY WINGS

BODY WINGS now reuses the same renderer, projection, quality governor, disposal,
ParticleTrail and ImpactBurst. Its game-specific sky, cloud meshes and approaching
rings live in `src/wings/threeScene.js`. The shared layer owns no flight rules.

The second consumer required only two shared API/lifecycle adjustments:

- `render(now, { force: true })` allows a paused scene to redraw after resize or
  reduced-motion changes without sampling the pause as a slow frame.
- Disposal checks whether the WebGL context is already lost before requesting
  context loss, avoiding a duplicate-loss warning during fallback.

BODY WINGS renders a Three world behind its existing segmented player/wing
Canvas2D foreground and DOM HUD. This game's segmentation needs the existing
camera composite rather than a raw DOM video background. Replay still records
the complete Canvas2D version, at recorder cadence.

Desktop browser checks cover both consumers, lazy loading, 10 enter/exit cycles,
late import completion, init failure, context loss, quality degradation, pause,
resize, live reduced motion and synthetic camera/CREATOR paths. See
[BODY WINGS reuse and verification](BODY_WINGS_THREE_V01.md).

The code-reuse gate is met. Physical mobile camera/GPU performance and human
playtests remain pending; desktop synthetic checks do not establish those gates.
