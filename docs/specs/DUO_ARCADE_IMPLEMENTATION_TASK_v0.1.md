# DUO ARCADE — IMPLEMENTATION TASK v0.1

Status: Ready for implementation  
Depends on: DUO_INPUT_FOUNDATION_SPEC_v0.1.md  
Covers: EXP-020–023

## Goal

Build the smallest reusable two-player camera foundation, then use it to ship four contrasting playable experiments.

Order matters:

```text
DUO INPUT
→ EXP-020 TINY BOT DUEL
→ EXP-021 FACE RACER
→ EXP-022 ZOMBIE DUO
→ EXP-023 SKY DUEL
```

Do not build all four games before the shared two-player tracking is proven.

## TASK-001 — Landscape experiment shell

Add a reusable landscape game shell with:

- camera background / player windows
- P1/P2 labels
- game canvas
- countdown
- pause/lost-player overlay
- result/retry

Minimum target sizes:

- 800×360
- 1280×720

## TASK-002 — Duo face detector

Extend the input layer to detect up to two faces.

Expose stable P1/P2 player objects.

Do not put MediaPipe structures in game modules.

## TASK-003 — Stable player tracking

Track faces across frames using prior center positions.

Requirements:

- no frame-by-frame swapping;
- brief occlusion grace;
- side crossing does not instantly exchange IDs;
- missing player state is explicit.

## TASK-004 — Duo calibration

Capture per-player:

- neutral face X/Y
- baseline face scale
- neutral tilt

Require both players stable before countdown.

## TASK-005 — Normalized events

Implement normalized events/state needed by the first four games:

- horizontal face offset
- vertical face offset
- head tilt
- mouth open / close edge
- player lost / returned

Keep thresholds in one config area.

## TASK-006 — Debug controls

Add keyboard/touch emulation for both players so game rules can be tested without camera input.

## TASK-007 — Debug overlay

Show optional:

- track IDs
- P1/P2 boxes
- normalized values
- mouth state
- FPS
- lost timer

Production default: hidden.

## TASK-008 — EXP-020 TINY BOT DUEL

Implement first because it validates:

- independent movement;
- independent discrete actions;
- shared arena;
- competitive timing.

Minimum loop:

```text
move → shoot → knockback → ring out → result → rematch
```

## TASK-009 — EXP-020 playtest gate

Do not proceed on camera input assumptions until:

- 5 consecutive 30-second rounds complete;
- no serious identity swap;
- each player can intentionally move and shoot;
- ring-out is readable.

## TASK-010 — EXP-021 FACE RACER

Reuse P1/P2 state.

Add:

- continuous steering;
- boost;
- 2-lap simple track;
- collision / off-road slowdown.

This experiment specifically tests continuous control latency.

## TASK-011 — EXP-022 ZOMBIE DUO

Add shared cooperative shooter.

Reuse mouth shot event and normalized face aim.

Add:

- reticles;
- 3 enemy types;
- shared survival objective;
- 30-second wave.

## TASK-012 — EXP-023 SKY DUEL

Implement asymmetric co-op:

- P1 pilot
- P2 gunner

Add role swap on retry.

This experiment tests whether one camera can support different simultaneous control vocabularies.

## TASK-013 — Shared audio/feedback

Reusable lightweight effects:

- countdown
- shot
- hit
- warning
- win
- lose

No new BGM production required.

## TASK-014 — Privacy / permission

Use existing project privacy copy.

If camera permission fails, show fallback controls rather than a dead end.

## TASK-015 — Localization

Add JA/EN names and one-line instructions for all four experiments.

### EXP-020
JA: 顔で動け。口で撃て。  
EN: Move with your face. Fire with your mouth.

### EXP-021
JA: 顔を傾けて走れ。  
EN: Tilt to steer.

### EXP-022
JA: 二人で30秒、生き残れ。  
EN: Survive together for 30 seconds.

### EXP-023
JA: 一人が飛ばし、一人が撃つ。  
EN: One flies. One fires.

## TASK-016 — Result telemetry

Local-only playtest metrics:

- player-loss count
- identity-swap suspicion count
- input events per player
- average inference FPS
- round completion
- rematch

Game-specific metrics may be added separately.

## TASK-017 — Mobile verification

Test:

- two adults
- adult + child
- players at different distances
- glasses
- uneven room lighting
- brief face occlusion
- one player leaving/re-entering

Do not require extreme body movement.

## TASK-018 — Acceptance gate

The DUO ARCADE foundation is successful if:

A. Two people can enter and begin a round with minimal setup.

B. P1/P2 remain stable for typical play.

C. Competitive, continuous-control, cooperative, and asymmetric prototypes all reuse one input contract.

D. At least one of the four feels meaningfully better with two real bodies than with two touch controls.

## Implementation principle

> Build the social controller first.
> The games are probes.

The technical product of this pass is not four isolated games.

It is a reusable **one-phone / two-player camera control layer**.
