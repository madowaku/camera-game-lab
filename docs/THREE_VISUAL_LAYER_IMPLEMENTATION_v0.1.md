# Three.js Visual Layer v0.1 Implementation

Status: PILOT IMPLEMENTED  
Date: 2026-10-04  
Pilot: EXP-056 HAND SPELL

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

## Next gate

Use the same src/visual3d layer in BODY WINGS without copying infrastructure. If that succeeds, Visual Layer v0.1 graduates from pilot to shared production layer.
