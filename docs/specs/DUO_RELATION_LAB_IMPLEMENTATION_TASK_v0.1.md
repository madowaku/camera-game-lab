# DUO RELATION LAB — IMPLEMENTATION TASK v0.1

Status: Spec ready / implementation blocked by TASK-009 physical camera gate
Depends on:
- DUO_INPUT_FOUNDATION_SPEC_v0.1.md
- TINY BOT DUEL Human Playtest gate

## Goal

Add the smallest reusable pair-relationship layer, then build six tiny probes that test six different forms of two-person interaction.

Do not expand art, progression, menus, or content packs.

These are experiments.

---

## GATE-000 — Do not bypass physical validation

Before camera implementation work begins:

- complete five consecutive TINY BOT DUEL camera rounds;
- confirm no serious P1/P2 identity failure;
- confirm intentional movement and mouth action;
- record baseline inference FPS and recovery behavior.

If the gate is HOLD, fix DUO INPUT first.

---

## TASK-001 — Pair-state derivation

Create a derived relation module above normalized P1/P2 state.

Expose at minimum:

- midpointX/Y
- deltaX/Y
- normalized distance
- angle
- height difference
- approach / separation velocity

No raw MediaPipe structures.

---

## TASK-002 — Pair-state emulator

Extend keyboard/touch fallback so relation games can be tested without camera.

Need independent simulated positions for P1 and P2.

---

## TASK-003 — Relation debug overlay

Development-only overlay:

- P1 / P2 centers
- connecting line
- pair distance
- angle
- midpoint
- relation velocity

Production default: hidden.

---

## TASK-004 — EXP-024 HUMAN JOYSTICK

Build first because it directly validates the new pair-state contract.

MVP:

- one ship
- moving gates
- pair angle => direction
- pair distance => magnitude
- 30-second score run

Playtest focus:

- can players intentionally stop?
- can they make small corrections?
- does coordination emerge naturally?

---

## TASK-005 — EXP-025 HUMAN BRIDGE

Reuse pair endpoints.

MVP:

- bridge line
- one auto-walking traveler
- 3–5 hazards
- one goal

Do not add complex physics.

The bridge should visually match the pair relationship immediately.

---

## TASK-006 — EXP-026 LIGHT & SHADOW

Use per-player states rather than pair geometry.

MVP:

- P1 light source
- P2 runner
- one room
- shadow-only safe movement
- role swap on retry

Playtest focus: communication and cross-player causality.

---

## TASK-007 — EXP-027 PARALLEL WORLD

MVP:

- shared traveler
- P1 controls X
- P2 controls Y
- red hazards visible only to P1
- blue hazards visible only to P2
- one exit

Do not add combat.

---

## TASK-008 — EXP-028 FACE CHICKEN

MVP:

- pair distance meter
- clear comfort / challenge / forbidden bands
- best-of-5 exchanges
- retreat detection
- zero reward for entering forbidden close range

Safety behavior is part of acceptance, not optional polish.

---

## TASK-009 — EXP-029 HOT POTATO CROWN

Reuse stable per-player input.

MVP:

- two tiny characters
- one crown
- crowned player can score
- hit transfers crown
- uncrowned player moves faster
- 30-second round

This prototype intentionally tests role state, not a new tracker feature.

---

## TASK-010 — Shared relation telemetry

Record local-only:

- min / max pair distance
- average pair distance
- angle range
- pair lost / recovery count
- relation input reversals
- role transfers where relevant
- round completion
- rematch

Do not record video or images.

---

## TASK-011 — Shared result questions

For internal human playtest notes, capture:

- verbal coordination emerged: yes / no
- players looked at each other: yes / no
- exaggerated movement required: yes / no
- immediate rematch: yes / no
- camera-specific value: 1–5

---

## TASK-012 — Acceptance comparison

After all six prototypes, compare them on:

A. camera necessity
B. legibility
C. comfort
D. social interaction
E. replay impulse
F. spectator readability

Do not choose by polish. Choose by whether the mechanic itself survives first contact with humans.

---

# Recommended implementation order

```text
PAIR STATE
→ HUMAN JOYSTICK
→ HUMAN BRIDGE
→ LIGHT & SHADOW
→ FACE CHICKEN
→ HOT POTATO CROWN
→ PARALLEL WORLD
```

Reason:

1. first validate geometry;
2. then turn geometry into a world object;
3. then test cross-player causality;
4. then interpersonal bluffing;
5. then dynamic role transfer;
6. finally test information asymmetry, which requires more UI than the others.

---

# Exit condition

The lab succeeds if at least one prototype makes players say, in effect:

> “This would not be the same with buttons.”
