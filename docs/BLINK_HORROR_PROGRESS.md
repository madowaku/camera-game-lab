# EXP-004 BLINK HORROR — v0.2 implementation

2026-10-04 (JST). Canonical route `#/game/solo-blink-horror`; alias `#blink-horror`.
Specification: [EXP-004 v0.2](specs/EXP-004_BLINK_HORROR_SPEC_v0.2.md).

The old continuous danger/retreat and seeded rush loop is replaced with
RUN → HIDE → BLINK → DON'T LOOK → GO → RUN → EXIT. OPEN runs forward;
a bilateral blink (80–449ms) or LONG CLOSE (450ms+) in RUN approaches one of
SAFE/FAR/NEAR/CLOSE/CAUGHT. Each closure is charged once. Stage 001 uses +1
for LONG CLOSE as specified in section 27; `longPenalty` can be 2 for future
hard mode. Winks do not count as blinks, and opening one eye ends bilateral defense.

Stage 001 begins at 100m and moves at 4m/s. One locker arrives after 55m,
with a visible HIDE AHEAD guide from 32m. The 3s safe window allows multiple
blinks and records recovery success through `safeBlinks`. The pass lasts
4.2s, offers 1.2s reaction grace, and requires at least 1.2s continuous closure
and remaining closed until GO. Opening early or ignoring the instruction costs
one stage; failures do not instantly kill a safe player. GO lasts 700ms. The
final 45m has no locker. A clean round takes 32.9 active seconds; calibration,
countdown and the ending make the complete experience roughly 37 seconds.
A 45s active bound prevents indefinite closed-eye stalls (CAUGHT, timeout reason).

Imagegen corridor, mirror flashes and an alpha-preserved monster replace the
selfie silhouette. The monster stays absent outside brief approach reflections,
CLOSE shoulder shadows, a 320ms catch reveal, or the harmless final blink
reflection after a one-second clear silence. Floor lines, gentle camera sway
and perspective zoom convey movement; EXIT opens and closes. Reduced-motion
preferences disable movement animation. Feed, entrance/how-to, JA/EN and result
copy now teach the actual rules. BLINKS, CLOSE CALLS, TIME and BEST are measured;
only ESCAPED updates best, separately for camera and practice.

Camera preflight confirms OPEN and CLOSED before READY. Both-eye hysteresis,
three stable frames, raw short-blink events, LONG events and pending-event
buffering prevent missed/double penalties. Face position, local brightness,
OPEN/CLOSED and optional input details are visible. Missing/unknown/stale input
freezes distance, monster and every stage timer. Partial pass holds are discarded;
400ms stable tracking resumes fairly. Pause, page hiding, camera refusal,
Space and held pointer input are supported. Result/exit closes tracks, model,
AudioContexts, rAF and delayed door sound. The optional epilogue retains camera
only for a bounded 2.6s ending, then releases it before showing result.

OpenTracks **不穏ROOM / MAKOOTO** is reused with commercial game BGM conditions
rechecked. It plays quietly in RUN and goes silent in the locker. Kenney CC0
concrete steps and doors come from AssetsShared; pass steps pan left → center →
right. Filtered noise breathing gets nearer with the monster stage. BGM and SE
have separate controls. Exact sources, hashes and licenses are in the
[asset manifest](blink-horror-assets.json); the exact built-in Imagegen prompts
are in [the prompt file](blink-horror-image-prompts.txt).

## Verification

- Rules and eye adapter: 25 focused checks including real transition timing,
  no duplicate closure charges, one-eye reopen, safe recovery, pass failure,
  full escape, pause/loss fairness and frame-size equivalence.
- `npm test`: 451 passing; `npm run build`: success. No test skipped.
- `scripts/qa/expansion-blink.js`: 73 passing browser checks at 360×800,
  720×1280 and 1440×900. Actual Space/button input, safe blinks, rule reversal,
  EXIT, final blink reflection, CAUGHT, share/retry/next, locales and overflow.
- `scripts/qa/expansion-blink-camera.js`: 19 passing synthetic camera checks
  using raw blendshapes, real MediaStreamTrack and AudioContext lifecycles;
  open/closed calibration, wink rejection, LONG CLOSE, loss recovery,
  result teardown, retry, late permission cancellation and denied-camera practice.
- `scripts/qa/blink-horror-production.js`: 6 passing checks against compiled
  Vite preview at 390×844; credit, Imagegen asset, full escape, no camera
  request, no overflow and no page errors.
- `scripts/qa/blink-horror-audio.js`: 5 passing checks with real AudioContext
  decode, quiet FAR steps, pass pans from -1 through +0.714, mute and teardown.
- Screenshot evidence: `output/playwright/blink-v2-*.png`. Corridor and
  locker screenshots visually reviewed; alpha range of monster WebP verified.

## Remaining physical/human checks

Android Chrome and iOS Safari eye recognition, glasses/lighting variation,
audio clarity with actual headphones, the GO cue with eyes shut and five human
rounds have not been tested. These are research acceptance checks, not software
failures. Use [the playtest sheet](BLINK_HORROR_PLAYTEST.md). No human gate is
marked passed. This change is local; deployment was not requested.
