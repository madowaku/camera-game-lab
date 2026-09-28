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
