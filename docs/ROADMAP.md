# Camera Game Lab Roadmap

## Principle

Do not begin with "what can the camera recognize?"

Begin with:

> What physical verb becomes a better game verb when the player performs it for real?

## EXP-001 — HAND BEAT

Goal: verify four hand states can feel responsive enough for a ~15 second rhythm challenge.

Inputs:

- OPEN
- FIST
- PEACE
- PINCH

Success criteria:

- A new player understands the interaction without a tutorial video.
- Gesture recognition feels fair on a normal phone camera.
- A full run is short enough to replay immediately.
- Watching another person play is visually interesting.

## EXP-002 — FINGER GUN

Core test:

- detect pointing / finger-gun pose
- derive aim direction from hand landmarks
- trigger shot with a second motion or pose change

Question: does physical aiming feel better than dragging a reticle?

## EXP-003 — EAT / DON'T EAT

Core test:

- face / mouth-open state
- binary decision under time pressure
- open your mouth for food and keep it closed for non-food items
- 12 randomized decisions in a 15-second run

Input note: calibrate a relaxed, closed-mouth baseline before starting. Missing face tracking must not count as a closed-mouth choice.

Question: is opening your mouth intrinsically funny and readable enough to sustain a short-form game?

## EXP-004 — BLINK HORROR

Core test:

- eyes open / closed
- information trade-off

Question: can losing vision itself become the central horror mechanic?

## EXP-005 — PINCH WORLD

Core test:

- pinch
- drag
- release

Question: can the hand behave like a physical object in the game world rather than a cursor?

## EXP-006 — CRANE TACTICS CAM

Core test:

- pinch a unit
- carry it
- release it onto a legal tile
- vary stability / weight by unit type

Question: does direct hand manipulation make the tactical crane fantasy instantly legible?

## Shared body-input layer

Future normalized events:

- HAND_OPEN
- HAND_FIST
- PINCH_START
- PINCH_MOVE
- PINCH_END
- POINT
- FLICK
- BLINK_LEFT
- BLINK_RIGHT
- EYES_CLOSED
- MOUTH_OPEN
- HEAD_TILT
- POSE
- GESTURE_SEQUENCE

Each experiment should depend on normalized events rather than MediaPipe-specific output wherever practical.


## DUO ARCADE — one phone / two players

Shared core test:

- detect two faces in one front camera
- keep stable P1 / P2 assignment
- calibrate both players independently
- expose normalized per-player body input
- use landscape as a tiny local arcade cabinet

Question: can one phone become an instant two-player physical controller without external hardware?

### EXP-020 — TINY BOT DUEL

Core test:

- face movement => robot movement
- mouth-open edge => cannon
- knockback / ring-out

Question: can camera-driven versus play feel immediate and fair?

### EXP-021 — FACE RACER

Core test:

- continuous face/head steering
- mouth boost
- shared track

Question: is continuous body steering controllable enough for racing?

### EXP-022 — ZOMBIE DUO

Core test:

- independent camera aiming
- mouth shooting
- shared survival objective

Question: does camera co-op create natural callouts and rescue moments?

### EXP-023 — SKY DUEL

Core test:

- P1 pilot
- P2 gunner
- two simultaneous control vocabularies for one vehicle

Question: can asymmetric body controls make one shared vehicle fun to operate together?

## Shared duo-input layer

Normalized per-player state should include:

- PRESENT
- FACE_X / FACE_Y
- FACE_SCALE
- HEAD_TILT
- MOUTH_OPEN
- EYES_CLOSED
- PLAYER_LOST / PLAYER_RETURNED

Important: stable identity tracking is part of the game-feel foundation. Do not assign P1/P2 only by sorting X every frame.

## DUO implementation status

Implementation order: shared DUO INPUT → TINY BOT DUEL → camera playtest gate
→ FACE RACER → ZOMBIE DUO → SKY DUEL.

The landscape shell, stable P1/P2 tracker, per-player calibration, normalized
face/mouth state, keyboard/touch fallback, local metrics and EXP-020 duel are
implemented. EXP-021–023 wait for the five-round physical camera gate; synthetic
tracking tests and fallback rounds do not satisfy it. Current evidence and
remaining physical checks are in [DUO_ARCADE_PROGRESS.md](DUO_ARCADE_PROGRESS.md).


## DUO RELATION LAB — two bodies as one sensor

Design status: ready. Camera implementation waits for the EXP-020 physical five-round gate.

The next branch of DUO ARCADE stops treating P1 and P2 only as separate controllers.

Shared relation signals may include:

- pair midpoint
- relative angle
- normalized distance
- height difference
- approach / separation velocity
- dynamic role state
- information asymmetry

### EXP-024 — HUMAN JOYSTICK

Two face positions become one analog vector.

Question: can two people intentionally steer one object through their relative geometry?

### EXP-025 — HUMAN BRIDGE

The line between both players' face positions is the bridge itself.

Question: does literal between-player geometry feel like a genuinely camera-native game object?

### EXP-026 — LIGHT & SHADOW

P1 moves the light source; P2 moves a runner who can only travel safely through shadow.

Question: can one player's body movement rewrite the other player's navigable world in real time?

### EXP-027 — PARALLEL WORLD

P1 sees red hazards, P2 sees blue hazards, and both control different axes of one traveler.

Question: can partial information plus camera control make communication more important than dexterity?

### EXP-028 — FACE CHICKEN

Pair distance becomes a bluffing / commitment meter, with an explicit no-contact safety band.

Question: can interpersonal distance create tension without rewarding physical contact?

### EXP-029 — HOT POTATO CROWN

One capability transfers back and forth between players during the round.

Question: does moving role ownership create stronger social play than fixed symmetric roles?

Specs:

- [DUO_RELATION_LAB_SPEC_v0.1.md](specs/DUO_RELATION_LAB_SPEC_v0.1.md)
- [DUO_RELATION_LAB_IMPLEMENTATION_TASK_v0.1.md](specs/DUO_RELATION_LAB_IMPLEMENTATION_TASK_v0.1.md)
